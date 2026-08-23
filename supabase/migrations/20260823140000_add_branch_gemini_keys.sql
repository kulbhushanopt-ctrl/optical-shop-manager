-- Lets each branch use its own Gemini API key instead of one key shared
-- across every shop on this deployment -- so one business's heavy AI usage
-- (scans, voice/text commands) can't eat into another business's daily
-- quota. The key itself is never exposed to the browser: it's stored in
-- Vault, and only a service-role-only RPC can ever read it back out. Owners
-- set it via a separate RPC that never returns the key, only accepts it.

create table public.branch_gemini_keys (
  branch_id uuid primary key references public.branches(id),
  vault_secret_id uuid not null,
  updated_at timestamptz not null default now()
);

alter table public.branch_gemini_keys enable row level security;
-- No policies granted at all -- every access goes through the two
-- SECURITY DEFINER functions below, which apply their own authorization.

-- Owner-only: stores/replaces this branch's own Gemini API key. Never
-- returns the key -- write-only from the caller's perspective.
create or replace function public.set_branch_gemini_key(p_branch_id uuid, p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_secret_id uuid;
begin
  if not is_branch_owner(p_branch_id) then
    raise exception 'not authorized';
  end if;

  select vault_secret_id into existing_secret_id
  from branch_gemini_keys where branch_id = p_branch_id;

  if existing_secret_id is not null then
    perform vault.update_secret(existing_secret_id, p_key);
    update branch_gemini_keys set updated_at = now() where branch_id = p_branch_id;
  else
    existing_secret_id := vault.create_secret(p_key, 'gemini_key_' || p_branch_id::text, 'Per-branch Gemini API key');
    insert into branch_gemini_keys (branch_id, vault_secret_id) values (p_branch_id, existing_secret_id);
  end if;
end;
$$;

revoke all on function public.set_branch_gemini_key(uuid, text) from public, anon;
grant execute on function public.set_branch_gemini_key(uuid, text) to authenticated;

-- Owner-only: clears a branch's own key, reverting it to the shared
-- default key.
create or replace function public.clear_branch_gemini_key(p_branch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_secret_id uuid;
begin
  if not is_branch_owner(p_branch_id) then
    raise exception 'not authorized';
  end if;

  select vault_secret_id into existing_secret_id
  from branch_gemini_keys where branch_id = p_branch_id;

  if existing_secret_id is not null then
    delete from vault.secrets where id = existing_secret_id;
    delete from branch_gemini_keys where branch_id = p_branch_id;
  end if;
end;
$$;

revoke all on function public.clear_branch_gemini_key(uuid) from public, anon;
grant execute on function public.clear_branch_gemini_key(uuid) to authenticated;

-- Any branch member (not just the owner) can check whether a custom key is
-- configured, without ever seeing the key itself.
create or replace function public.has_branch_gemini_key(p_branch_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_branch_member(p_branch_id) then
    raise exception 'not authorized';
  end if;
  return exists (select 1 from branch_gemini_keys where branch_id = p_branch_id);
end;
$$;

revoke all on function public.has_branch_gemini_key(uuid) from public, anon;
grant execute on function public.has_branch_gemini_key(uuid) to authenticated;

-- Service-role only: the actual key, decrypted -- called exclusively from
-- Edge Functions (which already verify the caller is a branch member
-- themselves before reaching this point), never from the browser.
create or replace function public.get_branch_gemini_key(p_branch_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select vs.decrypted_secret
  from branch_gemini_keys bgk
  join vault.decrypted_secrets vs on vs.id = bgk.vault_secret_id
  where bgk.branch_id = p_branch_id;
$$;

revoke all on function public.get_branch_gemini_key(uuid) from public, anon, authenticated;
grant execute on function public.get_branch_gemini_key(uuid) to service_role;
