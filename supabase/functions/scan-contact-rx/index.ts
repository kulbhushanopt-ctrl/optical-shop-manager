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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PROMPT = `You are reading a photo of a contact lens prescription or fitting slip (soft, RGP/rigid gas permeable, or scleral contact lenses). It typically has two rows for the right eye (labeled OD, RE, or R) and left eye (OS, LE, or L), each with POWER (or SPH/sphere, sometimes labeled BC for base curve alongside it), CYL (cylinder, for toric lenses), AXIS, BC (base curve, in mm), DIA (diameter, in mm), and sometimes an ADD (near addition power, for multifocal lenses) value. There is often a brand/material name printed (e.g. "Biofinity", "Acuvue Oasys", "Boston XO"). Read the values carefully and respond with ONLY strict JSON, no markdown fences, no explanation, in exactly this shape: {"odPower": string|null, "odCyl": string|null, "odAxis": string|null, "odBaseCurve": string|null, "odDiameter": string|null, "odAdd": string|null, "osPower": string|null, "osCyl": string|null, "osAxis": string|null, "osBaseCurve": string|null, "osDiameter": string|null, "osAdd": string|null, "brand": string|null}. Power and cylinder values should include their sign (+ or -) and two decimal places (e.g. "-2.00", "+1.25"). Axis should be a plain number from 0-180. Base curve and diameter should be plain decimal numbers in mm (e.g. "8.6", "14.2"), no units. Only report values you can actually read clearly in the image -- use null for anything illegible, missing, or you're not confident about. Never guess or invent a value.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let image: string | undefined;
  try {
    const body = await req.json();
    image = body?.image;
  } catch {
    return json({ error: "bad_request", message: "Expected JSON body with an `image` field." }, 400);
  }
  if (!image) return json({ error: "bad_request", message: "Missing `image`." }, 400);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return json({
      error: "not_configured",
      message: "AI prescription scanning isn't set up yet. Add a GEMINI_API_KEY secret to this Supabase project to enable it.",
    });
  }

  const base64 = image.includes(",") ? image.split(",")[1] : image;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`,
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
      }
    );

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
    return json({ error: "upstream_error", message: String(e) }, 502);
  }
});
