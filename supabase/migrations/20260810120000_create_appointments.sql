-- Adds patient appointment booking: a new table plus the same per-branch
-- member/owner RLS pattern used by patients/inventory/invoices.

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  patient_id uuid references public.patients(id),
  patient_name text not null,
  patient_phone text,
  scheduled_at timestamptz not null,
  reason text,
  notes text,
  status text not null default 'scheduled' check (status = any (array['scheduled', 'completed', 'cancelled'])),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.appointments enable row level security;

create policy "members read appointments" on public.appointments
  for select to authenticated using (is_branch_member(branch_id));
create policy "members insert appointments" on public.appointments
  for insert to authenticated with check (is_branch_member(branch_id));
create policy "members update appointments" on public.appointments
  for update to authenticated using (is_branch_member(branch_id));
create policy "owner deletes appointments" on public.appointments
  for delete to authenticated using (is_branch_owner(branch_id));
