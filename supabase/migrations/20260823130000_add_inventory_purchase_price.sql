-- Tracks what the shop paid for a stock item, separate from its selling
-- price, so margin can eventually be seen without needing it for every
-- existing row (nullable, optional).
alter table public.inventory add column if not exists purchase_price numeric;
