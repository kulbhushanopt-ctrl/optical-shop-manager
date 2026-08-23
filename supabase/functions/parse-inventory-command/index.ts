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

const PROMPT = `You convert a shopkeeper's one-sentence spoken instruction for adding an eyewear inventory item into strict JSON. The speech is Indian English, transcribed by voice recognition and may contain minor errors. Numbers may be spoken as words (e.g. "two thousand", "ten", "a dozen"); prices are in Indian Rupees; words like "pieces", "number", "qty", "in number" indicate the stock quantity. Extract:
- type: one of "frame", "sunglasses", "lens", "contact", "accessory" -- infer from context; default to "frame" if it's clearly eyewear stock but the exact type is unclear; use null only if you truly cannot tell it's inventory at all
- brand: brand name if mentioned, else null
- model: model name or number if mentioned, else null
- sku: any color, code, or short descriptor mentioned that isn't the brand or model (e.g. "black", "matte finish"), else null
- price: the price as a plain number in rupees, converting any spoken number words to digits, else null
- stock: the quantity to add as a plain number, converting any spoken number words to digits ("a dozen" = 12), else null

Respond with ONLY strict JSON, no markdown fences, no explanation, in exactly this shape: {"type": string|null, "brand": string|null, "model": string|null, "sku": string|null, "price": number|null, "stock": number|null}`;

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
      parsed = { type: null, brand: null, model: null, sku: null, price: null, stock: null };
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
