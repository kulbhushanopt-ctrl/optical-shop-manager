// Reads a photo of an eyeglass frame's temple (inside arm) and extracts the
// brand, model number, color code, and size (e.g. "52-18-140") printed on
// it, using a vision-capable AI model. Requires a GEMINI_API_KEY secret --
// until one is set, this responds with { error: "not_configured" } so the
// frontend can show a clear message instead of failing.

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

const PROMPT = `You are reading a close-up photo of the inside of an eyeglass frame temple (arm). These usually have small printed or stamped text showing a brand name/logo, a model number, a color code, and a size formatted like "52-18-140" (lens width-bridge width-temple length, in mm). Look carefully and respond with ONLY strict JSON, no markdown fences, no explanation, in exactly this shape: {"brand": string|null, "model": string|null, "colorCode": string|null, "size": string|null}. Use null for anything not clearly legible. Only report text you can actually read in the image -- never guess or invent a brand from styling alone.`;

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
      message: "AI frame scanning isn't set up yet. Add a GEMINI_API_KEY secret to this Supabase project to enable it.",
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
      parsed = { brand: null, model: null, colorCode: null, size: null };
    }

    return json(parsed);
  } catch (e) {
    return json({ error: "upstream_error", message: String(e) }, 502);
  }
});
