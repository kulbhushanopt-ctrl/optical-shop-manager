# Optical Shop Manager

A mobile-first React app for running an optical / eyewear shop: patient records with
prescription history, inventory, GST billing, and sales reporting — backed by Supabase
(Postgres + Auth + Row Level Security) so multiple branches and staff can share data securely.

## Features

- **Auth** — email/password sign-in and sign-up (Supabase Auth)
- **Branches & staff** — every shop is a "branch"; the creator is its owner and can invite
  staff, manage members, and switch between multiple branches
- **Patients** — records with photo, contact info, notes, and a full prescription history
  (sphere / cylinder / axis / PD / add power); printable prescription slips
- **Contact lens Rx** — soft, RGP, and scleral lens prescriptions with base curve, diameter,
  toric marking, and sag depth; scleral fittings can also attach a corneal topography photo
  per eye, captured in-page or imported from the gallery
- **AI Rx scan** — reads a photo of a printed or handwritten prescription (glasses or contact
  lens) and fills in the form fields for review
- **Inventory** — frames, sunglasses, lenses, contact lenses, and accessories with stock
  levels, low-stock alerts, and HSN codes
- **Billing** — invoices built from inventory or custom line items, optional GST (CGST/SGST),
  partial payment tracking, printable invoices
- **Sales reports** — totals by day/week/month/custom range, exportable to Excel

## Tech stack

- React 18 + Vite
- Tailwind CSS
- Supabase (Postgres, Auth, Row Level Security)
- `xlsx` for report export, `jspdf`/`html2canvas` for printable slips

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL and anon key
npm run dev
```

## Database

This app expects the following tables to already exist in your Supabase project, each with
Row Level Security enabled: `branches`, `branch_members`, `branch_invites`, `patients`,
`inventory`, `invoices`, `invoice_payments`, `shop_requests`. Access is scoped per-branch —
members can read shared data, and only branch owners can manage inventory, staff, and delete
records. Sales and payments go through the `create_sale`/`delete_sale`/`record_payment`
SECURITY DEFINER RPCs rather than direct table writes, so a sale is always atomic.

The full schema (tables, RLS policies, RPCs, and triggers) lives in
`supabase/migrations/00000000000000_baseline.sql`, captured directly from the live project.
Going forward, every schema change should be applied to the live project *and* added as a new
file in `supabase/migrations/`, so the repo stays a true reflection of the database instead of
schema history existing only in Supabase.
