-- Lets each branch define its own frame category list (previously a single
-- fixed set of 15 codes -- Ladies Metal, Gents Sheet, etc. -- shared by
-- every shop on this deployment) instead of one hardcoded scheme everyone
-- had to use whether it fit their business or not.

create table public.branch_categories (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  code text not null,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (branch_id, code)
);

alter table public.branch_categories enable row level security;

create policy "members read categories" on public.branch_categories
  for select to authenticated using (is_branch_member(branch_id));
create policy "owner inserts categories" on public.branch_categories
  for insert to authenticated with check (is_branch_owner(branch_id));
create policy "owner updates categories" on public.branch_categories
  for update to authenticated using (is_branch_owner(branch_id));
create policy "owner deletes categories" on public.branch_categories
  for delete to authenticated using (is_branch_owner(branch_id));

-- Seed every existing branch with the same 15 categories the app already
-- had hardcoded, so nothing changes for a shop that never touches this --
-- their SKUs, printed labels, and scans keep working exactly as before.
insert into public.branch_categories (branch_id, code, label, sort_order)
select b.id, c.code, c.label, c.sort_order
from public.branches b
cross join (values
  ('LM', 'Ladies Metal', 0),
  ('LMX', 'Ladies Metal (Exclusive)', 1),
  ('LS', 'Ladies Sheet', 2),
  ('LSX', 'Ladies Sheet (Exclusive)', 3),
  ('LF', 'Ladies Frameless', 4),
  ('GM', 'Gents Metal', 5),
  ('GMX', 'Gents Metal (Exclusive)', 6),
  ('GS', 'Gents Sheet', 7),
  ('GSX', 'Gents Sheet (Exclusive)', 8),
  ('GF', 'Gents Frameless', 9),
  ('KB', 'Kids Boys', 10),
  ('KBX', 'Kids Boys (Exclusive)', 11),
  ('KG', 'Kids Girls', 12),
  ('KGX', 'Kids Girls (Exclusive)', 13),
  ('SG', 'Sunglasses', 14)
) as c(code, label, sort_order);

-- New branches created from here on get the same starter set automatically
-- (an owner can then add/rename/delete freely) -- extends the existing
-- handle_new_branch trigger rather than adding a second trigger.
create or replace function public.handle_new_branch()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into public.branch_members (user_id, branch_id, role, email)
  values (auth.uid(), new.id, 'owner', (select email from auth.users where id = auth.uid()));

  insert into public.branch_categories (branch_id, code, label, sort_order)
  values
    (new.id, 'LM', 'Ladies Metal', 0),
    (new.id, 'LMX', 'Ladies Metal (Exclusive)', 1),
    (new.id, 'LS', 'Ladies Sheet', 2),
    (new.id, 'LSX', 'Ladies Sheet (Exclusive)', 3),
    (new.id, 'LF', 'Ladies Frameless', 4),
    (new.id, 'GM', 'Gents Metal', 5),
    (new.id, 'GMX', 'Gents Metal (Exclusive)', 6),
    (new.id, 'GS', 'Gents Sheet', 7),
    (new.id, 'GSX', 'Gents Sheet (Exclusive)', 8),
    (new.id, 'GF', 'Gents Frameless', 9),
    (new.id, 'KB', 'Kids Boys', 10),
    (new.id, 'KBX', 'Kids Boys (Exclusive)', 11),
    (new.id, 'KG', 'Kids Girls', 12),
    (new.id, 'KGX', 'Kids Girls (Exclusive)', 13),
    (new.id, 'SG', 'Sunglasses', 14);

  return new;
end;
$function$;
