-- Product photos for stock items, a per-item "show on website" switch, and a
-- read-only public catalog feed the shop's website can call with the anon key.

alter table public.inventory
  add column if not exists photo_url text,
  add column if not exists show_online boolean not null default true;

-- Public-read bucket for product photos. Files live under "<branch_id>/...",
-- and only members of that branch can upload, replace or remove them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "product photos: branch members can upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-photos'
    and public.is_branch_member(((storage.foldername(name))[1])::uuid)
  );

create policy "product photos: branch members can replace"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-photos'
    and public.is_branch_member(((storage.foldername(name))[1])::uuid)
  );

create policy "product photos: branch members can remove"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-photos'
    and public.is_branch_member(((storage.foldername(name))[1])::uuid)
  );

-- Website catalog: only customer-safe fields (no purchase price, HSN, exact
-- stock count or anything patient-related), only items switched on for the
-- website, and only for one named branch. SECURITY DEFINER so the anon key
-- can read this without any direct access to the inventory table.
create or replace function public.public_catalog(p_branch_id uuid)
returns table (
  id uuid,
  type text,
  category text,
  category_label text,
  brand text,
  model text,
  sku text,
  price numeric,
  in_stock boolean,
  photo_url text,
  lens_index text,
  coatings jsonb,
  base_curve text,
  diameter text,
  duration text,
  contact_type text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id, i.type, i.category,
    (select c.label from public.branch_categories c
      where c.branch_id = i.branch_id and c.code = i.category limit 1),
    i.brand, i.model, i.sku, i.price,
    coalesce(i.stock, 0) > 0,
    i.photo_url, i.lens_index, i.coatings, i.base_curve, i.diameter, i.duration, i.contact_type
  from public.inventory i
  where i.branch_id = p_branch_id
    and i.show_online
    and i.type in ('frame', 'sunglasses', 'contact', 'accessory', 'lens')
  order by (i.photo_url is null), i.created_at desc;
$$;

revoke all on function public.public_catalog(uuid) from public;
grant execute on function public.public_catalog(uuid) to anon, authenticated;
