-- Deleting a patient was blocked by a foreign key violation whenever that
-- patient had any invoice or appointment on file, since both reference
-- patients(id) with the default ON DELETE NO ACTION. Both tables already
-- keep their own patient_name (and appointments.patient_phone) columns for
-- display, so the link can safely go to null on delete without losing any
-- visible history.
alter table public.invoices drop constraint invoices_patient_id_fkey;
alter table public.invoices add constraint invoices_patient_id_fkey
  foreign key (patient_id) references public.patients(id) on delete set null;

alter table public.appointments drop constraint appointments_patient_id_fkey;
alter table public.appointments add constraint appointments_patient_id_fkey
  foreign key (patient_id) references public.patients(id) on delete set null;
