-- The `vault` schema isn't exposed over the REST API (by design, regardless
-- of role), so the notify-* edge functions can't query
-- vault.decrypted_secrets directly even with the service-role key. This RPC
-- is the narrow, service-role-only door to that one secret: EXECUTE is
-- revoked from public/anon/authenticated so no signed-in user can call it,
-- only requests carrying the service-role JWT (which is auto-injected into
-- every edge function's environment -- never sent to any client).
create or replace function public.get_notify_trigger_secret()
returns text
language sql
security definer
set search_path to 'public'
as $function$
  select decrypted_secret from vault.decrypted_secrets where name = 'notify_trigger_secret';
$function$;

revoke all on function public.get_notify_trigger_secret() from public, anon, authenticated;
grant execute on function public.get_notify_trigger_secret() to service_role;
