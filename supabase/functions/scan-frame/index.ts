// Reads a photo of an eyeglass frame's temple (inside arm) and extracts the
// brand, model number, color code, and size (e.g. "52-18-140") printed on
// it, using a vision-capable AI model. Requires a GEMINI_API_KEY secret --
// until one is set, this responds with { error: "not_configured" } so the
// frontend can show a clear message instead of failing.

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

const PROMPT = `You are reading a close-up photo of the inside of an eyeglass frame temple (arm). These usually have small printed or stamped text showing a brand name/logo, a model number, a color code, and a size formatted like "52-18-140" (lens width-bridge width-temple length, in mm). Look carefully and respond with ONLY strict JSON, no markdown fences, no explanation, in exactly this shape: {"brand": string|null, "model": string|null, "colorCode": string|null, "size": string|null}. Use null for anything not clearly legible. Only report text you can actually read in the image -- never guess or invent a brand from styling alone.`;

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
      message: "AI frame scanning isn't set up yet. Add a GEMINI_API_KEY secret to this Supabase project to enable it.",
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
      parsed = { brand: null, model: null, colorCode: null, size: null };
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
