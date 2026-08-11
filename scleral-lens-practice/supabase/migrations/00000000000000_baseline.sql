-- Scleral Lens Practice -- baseline schema.
--
-- Single-owner model: every row belongs to the practitioner (auth user) who
-- created it via `user_id`, with no branch/staff sharing layer. Row Level
-- Security enforces that a user can only ever see and modify their own
-- patients, orders, and invoices.

create extension if not exists "pgcrypto";

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  phone text,
  dob date,
  address text,
  notes text,
  photo text,
  -- Fitting history embedded as a JSON array (one row per visit: lens type,
  -- per-eye power/BC/DIA/sag, topography photos, status, notes) -- avoids a
  -- join just to show a patient's fitting timeline, same idea as a
  -- prescription list on a patient record.
  fittings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lens_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  patient_id uuid not null references public.patients(id) on delete cascade,
  patient_name text,
  eye text not null default 'OD' check (eye = any (array['OD', 'OS', 'Both'])),
  brand text,
  base_curve text,
  diameter text,
  power text,
  lab_name text,
  order_date date not null default current_date,
  expected_date date,
  status text not null default 'ordered' check (status = any (array['ordered', 'received', 'dispensed', 'cancelled'])),
  notes text,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  patient_id uuid not null references public.patients(id) on delete cascade,
  patient_name text,
  date date not null default current_date,
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  amount_paid numeric not null default 0,
  status text not null default 'due' check (status = any (array['due', 'partial', 'paid'])),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.patients enable row level security;
alter table public.lens_orders enable row level security;
alter table public.invoices enable row level security;

create policy "patients: owner full access" on public.patients
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "lens_orders: owner full access" on public.lens_orders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "invoices: owner full access" on public.invoices
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index patients_user_id_idx on public.patients(user_id);
create index lens_orders_user_id_idx on public.lens_orders(user_id);
create index lens_orders_patient_id_idx on public.lens_orders(patient_id);
create index invoices_user_id_idx on public.invoices(user_id);
create index invoices_patient_id_idx on public.invoices(patient_id);
