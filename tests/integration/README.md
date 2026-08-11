# Integration tests

These tests exercise the real `place_bid()`, `admin_void_bid()`, webhook
idempotency and RLS policies against a real Postgres instance — they are
not mocked, because the whole point of this suite is to prove the
database-level concurrency and security guarantees actually hold.

## Prerequisites

1. Install the Supabase CLI: `npm install -g supabase` (or use `npx supabase`).
2. Start a local Supabase stack: `supabase start` (applies migrations and `supabase/seed.sql` automatically).
3. Copy the local URL/keys it prints into `.env.local` (see `.env.example`).
4. Run `npm run test` — vitest picks up both `tests/unit` and `tests/integration`.

If `NEXT_PUBLIC_SUPABASE_URL` is not set, integration tests are skipped
(with a console warning) rather than failing CI environments that don't
run Supabase.
