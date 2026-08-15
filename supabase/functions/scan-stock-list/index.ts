// Reads a photo of a handwritten or printed stock/packing list -- a
// numbered list of frame brands with a model/style code, and usually a
// quantity and price -- and extracts every row as structured data, so a
// whole shipment can be added to inventory from one photo instead of typing
// each line by hand. Requires a GEMINI_API_KEY secret -- until one is set,
// this responds with { error: "not_configured" } so the frontend can show a
// clear message instead of failing.

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

const PROMPT = `You are reading a photo of a handwritten or printed stock/packing list for eyewear frames, used by an optical shop to log new stock. It's usually a numbered list, one frame per line, with a brand/label name (e.g. "Visage", "Tom Ford", "Vogue", "Walnut PRO"), a model or style code (e.g. "200538", "FT5663-B", "TS1019" -- letters, numbers, and dashes), and sometimes a quantity and/or a price written per row (quantity might be circled or follow a dash; price might have a currency symbol like Rs or ₹, or just be a plain number in its own column). Read every numbered row you can find, top to bottom. Respond with ONLY strict JSON, no markdown fences, no explanation, in exactly this shape: {"rows": [{"brand": string, "model": string, "quantity": number|null, "price": number|null}]}. "brand" is the label/brand name text. "model" is the style/reference code exactly as written (keep letters, digits, and dashes, e.g. "FT5663-B"). "quantity" is a plain integer if a quantity is written for that row, otherwise null (do not assume 1). "price" is a plain number (no currency symbol) if a price is written for that row, otherwise null. Skip the header row (e.g. "Model", "Quantity") if present. Never guess or invent a brand or model that isn't actually legible -- skip a row entirely if you can't make out its brand or model.`;

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
      message: "AI stock-list scanning isn't set up yet. Add a GEMINI_API_KEY secret to this Supabase project to enable it.",
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
      parsed = { rows: [] };
    }

    return json(parsed);
  } catch (e) {
    return json({ error: "upstream_error", message: String(e) }, 502);
  }
});
