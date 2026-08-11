-- Contact lens prescriptions (soft/RGP/scleral) need a different field set
-- than glasses prescriptions (base curve, diameter, sag depth instead of a
-- flat SPH/CYL/AXIS/ADD/VA table), so they get their own array column
-- rather than being folded into the existing `prescriptions` column.
alter table public.patients add column if not exists contact_prescriptions jsonb not null default '[]'::jsonb;
