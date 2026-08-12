# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A mobile-first React app for running an optical/eyewear shop: patient records with prescription
history, inventory, GST billing, and sales reporting. Backend is Supabase (Postgres + Auth + Row
Level Security), multi-tenant by "branch" so multiple shops/staff can share the one project securely.

## Commands

```bash
npm install
cp .env.example .env   # optional locally -- see "Supabase config" below
npm run dev            # Vite dev server
npm run build           # production build
npm run preview         # preview the production build
```

There is no lint script, no test suite, and no CI config in this repo. Verify changes by running
`npm run dev` and exercising the affected screen manually.

## Supabase config

`src/lib/supabaseClient.js` falls back to a hardcoded default project URL/anon key when
`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` aren't set, so the app works with zero config against
the live project. The anon key is safe to be public — every request it makes is still gated by RLS.

## Architecture

**Frontend is a single Supabase-backed React SPA, no server code of its own** (aside from Supabase
Edge Functions — see below). All data access goes through `src/lib/api.js`, a flat set of functions
per resource (`fetchPatients`, `createInventoryItem`, `createSale`, ...) that wrap `supabase-js`
calls. Components never call `supabase.from(...)` directly — they call an `api.js` function.

**Auth/branch bootstrap flow** (`src/App.jsx`): session check → load the user's `branch_members`
memberships → if none, show `ShopAccessGate` (create a shop or submit a `shop_requests` row for the
owner to approve manually in the Supabase table editor — there's no in-app admin UI for this) → once
a branch is selected, `ShopApp` loads that branch's patients/inventory/invoices/payments/appointments
in one `Promise.all` and renders the tab UI. Switching tabs does not refetch; each tab's list state
lives in `ShopApp` and is passed down along with its setter, so child components mutate it directly
after a successful API call instead of the parent re-fetching.

**Multi-tenancy model**: every table has a `branch_id`. A `branches` row is a shop; `branch_members`
maps users to branches with a `role` of `owner` or `staff`. The user who creates a branch becomes its
owner. Owners can invite staff (`branch_invites`, consumed via the `my_pending_invite` /
`accept_branch_invite` RPCs since a new staff member can't directly SELECT invites addressed to
them), manage members, and are the only role that can delete records or manage inventory writes;
staff can read shared data and create sales/patients. A super-admin (hardcoded to
`kulbhushanopt@gmail.com` in RLS policies and in the `notify-shop-request` Edge Function) can see and
manage every branch and approve shop requests.

**Money-moving operations go through `SECURITY DEFINER` RPCs, not direct table writes**, so they're
atomic and enforce authorization server-side regardless of client trust:
- `create_sale` — inserts the invoice, decrements stock for every line item, and logs the opening
  payment in one transaction.
- `delete_sale` — reverses a sale: deletes the invoice and restores stock atomically (owner-only,
  enforced inside the function).
- `record_payment` — applies an additional payment to an existing invoice and logs it.

`src/lib/api.js` calls these via `supabase.rpc(...)`; never reimplement a sale/payment as separate
insert/update calls from the client.

**DB row ↔ JS object mapping**: Postgres columns are `snake_case`; JS objects used throughout the UI
are `camelCase`. `api.js` has paired `xToDb`/`xFromDb` converters per resource (see
`inventoryToDb`/`inventoryFromDb`, `invoiceToDb`/`invoiceFromDb`) — extend these, don't leak raw
snake_case rows into components.

**Schema changes must be applied to the live Supabase project AND committed as a new file in
`supabase/migrations/`** (timestamp-prefixed, e.g. `20260813090000_add_patient_flag_note.sql`), so
the migrations folder stays a true reflection of the live database. `00000000000000_baseline.sql` is
a captured snapshot of everything that predates this convention — it's a reference, not something to
replay (its `create table` statements will fail against the live, already-provisioned project).

**AI features are Supabase Edge Functions** (`supabase/functions/*/index.ts`, Deno), each a thin
proxy to the Gemini API for one task: `scan-prescription`, `scan-contact-rx`, `scan-patient-intake`,
`scan-frame`, and `parse-inventory-command` (voice/text → structured inventory fields). All share the
same shape: read `GEMINI_API_KEY` from env, return `{ error: "not_configured", message }` if unset
(a normal, expected response the frontend should handle gracefully, not throw on), otherwise call
`gemini-flash-latest` with a task-specific prompt requesting strict JSON back. `notify-shop-request`
and `notify-staff-invite` are DB-trigger-invoked functions (see `on_shop_request_created` /
`on_staff_invite_created` triggers in the baseline migration) that email the relevant party.

## Code organization

- `src/lib/api.js` — all Supabase queries/RPCs; the only file that should import `supabase` directly
  for data access (`src/lib/supabaseClient.js` is the client itself).
- `src/components/` — grouped by feature (`billing/`, `inventory/`, `patients/`, `layout/`), plus
  `shared/` for cross-feature UI primitives (`ui.jsx` has `Spinner`, `BottomNav`, etc.),
  `BarcodeScanner`/`BarcodeSvg`/`CameraCapture` for device I/O, and `ShareBar` for share/print actions.
- `src/lib/rxParse.js` / `rxConstants.js` — prescription value parsing/formatting shared between the
  Rx entry modals and the printable Rx slip.
- `src/lib/format.js`, `upi.js`, `image.js`, `share.js`, `messages.js` — currency/date formatting, UPI
  payment link/QR generation, image resize/compress before upload, Web Share API wrapper, and
  user-facing copy/error message strings, respectively.
- `src/hooks/useModalBackClose.js` — makes the Android/browser back button close the topmost open
  modal instead of navigating away; used by every modal component.
- `src/hooks/useVoiceInput.js` — wraps the Web Speech API for voice-to-text entry (e.g. the
  inventory `TextCommandModal`).

## Conventions

- Tailwind for all styling; custom design tokens (colors like `paper`/`ink`/`lens`, font families,
  `rounded-xl2`) are defined in `tailwind.config.js` — prefer those over ad hoc hex values.
- Every `api.js` function throws on `error` from a Supabase call rather than returning it; callers
  are expected to `try/catch`.
- Bulk-insert variants (`createPatients`, `createInventoryItems`) exist specifically for spreadsheet
  import so it's one round trip instead of one per row — reuse this pattern for any new bulk-create
  path rather than looping single inserts.
- `ErrorBoundary` wraps the whole app (see `src/main.jsx`) and only handles render-time exceptions;
  it doesn't replace per-call try/catch in event handlers.
