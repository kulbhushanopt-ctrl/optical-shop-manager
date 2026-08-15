-- Frame sub-category (e.g. "Ladies Metal", "Gents Sheet Exclusive") used
-- to drive category-specific SKU prefixes (LM-001, GSX-001, etc.) instead
-- of just the broad item type. Free text, no CHECK constraint, since the
-- fixed list of categories lives in the frontend (rxConstants.js) and may
-- grow without a migration.
alter table public.inventory add column if not exists category text;
