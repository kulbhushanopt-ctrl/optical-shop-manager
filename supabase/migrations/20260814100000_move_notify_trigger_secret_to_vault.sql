-- The shared secret these two trigger functions send in the x-trigger-secret
-- header (so the notify-* edge functions can tell a real trigger call from
-- an anonymous request) used to be a literal string right here in this
-- SECURITY DEFINER function body -- which meant it was also sitting in
-- plaintext in a *public* GitHub repo (this file, git-tracked). Anyone who
-- found the repo could read it and use it to send arbitrary emails through
-- our Resend account.
--
-- Fixed by moving the value into Supabase Vault (encrypted at rest, not
-- readable from any git-tracked file) and looking it up here at call time.
-- The actual secret was rotated and stored via `select vault.create_secret(...)`
-- run directly (not saved to a migration file). The edge functions were
-- updated the same way, checking the caller's header against the same
-- vault-stored value via their own service-role client instead of a
-- hardcoded constant -- see supabase/functions/notify-shop-request and
-- supabase/functions/notify-staff-invite, and the get_notify_trigger_secret
-- RPC in the next migration.
create or replace function public.notify_shop_request()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_trigger_secret';

  perform net.http_post(
    url := 'https://kwxmafprurnxfiofotyf.supabase.co/functions/v1/notify-shop-request',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-trigger-secret', v_secret
    ),
    body := jsonb_build_object('email', new.email, 'shop_name', new.shop_name, 'phone', new.phone)
  );
  return new;
end;
$function$;

create or replace function public.notify_staff_invite()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_shop_name text;
  v_secret text;
begin
  select name into v_shop_name from public.branches where id = new.branch_id;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_trigger_secret';

  perform net.http_post(
    url := 'https://kwxmafprurnxfiofotyf.supabase.co/functions/v1/notify-staff-invite',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-trigger-secret', v_secret
    ),
    body := jsonb_build_object('email', new.email, 'shop_name', v_shop_name)
  );
  return new;
end;
$function$;
