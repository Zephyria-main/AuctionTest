# ABCF Silent Auction

A single-event silent auction web application built for the Australian
Brain Cancer Foundation: ~15 items, up to ~500 registered bidders, one
gala night, mobile-first. Next.js (App Router, TypeScript) + Tailwind CSS +
Supabase (Postgres, Auth, Storage, Realtime) + Stripe Checkout + Resend,
deployed on Vercel.

Authoritative time zone: **Australia/Sydney**. All amounts: **AUD**, stored
as integer cents.

## Documentation

- [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) — every assumption made and every decision still needing ABCF approval. **Read this first.**
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Vercel + Supabase + Stripe + Resend setup, environment variables, DNS.
- [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md) — sign-offs required before going live.
- [`docs/OPERATOR_GUIDE.md`](docs/OPERATOR_GUIDE.md) — event-night runbook.
- [`docs/RECOVERY_GUIDE.md`](docs/RECOVERY_GUIDE.md) — what to do when something breaks mid-event.

## Architecture at a glance

- **Bidding integrity**: every bid goes through the single Postgres function `place_bid()` (`supabase/migrations/0003_functions.sql`), which locks the item row, checks pause/open/closing-time state against the *database* clock, computes the minimum acceptable bid, and applies closing-time extensions — all in one transaction. The browser never decides whether a bid is valid.
- **Privacy**: Row Level Security everywhere (`supabase/migrations/0004_rls.sql`). A bidder can read their own profile and bid history, never another bidder's. The `current_bid_bidder_id` column is revoked at the column-privilege level so "who's winning" can only be learned via a function that checks it against your own session.
- **Payments**: Stripe Checkout only; card data never touches this app. A payment is only ever marked `paid` by a signature-verified webhook (`src/app/api/stripe/webhook/route.ts`), never by the browser's return from Stripe. Webhook processing is idempotent via a `webhook_events` table keyed on the Stripe event id.
- **Email**: an `email_outbox` table decouples sending from the bidding transaction; a cron-triggered processor (`src/app/api/cron/process-outbox/route.ts`) sends via a small `EmailProvider` interface (Resend today) with retry/backoff and per-message `dedupe_key`s so nothing sends twice.
- **Realtime**: the catalogue and item pages subscribe to Supabase Realtime for live price updates, with a 20s poll as a safety net and a full refetch on reconnect — the catalogue stays fully readable from cached state if realtime drops.

## Local development

```bash
npm install
npm install -g supabase   # or use `npx supabase ...`
supabase start             # applies migrations + supabase/seed.sql
cp .env.example .env.local # fill in the local Supabase URL/keys `supabase start` prints
npm run dev
```

Visit http://localhost:3000. Sign in as the admin test account by
promoting a registered profile's `role` to `admin` in the local Supabase
Studio (http://localhost:54323), or via `supabase/seed.sql`.

## Tests

```bash
npm run test          # unit tests (always) + integration tests (if Supabase env vars are set)
npm run test:e2e       # Playwright — starts `npm run dev` automatically
```

See [`tests/integration/README.md`](tests/integration/README.md) for what the integration suite requires.

## Rehearsal

```bash
APP_ENV=rehearsal npm run seed:test-bidders   # 100 test bidders + realistic bidding across all items
```

Rehearsal mode (`APP_ENV=rehearsal`) uses Stripe **test mode** keys and
redirects every outbound email to `REHEARSAL_EMAIL_OVERRIDE`, prefixing the
subject with `[REHEARSAL - TEST ONLY]` — no real bidder is ever emailed and
no real payment is ever charged while `APP_ENV=rehearsal`.

Before go-live:

```bash
npm run reset:rehearsal -- --yes   # removes rehearsal bidders/bids/payments, keeps item configuration
```

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
