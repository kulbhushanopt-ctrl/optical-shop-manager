// Reads a photo of a patient intake/registration form -- which may carry the
// patient's name, age, phone, address, and an eyeglass prescription (Rx) all
// on one sheet -- and extracts both in a single pass, using a vision-capable
// AI model. Requires a GEMINI_API_KEY secret -- until one is set, this
// responds with { error: "not_configured" } so the frontend can show a clear
// message instead of failing.

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

const PROMPT = `You are reading a photo of a patient intake or registration form from an optical shop. It may contain the patient's name, age, phone number, and home address, and it may also contain an eyeglass prescription (Rx) -- typically two rows for the right eye (labeled OD, RE, or R) and left eye (OS, LE, or L), each with SPH (sphere), CYL (cylinder), and AXIS values, sometimes an ADD (near addition power) value. There is sometimes also a PD (pupillary distance) value in mm, and a VA (visual acuity after correction) value per eye, usually written as a fraction like "6/6" or "6/9" (or the imperial equivalent, e.g. "20/20"). Read everything carefully and respond with ONLY strict JSON, no markdown fences, no explanation, in exactly this shape: {"name": string|null, "age": number|null, "phone": string|null, "address": string|null, "odSphere": string|null, "odCyl": string|null, "odAxis": string|null, "odAdd": string|null, "odVA": string|null, "osSphere": string|null, "osCyl": string|null, "osAxis": string|null, "osAdd": string|null, "osVA": string|null, "pd": string|null}. Sphere and cylinder values should include their sign (+ or -) and two decimal places (e.g. "-2.00", "+1.25"). Axis should be a plain number from 0-180. Age should be a whole number of years -- if a date of birth is written instead of an age, calculate the age in years from today. Only report values you can actually read clearly in the image -- use null for anything illegible, missing, or you're not confident about. Never guess or invent a value.`;

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
      message: "AI form scanning isn't set up yet. Add a GEMINI_API_KEY secret to this Supabase project to enable it.",
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
        name: null, age: null, phone: null, address: null,
        odSphere: null, odCyl: null, odAxis: null, odAdd: null, odVA: null,
        osSphere: null, osCyl: null, osAxis: null, osAdd: null, osVA: null,
        pd: null,
      };
    }

    return json(parsed);
  } catch (e) {
    return json({ error: "upstream_error", message: String(e) }, 502);
  }
});
