// Called by a Postgres trigger whenever a row is inserted into
// branch_invites. Emails the invited person so they know to sign up (or
// sign in, if they already have an account) using this exact email address
// to get access to the shop. Requires a RESEND_API_KEY secret; until one is
// set, this responds with { error: "not_configured" } without failing the
// invite insert itself (the trigger call is fire-and-forget).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://optical-shop-manager.vercel.app/";

// See notify-shop-request for why this exists: verify_jwt is disabled here
// (called by a Postgres trigger, no user session available), so without
// this check anyone who found the URL could make this function email an
// arbitrary address through our Resend account. Never exposed to any
// client -- only our own database trigger and this function know it.
const TRIGGER_SECRET = "12d27c049a5604d27d6b9004a0fbaf68a752e45871d9a0b5b38e1c5856103cd9";

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
  if (req.headers.get("x-trigger-secret") !== TRIGGER_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: { email?: string; shop_name?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return json({ error: "not_configured", message: "Add a RESEND_API_KEY secret to send staff-invite emails." });
  }

  const email = body.email;
  if (!email) return json({ error: "bad_request", message: "Missing `email`." }, 400);

  const shopName = escapeHtml(body.shop_name || "an optical shop");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "Optical Shop Manager <onboarding@resend.dev>",
        to: [email],
        subject: `You've been invited to join ${shopName} on Optical Shop Manager`,
        html: `<p>You've been added as staff for <b>${shopName}</b> on Optical Shop Manager.</p>
<p>To get access, open the app and sign in (or create an account, if you don't have one yet) using <b>this exact email address</b>: ${escapeHtml(email)}.</p>
<p><a href="${APP_URL}">${APP_URL}</a></p>`,
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
