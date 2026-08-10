-- Baseline schema snapshot for project kwxmafprurnxfiofotyf, captured
-- 2026-08-10. Every table, RLS policy, function, and trigger in this file
-- already exists on the live project -- this is a documentation/version-
-- control snapshot, not something to apply fresh, since everything up to
-- this point was built directly against the live database via migration
-- calls with no local file ever committed. From here on, every schema
-- change should land as both a live migration AND a new file in this
-- folder, so the two stay in sync.
--
-- Re-running this file against an already-provisioned database is safe for
-- the `create or replace function` / `create extension if not exists`
-- statements, but the `create table` statements will fail if the tables
-- already exist (intentionally -- this isn't meant to be replayed against
-- this project, only used as a reference or to bootstrap a fresh one).

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pg_net with schema extensions;

-- ============================================================
-- Tables
-- ============================================================

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  gstin text,
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id),
  disabled boolean not null default false,
  google_review_link text,
  upi_id text,
  logo text
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  name text not null,
  phone text,
  address text,
  notes text,
  prescriptions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  photo text,
  dob date
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  type text not null,
  brand text,
  model text,
  sku text,
  price numeric not null default 0,
  stock integer not null default 0,
  low integer not null default 3,
  power text,
  add_power text,
  lens_index text,
  coatings jsonb not null default '[]'::jsonb,
  base_curve text,
  diameter text,
  duration text,
  contact_type text,
  created_at timestamptz not null default now(),
  hsn_code text
);

create table public.branch_members (
  user_id uuid not null references auth.users(id),
  branch_id uuid not null references public.branches(id),
  role text not null default 'staff' check (role = any (array['owner', 'staff'])),
  created_at timestamptz not null default now(),
  email text,
  primary key (user_id, branch_id)
);

create table public.branch_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  branch_id uuid not null references public.branches(id),
  role text not null default 'staff' check (role = any (array['owner', 'staff'])),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  patient_id uuid references public.patients(id),
  patient_name text,
  date date not null default current_date,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  gst_rate numeric not null default 0,
  cgst numeric not null default 0,
  sgst numeric not null default 0,
  total numeric not null default 0,
  status text not null default 'due' check (status = any (array['due', 'partial', 'paid'])),
  created_at timestamptz not null default now(),
  amount_paid numeric not null default 0,
  prescription jsonb,
  order_status text not null default 'delivered' check (order_status = any (array['processing', 'ready', 'delivered']))
);

create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id),
  branch_id uuid not null references public.branches(id),
  amount numeric not null check (amount > 0),
  method text not null default 'cash' check (method = any (array['cash', 'upi', 'card', 'other'])),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.shop_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  shop_name text not null,
  phone text,
  status text not null default 'pending' check (status = any (array['pending', 'approved', 'rejected'])),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id)
);

-- Unused leftover from the initial Supabase project template -- not
-- referenced anywhere in the application. Kept here only because it exists
-- on the live project; safe to drop if confirmed unused.
create table public.kv_store (
  key text primary key,
  value jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Access-check helper functions (used throughout RLS policies and RPCs
-- below, so they're defined before anything that references them)
-- ============================================================

create or replace function public.is_branch_member(b uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists(
    select 1 from public.branch_members bm
    join public.branches br on br.id = bm.branch_id
    where bm.branch_id = b and bm.user_id = auth.uid() and br.disabled = false
  );
$function$;

create or replace function public.is_branch_owner(b uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists(
    select 1 from public.branch_members bm
    join public.branches br on br.id = bm.branch_id
    where bm.branch_id = b and bm.user_id = auth.uid() and bm.role = 'owner' and br.disabled = false
  );
$function$;

revoke execute on function public.is_branch_member(uuid) from public, anon;
revoke execute on function public.is_branch_owner(uuid) from public, anon;
grant execute on function public.is_branch_member(uuid) to authenticated;
grant execute on function public.is_branch_owner(uuid) to authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.branches enable row level security;
alter table public.patients enable row level security;
alter table public.inventory enable row level security;
alter table public.branch_members enable row level security;
alter table public.branch_invites enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.shop_requests enable row level security;
alter table public.kv_store enable row level security;

-- branches
-- The app owner (this literal email, checked directly since there's no
-- in-app admin role/table) can read/write every branch and shop request --
-- this is the mechanism behind "no in-app admin UI, manage via the Supabase
-- table editor" used throughout the app.
create policy "admin manages all branches" on public.branches
  for all to authenticated
  using (auth.email() = 'kulbhushanopt@gmail.com')
  with check (auth.email() = 'kulbhushanopt@gmail.com');
create policy "member can read branch" on public.branches
  for select to authenticated
  using (is_branch_member(id) or created_by = auth.uid());
create policy "existing owners can create additional branches" on public.branches
  for insert to authenticated
  with check (
    exists (select 1 from branch_members where branch_members.user_id = auth.uid() and branch_members.role = 'owner')
    or exists (select 1 from shop_requests where shop_requests.email = auth.email() and shop_requests.status = 'approved')
  );
create policy "owner can update branch" on public.branches
  for update to authenticated
  using (is_branch_owner(id));
create policy "owner can delete branch" on public.branches
  for delete to authenticated
  using (is_branch_owner(id));

-- patients
create policy "members read patients" on public.patients
  for select to authenticated using (is_branch_member(branch_id));
create policy "members insert patients" on public.patients
  for insert to authenticated with check (is_branch_member(branch_id));
create policy "members update patients" on public.patients
  for update to authenticated using (is_branch_member(branch_id));
create policy "owner deletes patients" on public.patients
  for delete to authenticated using (is_branch_owner(branch_id));

-- inventory (writes are owner-only; staff sell via the decrement_inventory_stock/
-- create_sale RPCs instead of direct table writes)
create policy "members read inventory" on public.inventory
  for select to authenticated using (is_branch_member(branch_id));
create policy "owner inserts inventory" on public.inventory
  for insert to authenticated with check (is_branch_owner(branch_id));
create policy "owner updates inventory" on public.inventory
  for update to authenticated using (is_branch_owner(branch_id));
create policy "owner deletes inventory" on public.inventory
  for delete to authenticated using (is_branch_owner(branch_id));

-- branch_members (no INSERT/UPDATE policy at all -- membership rows are only
-- ever written by SECURITY DEFINER functions/triggers: handle_new_branch,
-- handle_new_user_invites, accept_branch_invite)
create policy "see own memberships or owner sees all" on public.branch_members
  for select to authenticated using (user_id = auth.uid() or is_branch_owner(branch_id));
create policy "owner can remove members" on public.branch_members
  for delete to authenticated using (is_branch_owner(branch_id) and role <> 'owner');

-- branch_invites (owner-only direct access; an invited user can't SELECT
-- their own invite row here -- that's what my_pending_invite()/
-- accept_branch_invite() are for)
create policy "owner manages invites - select" on public.branch_invites
  for select to authenticated using (is_branch_owner(branch_id));
create policy "owner manages invites - insert" on public.branch_invites
  for insert to authenticated with check (is_branch_owner(branch_id));
create policy "owner manages invites - delete" on public.branch_invites
  for delete to authenticated using (is_branch_owner(branch_id));

-- invoices (no direct INSERT policy is actually used by the app anymore --
-- billing goes through create_sale/delete_sale RPCs -- but the policy
-- remains as a fallback/lower layer)
create policy "members read invoices" on public.invoices
  for select to authenticated using (is_branch_member(branch_id));
create policy "members insert invoices" on public.invoices
  for insert to authenticated with check (is_branch_member(branch_id));
create policy "members update invoices" on public.invoices
  for update to authenticated using (is_branch_member(branch_id));
create policy "owner deletes invoices" on public.invoices
  for delete to authenticated using (is_branch_owner(branch_id));

-- invoice_payments
create policy "members read payments" on public.invoice_payments
  for select to authenticated using (is_branch_member(branch_id));
create policy "members insert payments" on public.invoice_payments
  for insert to authenticated with check (is_branch_member(branch_id));
create policy "owner deletes payments" on public.invoice_payments
  for delete to authenticated using (is_branch_owner(branch_id));

-- shop_requests
create policy "requester can view own request" on public.shop_requests
  for select to authenticated using (email = auth.email());
create policy "admin sees all shop requests" on public.shop_requests
  for select to authenticated using (auth.email() = 'kulbhushanopt@gmail.com');
create policy "requester can insert own request" on public.shop_requests
  for insert to authenticated with check (email = auth.email());
create policy "admin manages shop requests" on public.shop_requests
  for update to authenticated
  using (auth.email() = 'kulbhushanopt@gmail.com')
  with check (auth.email() = 'kulbhushanopt@gmail.com');

-- kv_store (unused leftover -- see table comment above)
create policy "Authenticated read" on public.kv_store for select to authenticated using (true);
create policy "Authenticated insert" on public.kv_store for insert to authenticated with check (true);
create policy "Authenticated update" on public.kv_store for update to authenticated using (true);

-- ============================================================
-- RPCs (all SECURITY DEFINER, EXECUTE revoked from public/anon and granted
-- only to authenticated -- see each function's own access checks inside)
-- ============================================================

-- Staff can sell inventory (via invoices) but can't edit it directly -- RLS
-- restricts inventory writes to branch owners. This narrow RPC only
-- decrements stock, so a sale doesn't require owner access. Superseded for
-- new sales by create_sale (below), which does this atomically as part of
-- the whole sale, but kept for any remaining direct callers.
create or replace function public.decrement_inventory_stock(p_item_id uuid, p_qty integer)
returns public.inventory
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  updated_row public.inventory;
begin
  if not public.is_branch_member((select branch_id from public.inventory where id = p_item_id)) then
    raise exception 'Access denied';
  end if;

  update public.inventory
  set stock = greatest(0, stock - p_qty)
  where id = p_item_id
  returning * into updated_row;

  if updated_row is null then
    raise exception 'Item not found';
  end if;

  return updated_row;
end;
$function$;

-- Creates the invoice, decrements stock for every line item, and logs the
-- opening payment (if any) all inside one Postgres transaction -- a sale
-- can never be recorded with stock left un-decremented, even if a step
-- partway through would otherwise fail.
create or replace function public.create_sale(
  p_branch_id uuid,
  p_invoice jsonb,
  p_payment_method text default 'cash'
)
returns public.invoices
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_invoice public.invoices;
  v_line jsonb;
  v_item_id uuid;
  v_qty integer;
  v_amount_paid numeric;
begin
  if not public.is_branch_member(p_branch_id) then
    raise exception 'Access denied';
  end if;

  insert into public.invoices (
    branch_id, patient_id, patient_name, date, items, subtotal, gst_rate,
    cgst, sgst, total, status, amount_paid, prescription, order_status
  ) values (
    p_branch_id,
    nullif(p_invoice->>'patient_id', '')::uuid,
    p_invoice->>'patient_name',
    (p_invoice->>'date')::date,
    coalesce(p_invoice->'items', '[]'::jsonb),
    (p_invoice->>'subtotal')::numeric,
    (p_invoice->>'gst_rate')::numeric,
    (p_invoice->>'cgst')::numeric,
    (p_invoice->>'sgst')::numeric,
    (p_invoice->>'total')::numeric,
    p_invoice->>'status',
    coalesce((p_invoice->>'amount_paid')::numeric, 0),
    p_invoice->'prescription',
    coalesce(p_invoice->>'order_status', 'delivered')
  )
  returning * into v_invoice;

  for v_line in select * from jsonb_array_elements(coalesce(p_invoice->'items', '[]'::jsonb))
  loop
    if coalesce(v_line->>'itemId', '') <> '' then
      v_item_id := (v_line->>'itemId')::uuid;
      v_qty := coalesce((v_line->>'qty')::integer, 0);
      if v_qty > 0 then
        update public.inventory
        set stock = greatest(0, stock - v_qty)
        where id = v_item_id and branch_id = p_branch_id;
      end if;
    end if;
  end loop;

  v_amount_paid := coalesce((p_invoice->>'amount_paid')::numeric, 0);
  if v_amount_paid > 0 then
    insert into public.invoice_payments (invoice_id, branch_id, amount, method)
    values (v_invoice.id, p_branch_id, v_amount_paid, coalesce(p_payment_method, 'cash'));
  end if;

  return v_invoice;
end;
$function$;

-- Deletes the invoice and restores stock for every line item atomically
-- (owner-only, enforced inside the function).
create or replace function public.delete_sale(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_invoice public.invoices;
  v_line jsonb;
  v_item_id uuid;
  v_qty integer;
begin
  select * into v_invoice from public.invoices where id = p_invoice_id;
  if v_invoice.id is null then
    raise exception 'Invoice not found';
  end if;
  if not public.is_branch_owner(v_invoice.branch_id) then
    raise exception 'Access denied';
  end if;

  for v_line in select * from jsonb_array_elements(coalesce(v_invoice.items, '[]'::jsonb))
  loop
    if coalesce(v_line->>'itemId', '') <> '' then
      v_item_id := (v_line->>'itemId')::uuid;
      v_qty := coalesce((v_line->>'qty')::integer, 0);
      if v_qty > 0 then
        update public.inventory
        set stock = stock + v_qty
        where id = v_item_id and branch_id = v_invoice.branch_id;
      end if;
    end if;
  end loop;

  delete from public.invoices where id = p_invoice_id;
end;
$function$;

-- Applies an additional payment to an existing invoice and logs the payment
-- entry atomically.
create or replace function public.record_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text default 'cash'
)
returns public.invoices
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_invoice public.invoices;
  v_new_paid numeric;
  v_status text;
begin
  select * into v_invoice from public.invoices where id = p_invoice_id;
  if v_invoice.id is null then
    raise exception 'Invoice not found';
  end if;
  if not public.is_branch_member(v_invoice.branch_id) then
    raise exception 'Access denied';
  end if;

  v_new_paid := greatest(0, least(v_invoice.total, coalesce(v_invoice.amount_paid, 0) + p_amount));
  v_status := case
    when v_new_paid <= 0 then 'due'
    when v_new_paid >= v_invoice.total then 'paid'
    else 'partial'
  end;

  update public.invoices
  set amount_paid = v_new_paid, status = v_status
  where id = p_invoice_id
  returning * into v_invoice;

  if p_amount > 0 then
    insert into public.invoice_payments (invoice_id, branch_id, amount, method)
    values (p_invoice_id, v_invoice.branch_id, p_amount, coalesce(p_method, 'cash'));
  end if;

  return v_invoice;
end;
$function$;

-- Lets a signed-in user see whether their email has a pending staff invite.
-- Direct SELECT on branch_invites is restricted to branch owners, so an
-- invited staff member can't otherwise tell they've been invited.
create or replace function public.my_pending_invite()
returns table(branch_id uuid, branch_name text, role text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    return;
  end if;

  return query
  select bi.branch_id, b.name, bi.role
  from public.branch_invites bi
  join public.branches b on b.id = bi.branch_id
  where lower(bi.email) = lower(v_email)
  order by bi.created_at asc
  limit 1;
end;
$function$;

-- Converts the caller's pending invite (if any) into real branch_members
-- access. branch_members has no client-facing INSERT policy at all (same as
-- how branch creation grants ownership via handle_new_branch below), so
-- this RPC is the only way a user who was ALREADY signed up before being
-- invited can actually join -- handle_new_user_invites (below) only covers
-- the case where the invite existed before the person ever signed up.
create or replace function public.accept_branch_invite()
returns public.branches
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_invite public.branch_invites;
  v_branch public.branches;
  v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    raise exception 'Not signed in';
  end if;

  select * into v_invite
  from public.branch_invites
  where lower(email) = lower(v_email)
  order by created_at asc
  limit 1;

  if v_invite.id is null then
    raise exception 'No pending invite for this email';
  end if;

  insert into public.branch_members (branch_id, user_id, role, email)
  values (v_invite.branch_id, auth.uid(), v_invite.role, v_email)
  on conflict (user_id, branch_id) do nothing;

  delete from public.branch_invites where id = v_invite.id;

  select * into v_branch from public.branches where id = v_invite.branch_id;
  return v_branch;
end;
$function$;

revoke execute on function public.decrement_inventory_stock(uuid, integer) from public, anon;
revoke execute on function public.create_sale(uuid, jsonb, text) from public, anon;
revoke execute on function public.delete_sale(uuid) from public, anon;
revoke execute on function public.record_payment(uuid, numeric, text) from public, anon;
revoke execute on function public.my_pending_invite() from public, anon;
revoke execute on function public.accept_branch_invite() from public, anon;
grant execute on function public.decrement_inventory_stock(uuid, integer) to authenticated;
grant execute on function public.create_sale(uuid, jsonb, text) to authenticated;
grant execute on function public.delete_sale(uuid) to authenticated;
grant execute on function public.record_payment(uuid, numeric, text) to authenticated;
grant execute on function public.my_pending_invite() to authenticated;
grant execute on function public.accept_branch_invite() to authenticated;

-- ============================================================
-- Trigger functions + triggers
-- ============================================================

-- Grants ownership of a newly-created branch to whoever created it.
create or replace function public.handle_new_branch()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.branch_members (user_id, branch_id, role, email)
  values (auth.uid(), new.id, 'owner', (select email from auth.users where id = auth.uid()));
  return new;
end;
$function$;

create trigger on_branch_created
  after insert on public.branches
  for each row execute function public.handle_new_branch();

-- Covers the case where a staff invite already existed for an email BEFORE
-- that person ever signed up: fires once on their first-ever sign-up,
-- joins them to the invited branch, and consumes the invite. Does NOT
-- cover the reverse order (person already had an account, invited
-- afterward) -- that's what accept_branch_invite() + the "You've been
-- invited" screen in ShopAccessGate handle instead.
create or replace function public.handle_new_user_invites()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.branch_members (user_id, branch_id, role, email)
  select new.id, bi.branch_id, bi.role, new.email
  from public.branch_invites bi
  where bi.email = new.email
  on conflict do nothing;

  delete from public.branch_invites where email = new.email;

  return new;
end;
$function$;

create trigger on_auth_user_created_link_invites
  after insert on auth.users
  for each row execute function public.handle_new_user_invites();

-- Emails the app owner whenever a new shop_requests row appears, so they
-- know to open Supabase -> Table Editor -> shop_requests and approve or
-- reject it (no in-app admin screen -- the table editor is the approval
-- UI). Fire-and-forget: a failure here doesn't fail the request insert.
create or replace function public.notify_shop_request()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform net.http_post(
    url := 'https://kwxmafprurnxfiofotyf.supabase.co/functions/v1/notify-shop-request',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-trigger-secret', '12d27c049a5604d27d6b9004a0fbaf68a752e45871d9a0b5b38e1c5856103cd9'
    ),
    body := jsonb_build_object('email', new.email, 'shop_name', new.shop_name, 'phone', new.phone)
  );
  return new;
end;
$function$;

create trigger on_shop_request_created
  after insert on public.shop_requests
  for each row execute function public.notify_shop_request();

-- Emails the invited person whenever a new branch_invites row appears, so
-- they know to sign in/sign up with that email to get access.
create or replace function public.notify_staff_invite()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_shop_name text;
begin
  select name into v_shop_name from public.branches where id = new.branch_id;

  perform net.http_post(
    url := 'https://kwxmafprurnxfiofotyf.supabase.co/functions/v1/notify-staff-invite',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-trigger-secret', '12d27c049a5604d27d6b9004a0fbaf68a752e45871d9a0b5b38e1c5856103cd9'
    ),
    body := jsonb_build_object('email', new.email, 'shop_name', v_shop_name)
  );
  return new;
end;
$function$;

create trigger on_staff_invite_created
  after insert on public.branch_invites
  for each row execute function public.notify_staff_invite();
