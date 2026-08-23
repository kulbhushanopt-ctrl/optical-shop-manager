// Reads a photo of a contact lens prescription/fitting slip (soft, RGP, or
// scleral) and extracts the OD/OS power, cylinder, axis, base curve,
// diameter, add-power, and brand values, using a vision-capable AI model.
// Requires a GEMINI_API_KEY secret -- until one is set, this responds with
// { error: "not_configured" } so the frontend can show a clear message
// instead of failing.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pinned to a specific, versioned model instead of the "-latest" alias --
// Google can silently repoint an alias to a different (and sometimes
// currently-overloaded) model, which is what turned every scan function's
// calls into multi-minute hangs. A pinned version can't move out from
// under us the same way. GEMINI_TIMEOUT_MS caps how long a single call is
// allowed to hang before we give up and let the user retry, instead of the
// request sitting for up to 150s.
const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_TIMEOUT_MS = 25000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Every AI feature shares one Gemini key by default, but a branch owner can
// set their own (Shop settings) so one shop's heavy scanning never eats into
// another shop's daily quota. This only ever borrows a branch's own key when
// the caller (identified by the incoming Authorization header) is actually a
// member of that branch -- otherwise it silently falls back to the shared
// default, exactly as if no branchId had been passed at all.
async function resolveGeminiKey(branchId: string | null | undefined, authHeader: string | null): Promise<string | null> {
  const defaultKey = Deno.env.get("GEMINI_API_KEY") ?? null;
  if (!branchId || !authHeader) return defaultKey;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return defaultKey;

  try {
    const memberRes = await fetch(`${supabaseUrl}/rest/v1/rpc/is_branch_member`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: authHeader },
      body: JSON.stringify({ b: branchId }),
    });
    if (!memberRes.ok || (await memberRes.json()) !== true) return defaultKey;

    const keyRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_branch_gemini_key`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ p_branch_id: branchId }),
    });
    if (!keyRes.ok) return defaultKey;
    const branchKey = await keyRes.json();
    return branchKey || defaultKey;
  } catch {
    return defaultKey;
  }
}

const PROMPT = `You are reading a photo of a contact lens prescription or fitting slip (soft, RGP/rigid gas permeable, or scleral contact lenses). It typically has two rows for the right eye (labeled OD, RE, or R) and left eye (OS, LE, or L), each with POWER (or SPH/sphere, sometimes labeled BC for base curve alongside it), CYL (cylinder, for toric lenses), AXIS, BC (base curve, in mm), DIA (diameter, in mm), and sometimes an ADD (near addition power, for multifocal lenses) value. There is often a brand/material name printed (e.g. "Biofinity", "Acuvue Oasys", "Boston XO"). Read the values carefully and respond with ONLY strict JSON, no markdown fences, no explanation, in exactly this shape: {"odPower": string|null, "odCyl": string|null, "odAxis": string|null, "odBaseCurve": string|null, "odDiameter": string|null, "odAdd": string|null, "osPower": string|null, "osCyl": string|null, "osAxis": string|null, "osBaseCurve": string|null, "osDiameter": string|null, "osAdd": string|null, "brand": string|null}. Power and cylinder values should include their sign (+ or -) and two decimal places (e.g. "-2.00", "+1.25"). Axis should be a plain number from 0-180. Base curve and diameter should be plain decimal numbers in mm (e.g. "8.6", "14.2"), no units. Only report values you can actually read clearly in the image -- use null for anything illegible, missing, or you're not confident about. Never guess or invent a value.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let image: string | undefined;
  let branchId: string | undefined;
  try {
    const body = await req.json();
    image = body?.image;
    branchId = body?.branchId;
  } catch {
    return json({ error: "bad_request", message: "Expected JSON body with an `image` field." }, 400);
  }
  if (!image) return json({ error: "bad_request", message: "Missing `image`." }, 400);

  const apiKey = await resolveGeminiKey(branchId, req.headers.get("Authorization"));
  if (!apiKey) {
    return json({
      error: "not_configured",
      message: "AI prescription scanning isn't set up yet. Add a GEMINI_API_KEY secret to this Supabase project to enable it.",
    });
  }

  const base64 = image.includes(",") ? image.split(",")[1] : image;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: PROMPT }, { inline_data: { mime_type: "image/jpeg", data: base64 } }],
            },
          ],
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      return json({ error: "upstream_error", message: errText }, 502);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        odPower: null, odCyl: null, odAxis: null, odBaseCurve: null, odDiameter: null, odAdd: null,
        osPower: null, osCyl: null, osAxis: null, osBaseCurve: null, osDiameter: null, osAdd: null,
        brand: null,
      };
    }

    return json(parsed);
  } catch (e) {
    clearTimeout(timeoutId);
    const timedOut = e instanceof Error && e.name === "AbortError";
    return json(
      { error: "upstream_error", message: timedOut ? "The AI took too long to respond — please try again." : String(e) },
      502
    );
  }
});
