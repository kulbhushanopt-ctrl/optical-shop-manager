-- Lets staff mark a patient with a short follow-up reminder (e.g. "Needs
-- contact lenses") that's visible right in the patient list, separate from
-- appointments -- a null value means the patient isn't flagged.
alter table public.patients add column if not exists flag_note text;
