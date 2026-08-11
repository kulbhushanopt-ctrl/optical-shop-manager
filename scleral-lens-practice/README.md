# Scleral Lens Practice

A standalone, mobile-first React app for running a contact/scleral lens fitting practice:
patient records with a full fitting history, corneal topography import, AI-assisted reading
of handwritten or printed fitting slips, lens order tracking, and fitting-fee billing.

This app is **fully independent** of any other project — it has its own Supabase backend
(its own database, auth, and patients) and does not share data or code at runtime with
anything else in this repository.

## Features

- **Auth** — email/password sign-in and sign-up (Supabase Auth), single-practitioner model:
  everything you create belongs to your own account
- **Patients** — records with photo, contact info, DOB, and notes (corneal condition,
  keratoconus stage, prior lens history, etc.)
- **Fitting history** — every patient can have multiple fitting visits over time, each with:
  - Lens type (Soft / RGP / Scleral / Hybrid), per-eye power/cyl/axis/base curve/diameter,
    toric marking, sag depth (scleral), and add power
  - **Corneal topography import** — for scleral fittings, capture or import a topography-map
    photo per eye in one tap (in-page camera, with gallery import as a fallback), viewable
    full-screen from the patient record
  - **AI Rx scan** — reads a photo of a printed or handwritten fitting slip and fills in the
    form fields for you to review before saving
  - Status tracking (trial / follow-up / dispensed / discontinued) and a next-follow-up date
- **Lens orders** — track trial and final lens orders sent to the lab, with status
  (ordered / received / dispensed / cancelled)
- **Billing** — line-item invoices per patient for fitting fees, trial fees, and follow-up
  visits, with partial-payment tracking

## Tech stack

- React 18 + Vite
- Tailwind CSS
- Supabase (Postgres, Auth, Row Level Security)

## Getting started

```bash
npm install
cp .env.example .env   # fill in your own Supabase project URL and anon key
npm run dev
```

## Database

Apply `supabase/migrations/00000000000000_baseline.sql` to your Supabase project (via the
SQL editor, or `supabase db push` with the Supabase CLI) before running the app. It creates
`patients`, `lens_orders`, and `invoices`, each with Row Level Security scoped to
`user_id = auth.uid()` — every practitioner only ever sees their own data.

Going forward, every schema change should be applied to the live project *and* added as a new
file in `supabase/migrations/`, so the repo stays a true reflection of the database instead of
schema history existing only in Supabase.

## AI prescription scanning

The "Scan prescription (AI)" button calls a `scan-fitting-rx` Supabase Edge Function
(`supabase/functions/scan-fitting-rx/`), which needs a `GEMINI_API_KEY` secret set on your
Supabase project:

```bash
supabase functions deploy scan-fitting-rx
supabase secrets set GEMINI_API_KEY=your-key-here
```

Until that secret is set, scanning responds with a clear "not set up yet" message instead of
failing silently — everything else in the app works without it.
