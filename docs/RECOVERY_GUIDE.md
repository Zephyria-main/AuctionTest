# Recovery guide

Practical steps for the failure scenarios most likely to matter on the
night, and the ones this rehearsal specifically exercises before go-live.
Every scenario here should be rehearsed at least once in `APP_ENV=rehearsal`
before the real event (see `docs/LAUNCH_CHECKLIST.md`).

## Email provider outage (Resend down or misconfigured)

**Symptom**: `/admin/status` shows the email integration configured but
"pending" count climbing and not draining, or "failed" count rising.

**Why it's safe**: emails are queued in `email_outbox`, never sent inline
during bidding. A Resend outage delays notifications; it never blocks a
bid, a closing, or a payment.

**Recovery**:
1. Check `/admin/status` for the pending/failed counts.
2. Check Resend's own status page and your Resend dashboard for delivery errors.
3. Once Resend recovers, the next `process-outbox` cron run (every minute) automatically retries pending jobs — no manual replay needed.
4. Jobs that hit `MAX_ATTEMPTS` (5) are marked `failed` and trigger an admin alert email (if the admin address itself isn't affected) — review `/admin` → check the `email_outbox` table via Supabase Studio for `status = 'failed'` rows and manually resend if needed once the provider is back.
5. **Rehearsal test**: temporarily set `RESEND_API_KEY` to an invalid value in rehearsal, place a bid, confirm the outbox job stays `pending` with a `last_error`, then restore the key and confirm it drains on the next cron run.

## Repeated / duplicate Stripe webhook

**Symptom**: Stripe's dashboard shows a webhook delivered more than once (this is normal Stripe behaviour, not a bug — Stripe retries on any non-2xx and sometimes redelivers regardless).

**Why it's safe**: `webhook_events.id` (the Stripe event id) is the primary key. A duplicate delivery hits a unique-constraint conflict and the handler returns `{ duplicate: true }` immediately without touching `payments` again.

**Recovery**: none needed — this is the system working correctly. To verify: in the Stripe Dashboard, open a past webhook event and click "Resend". Confirm the payment record's `updated_at` does not change and no second confirmation email is sent (check `email_outbox` for a single `payment_confirmation` row per payment).

## Failed payment

**Symptom**: a winner's card is declined at Stripe Checkout.

**Recovery**: nothing to do on our side. The `payments` row stays `pending` (or moves to `failed` on `checkout.session.expired` / `payment_intent.payment_failed`) — the item is never marked paid. The winner simply returns to `/winner` and tries again; the page always recomputes the outstanding total from the database, not from any client-side state.

**Rehearsal test**: use Stripe's test card `4000 0000 0000 0002` (always declines) on a rehearsal winner's checkout, confirm `/winner` still shows the item as unpaid afterwards, then pay with `4242 4242 4242 4242` and confirm it moves to paid only after the webhook fires (watch `/admin/status`, not just the browser redirect).

## Realtime disconnect (database still available)

**Symptom**: the catalogue/item pages stop updating live; a small "Live updates paused — reconnecting" banner appears.

**Why it's safe**: `useLiveItems` keeps the last known state and polls every 20 seconds regardless of the realtime channel's health, and does a full refetch the moment the channel reconnects. Nobody sees a blank or broken page.

**Recovery**: none needed — it self-heals. **Rehearsal test**: in rehearsal, open dev tools → Network → set to "Offline" for 30 seconds on a bidding page, confirm the banner appears, then restore the connection and confirm prices catch up within ~20 seconds.

## Venue internet problems (bidder's own connection)

Individual bidders on flaky venue wifi/4G will see failed fetches with a
clear retry message (bid submission and countdown calibration both fail
gracefully with a "try again" message rather than silently losing the
bid). If venue-wide internet is down, nothing in this app can route around
that — floor support should switch to manual paper bidding as a fallback
for affected items and reconcile into the system once connectivity
returns (an admin can enter a bid on a bidder's behalf is **not**
supported by this UI; use `admin_void_bid`-style correction sparingly and
document manually reconciled bids in the audit trail via a clear reason).

## Admin pause / resume

**Use case**: something looks wrong (a bug, a dispute, an announcement) and you want bidding frozen everywhere immediately.

**Recovery**: `/admin` → "Pause all bidding" → enter a reason → confirm. Every `place_bid()` call now fails with `BIDDING_PAUSED` until an admin resumes. Resume the same way. Both actions are in the audit log with the reason. **Rehearsal test**: pause, confirm a rehearsal bid is rejected with a clear message, resume, confirm bidding works again.

## Accidental early closure

**Symptom**: an admin clicks "Close now" on an item that should still be open.

**What happens**: the item immediately moves to `closed` and (if there was a bid) a winner is recorded; no further bids are accepted.

**Approved recovery process**:
1. Auction lead confirms the closure was accidental (check `/admin/audit` for the `item_status_changed` entry and its actor/timestamp).
2. Admin reopens the item: `/admin/items` → "Reopen" on that item, which sets status back to `open`. This does **not** erase the bid that was recorded while it was briefly closed — that bid remains valid and current.
3. Admin edits the item's closing time on `/admin/items/<id>/edit` to a sensible new value (e.g. a few minutes from now, or back to the original schedule) so bidding has a fair, clearly-communicated new close time.
4. If any bidder was notified of a "win" before the reopen, that winner notification cannot be unsent — the auction lead should personally follow up with that bidder to explain the item is back open, before the item closes again for real.
5. Record what happened and the fix in the audit log reason field (the reopen and edit both prompt for one).

**Rehearsal test**: close a rehearsal item early, confirm it can be reopened, confirm bidding resumes correctly, and confirm the earlier bid is still intact.

## Database (Supabase) outage

**Symptom**: `/api/health` and `/admin/status` report the database unreachable; bidding, registration and admin actions all fail.

**Recovery**: check Supabase's status page and project health in the Supabase dashboard. This app has no local fallback for a full database outage — bidding cannot safely continue without the authoritative clock and lock that `place_bid()` depends on. If an outage happens near a closing time, extend affected items' closing times once the database is back (via `/admin/items`) rather than penalising bidders for downtime, and communicate the extension to affected bidders directly (phone/PA announcement — email queueing also depends on the database being back).

## Stripe outage

**Symptom**: `/admin/status` shows Stripe configured but checkout session creation fails (`/winner` shows "payment service is temporarily unavailable").

**Recovery**: check Stripe's status page. Nothing is lost — no payment has been attempted yet at this point, so winners simply retry once Stripe recovers. If Stripe is down for an extended period after the event, an admin can record an **offline payment** directly against a `payments` row (status `offline_paid`) via Supabase Studio, with a note in the audit trail, for a winner who paid by an alternate method (e.g. cash/EFTPOS on the night) — document this manually since there is no dedicated UI for it in v1 (see `docs/ASSUMPTIONS.md`).
