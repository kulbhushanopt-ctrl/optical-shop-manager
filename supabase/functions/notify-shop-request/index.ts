// Called by a Postgres trigger whenever a row is inserted into
// shop_requests. Emails the app owner so they know to open Supabase ->
// Table Editor -> shop_requests and approve or reject it there (no in-app
// admin screen -- the table editor is the approval UI). Requires a
// RESEND_API_KEY secret; until one is set, this responds with
// { error: "not_configured" } without failing the request insert itself
// (the trigger call is fire-and-forget).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OWNER_EMAIL = "kulbhushanopt@gmail.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let body: { email?: string; shop_name?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return json({ error: "not_configured", message: "Add a RESEND_API_KEY secret to send shop-request emails." });
  }

  const shopName = escapeHtml(body.shop_name || "Unnamed shop");
  const email = escapeHtml(body.email || "unknown");
  const phone = escapeHtml(body.phone || "-");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "Optical Shop Manager <onboarding@resend.dev>",
        to: [OWNER_EMAIL],
        subject: `New shop request: ${shopName}`,
        html: `<p>A new shop access request was submitted.</p>
<ul>
<li><b>Shop:</b> ${shopName}</li>
<li><b>Email:</b> ${email}</li>
<li><b>Phone:</b> ${phone}</li>
</ul>
<p>Open Supabase &rarr; Table Editor &rarr; <code>shop_requests</code> to approve or reject.</p>`,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return json({ error: "upstream_error", message: errText }, 502);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: "upstream_error", message: String(e) }, 502);
  }
});
