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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

// See notify-shop-request for why this exists: verify_jwt is disabled here
// (called by a Postgres trigger, no user session available), so without
// this check anyone who found the URL could make this function email an
// arbitrary address through our Resend account -- more so here than
// notify-shop-request, since this one sends to whatever `email` the caller
// provides, not a fixed address. The shared secret lives in Supabase Vault
// (encrypted at rest, never written to any file in this git-tracked repo)
// -- this reads it via a service-role-only RPC using the service-role key
// Supabase auto-injects into every edge function's environment.
async function fetchTriggerSecret(): Promise<string | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;
  const res = await fetch(`${url}/rest/v1/rpc/get_notify_trigger_secret`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    body: "{}",
  });
  if (!res.ok) return null;
  return await res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expectedSecret = await fetchTriggerSecret();
  if (!expectedSecret || req.headers.get("x-trigger-secret") !== expectedSecret) {
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
