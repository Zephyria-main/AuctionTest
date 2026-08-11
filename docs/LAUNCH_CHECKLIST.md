# Launch checklist

Every box below must be checked by an authorised ABCF representative
before the auction opens to real bidders. Items marked **[HUMAN APPROVAL
REQUIRED]** cannot be signed off by the build itself — they need a named
person's sign-off, recorded here or in your own approvals tracker.

## Content — **[HUMAN APPROVAL REQUIRED]** for every row

- [ ] All 15 item titles, short descriptions and full descriptions are final (no `[SAMPLE]` or `[PLACEHOLDER]` text remains — search for both strings in `/admin/items`).
- [ ] All 15 item photos are real, correctly oriented, and under ~2MB each for fast mobile loading.
- [ ] Estimated values, opening bids and minimum increments are confirmed with donors/committee.
- [ ] Closing times are correct in **Australia/Sydney** time and make sense relative to the event schedule.
- [ ] Auction terms (`/terms`) replaced with ABCF-approved wording (eligibility, "as is" condition, GST treatment, collection/delivery, right to withdraw items).
- [ ] Privacy notice (`/privacy`) replaced with ABCF-approved wording, including the data retention period and how a bidder can request deletion.
- [ ] Landing page "About this auction" text is final.
- [ ] Support contact email/phone shown in the footer and emails are real, monitored addresses.

## Closing rules

- [ ] Confirm with the committee: is the two-minute-trigger / two-minute-extension default (`/admin/settings`) what you want, or should any item differ? Set per-item overrides now, not on the night.
- [ ] Confirm whether "Pause all bidding" is expected to be used proactively (e.g. during speeches) — if so, brief operators (see `docs/OPERATOR_GUIDE.md`).

## Email wording

- [ ] Read every template in `src/lib/email/templates.ts` end-to-end (registration, sign-in code, bid confirmation, outbid, closing soon, winner, payment request, payment confirmation) and confirm tone/wording with ABCF communications. **[HUMAN APPROVAL REQUIRED]**
- [ ] Send yourself one real test of each via rehearsal mode and read it on a phone.

## Domain & environment

- [ ] Production domain DNS resolves to Vercel and shows a valid TLS certificate.
- [ ] SPF, DKIM and DMARC all show "Verified"/pass in Resend and in a real test-send header check (e.g. mail-tester.com in rehearsal, not production). **[HUMAN APPROVAL REQUIRED — confirm with whoever manages DNS]**
- [ ] Confirmed the domain and hosting will remain active for at least 90 days after the event (`docs/DEPLOYMENT.md` §5). **[HUMAN APPROVAL REQUIRED]**
- [ ] `APP_ENV=production` is set in the production Vercel environment (this disables the test-only sign-in route and rehearsal email/payment guardrails).
- [ ] Production Supabase project contains **zero** rehearsal bidders/bids — run `npm run reset:rehearsal -- --yes` and verify the bidders table is empty of `@rehearsal.test` addresses.
- [ ] Production `.env` values reviewed against `.env.example` — nothing missing, nothing pointing at a test/rehearsal resource.

## Stripe settings — **[HUMAN APPROVAL REQUIRED]**

- [ ] Live Stripe account is activated (business verification complete, payout bank account confirmed).
- [ ] Statement descriptor is set and recognisable as the Australian Brain Cancer Foundation.
- [ ] Live-mode webhook endpoint configured and verified per `docs/DEPLOYMENT.md` §6.
- [ ] A committee member with financial authority has reviewed and approved the live Stripe configuration.

## Final rehearsal

- [ ] Full rehearsal completed in `APP_ENV=rehearsal` with Stripe test mode: registration, bidding, simultaneous bidding, closing + extensions, winner emails, consolidated payment, a deliberately failed test card, a repeated webhook, an email-provider outage, a realtime disconnect, an admin pause/resume, and an accidental-early-close recovery. See `docs/RECOVERY_GUIDE.md` for the recovery steps rehearsed.
- [ ] All four CSV exports (bidders, bids, winners, payments) downloaded and manually spot-checked against known rehearsal data.
- [ ] `npm run reset:rehearsal -- --yes` run against production immediately before real registrations open.

## Go-live

- [ ] Items switched from `draft`/`paused` to `open` at the intended start time (or scheduled to do so — see `docs/OPERATOR_GUIDE.md`).
- [ ] `/admin/status` shows database, Stripe and email all healthy immediately before doors open.
