// Turns a shopkeeper's one-sentence spoken instruction (e.g. "add ten black
// Ray-Ban frames, price two thousand each") into structured inventory-item
// fields, using a text-capable AI model. Requires a GEMINI_API_KEY secret --
// until one is set, this responds with { error: "not_configured" } so the
// frontend can show a clear message instead of failing.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pinned to a specific, versioned model instead of the "-latest" alias --
// Google can silently repoint an alias to a different (and sometimes
// currently-overloaded) model, which is what turned every scan/parse
// function's calls into multi-minute hangs. A pinned version can't move
// out from under us the same way. GEMINI_TIMEOUT_MS caps how long a single
// call is allowed to hang before we give up and let the user retry.
const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_TIMEOUT_MS = 25000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PROMPT = `You convert a shopkeeper's one-sentence spoken instruction for adding eyewear inventory into strict JSON. The speech is Indian English, transcribed by voice recognition and may contain minor errors (e.g. "gents" may be misheard as "giants"). Numbers may be spoken as words (e.g. "two thousand", "twenty", "a dozen"); prices are in Indian Rupees. Extract:
- type: one of "frame", "sunglasses", "lens", "contact", "accessory" -- infer from context; default to "frame" if it's clearly eyewear stock but the exact type is unclear; use null only if you truly cannot tell it's inventory at all
- category: for frames, the closest match among these category codes based on gender + material + tier mentioned ("gents metal" -> "GM", "ladies sheet exclusive" -> "LSX", "kids boys" -> "KB", etc): "LM" (Ladies Metal), "LMX" (Ladies Metal Exclusive), "LS" (Ladies Sheet), "LSX" (Ladies Sheet Exclusive), "LF" (Ladies Frameless), "GM" (Gents Metal), "GMX" (Gents Metal Exclusive), "GS" (Gents Sheet), "GSX" (Gents Sheet Exclusive), "GF" (Gents Frameless), "KB" (Kids Boys), "KBX" (Kids Boys Exclusive), "KG" (Kids Girls), "KGX" (Kids Girls Exclusive). Use null if no such gender/material combination is mentioned, or the item isn't a frame.
- brand: brand name if mentioned, else null
- model: model name or number if mentioned, else null
- sku: any color, code, or short descriptor mentioned that isn't the brand, model, or category (e.g. "black", "matte finish"), else null
- price: the price as a plain number in rupees (per unit), converting any spoken number words to digits, else null
- quantity: how many SEPARATE, individually distinct items to create -- use this (not stock) when NO specific brand/model was named, e.g. "add twenty frames of gents metal" means twenty different gents metal frames that each need their own listing. Else null.
- stock: the stock count for ONE item -- use this (not quantity) when a specific brand/model WAS named, e.g. "add ten Ray-Ban Aviators" means ten units of that one model. Else null.

A spoken number is either a quantity of separate items or a stock count of one item, never both -- set only whichever applies, and leave the other null.

Respond with ONLY strict JSON, no markdown fences, no explanation, in exactly this shape: {"type": string|null, "category": string|null, "brand": string|null, "model": string|null, "sku": string|null, "price": number|null, "quantity": number|null, "stock": number|null}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let text: string | undefined;
  try {
    const body = await req.json();
    text = body?.text;
  } catch {
    return json({ error: "bad_request", message: "Expected JSON body with a `text` field." }, 400);
  }
  if (!text || !text.trim()) return json({ error: "bad_request", message: "Missing `text`." }, 400);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return json({
      error: "not_configured",
      message: "AI voice entry isn't set up yet. Add a GEMINI_API_KEY secret to this Supabase project to enable it.",
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${PROMPT}\n\nInstruction: "${text}"` }] }],
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
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { type: null, category: null, brand: null, model: null, sku: null, price: null, quantity: null, stock: null };
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
