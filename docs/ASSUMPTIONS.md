# Assumptions and decisions requiring approval

Read this before launch. Anything marked **[APPROVAL NEEDED]** is a
decision only the Australian Brain Cancer Foundation (or its delegate) can
make — the build does not and should not decide these on your behalf.

## Content placeholders (must be replaced before launch)

- All 15 seed items are clearly labelled `[SAMPLE]`/`[PLACEHOLDER]` — real items, descriptions, values and photography are required. **[APPROVAL NEEDED]**
- `/terms` and `/privacy` are placeholder pages that must not go live as-is — final wording needs ABCF/legal sign-off. **[APPROVAL NEEDED]**
- Event name, date, support email/phone, logo and colours in `src/lib/config.ts` are placeholders driven by environment variables — set the real values per environment. **[APPROVAL NEEDED]**
- Landing page "About this auction" copy is placeholder. **[APPROVAL NEEDED]**

## Architecture decisions made, and why

- **Authentication is Supabase Auth's built-in email OTP/magic link**, not a
  hand-rolled one-time-code system. This gets rate limiting, single-use,
  expiring tokens and secure token storage for free from a well-audited
  library rather than reinventing it for one event. The trade-off: the
  literal sign-in email itself is sent by Supabase Auth (via SMTP you
  configure to route through Resend — see `docs/DEPLOYMENT.md` §2.5), not
  through our own `email_outbox`/template system, so its wording is
  configured in the Supabase dashboard rather than
  `src/lib/email/templates.ts`. `authCodeEmail()` in that file documents
  the intended copy to mirror there.
- **Admin MFA**: the spec asked for admin multi-factor authentication "if
  supported by the selected authentication configuration." Supabase Auth
  supports TOTP MFA, but enabling and enforcing it is a project-level
  dashboard configuration + a per-admin enrolment flow, not application
  code. **[APPROVAL NEEDED / ACTION NEEDED]**: enable MFA enrolment in the
  Supabase Auth dashboard and enrol every admin account before launch;
  this build's `requireAdmin()` check is role-based and does not currently
  enforce that MFA was used for the current session — treat this as a
  pre-launch hardening step, not a v1 gap that blocks rehearsal.
- **Rate limiting is in-memory**, per Vercel serverless instance, not a
  shared store (e.g. Upstash Redis). At ~500 bidders and one event this is
  a reasonable simplification — worst case, a burst is rate-limited less
  precisely across concurrently-cold instances, but every bid is still
  fully validated by `place_bid()` regardless. If Vercel scales this
  deployment across many concurrent instances under real load, consider
  swapping `src/lib/rateLimit.ts` for a shared store — the call sites
  don't need to change.
- **Offline/manually-recorded payments** (e.g. a winner who paid by
  EFTPOS on the night) have a `payments.status = 'offline_paid'` value in
  the schema and are included in exports/CSV, but there is no dedicated
  admin UI to record one in v1 — it's done via Supabase Studio with an
  audit note. If offline payments are expected to be common, a small
  admin form would be a quick follow-up.
- **Consolidated payment reminder emails** (`payment_request`) are sent
  once per item as it closes, each showing the bidder's full running
  total across all their won-but-unpaid items — not a single, final email
  sent only once "everything is done." A winner who wins multiple items
  closing at different times may get more than one reminder; the `/winner`
  page itself always shows the accurate, fully consolidated total
  regardless of how many reminders went out.
- **A bidder's marketing consent is separate from and never implied by**
  auction registration (registration form has two distinct required
  checkboxes for terms/privacy and one distinct optional checkbox for
  marketing). The bidders CSV export includes an explicit
  `supporterhub_marketing_consent` column intended for SupporterHub
  import — confirm with whoever manages SupporterHub that this column
  name/format matches their import expectations. **[APPROVAL NEEDED]**
- **Data retention**: the schema has no automatic deletion job. Retention
  is a policy decision — **[APPROVAL NEEDED]**: confirm how long bidder
  personal information (name, email, mobile) should be kept after the
  event beyond the 90-day receipts/support window, and who is responsible
  for exporting-then-deleting it. `npm run reset:rehearsal` deletes
  *rehearsal* data only; there is no equivalent "delete real bidder data"
  script since that decision needs a human-approved retention period
  first.
- **GST / tax treatment** of auction proceeds and receipts is not encoded
  anywhere in this app (Stripe receipts are Stripe's standard receipt,
  not a tax-deductible-donation receipt). **[APPROVAL NEEDED]**: confirm
  with ABCF finance whether any part of the winning bid is
  tax-deductible and whether a different receipt/acknowledgment is
  required in addition to Stripe's.
- **Test-only sign-in route** (`/api/test/sign-in`) exists to make the
  Playwright e2e suite able to authenticate without driving a real email
  inbox. It hard-refuses when `APP_ENV=production`. Confirm this
  environment variable is genuinely set to `production` in the production
  Vercel environment as part of `docs/LAUNCH_CHECKLIST.md` — this is the
  only thing standing between this route existing and not.

## Explicitly out of scope (per the brief)

Marketplace/multi-vendor features, vendor accounts, multiple concurrent
auctions/organisations, native mobile apps, proxy/automatic bidding, and
any infrastructure beyond what a single ~500-guest gala night needs.
