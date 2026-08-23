-- Blank labels print a SKU, category, and price onto a physical tag before
-- the item exists in inventory at all -- previously that price/category was
-- only ever held in the print modal's local React state and thrown away the
-- moment it closed, so scanning the label later at Add Item time could only
-- recover the SKU. This table remembers what was printed for a SKU so
-- scanning also fills in category and price, not just the SKU field.

create table public.label_reservations (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  sku text not null,
  category text,
  price numeric,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (branch_id, sku)
);

alter table public.label_reservations enable row level security;

create policy "members read label reservations" on public.label_reservations
  for select to authenticated using (is_branch_member(branch_id));
create policy "members insert label reservations" on public.label_reservations
  for insert to authenticated with check (is_branch_member(branch_id));
create policy "members delete label reservations" on public.label_reservations
  for delete to authenticated using (is_branch_member(branch_id));
