# Deployment guide

Target stack: **Vercel** (hosting + cron) + **Supabase** (Postgres, Auth,
Storage, Realtime) + **Stripe** (Checkout + webhooks) + **Resend**
(transactional email). Three environments: **development**, **rehearsal**,
**production** — each with its own Supabase project and its own Vercel
environment variables. Never share a Supabase project or Stripe keys
between rehearsal and production.

Steps marked **[HUMAN ACTION REQUIRED]** cannot be done by this codebase or
by an agent — they need someone with DNS, Stripe Dashboard, or
organisational authority to act.

## 1. Environments

| Environment | Supabase project | Stripe mode | `APP_ENV` | Vercel target |
|---|---|---|---|---|
| Development | local (`supabase start`) or a shared dev project | test | `development` | Preview deployments |
| Rehearsal | dedicated Supabase project | test | `rehearsal` | a dedicated Vercel environment/branch, e.g. `rehearsal.<domain>` |
| Production | dedicated Supabase project | **live** | `production` | Production deployment on the real event domain |

**[HUMAN ACTION REQUIRED]** Create three separate Supabase projects (or at
minimum, separate rehearsal and production projects — do not rehearse
against production data). Free/small-tier Supabase projects are sufficient
for ~500 bidders and ~15 items.

## 2. Supabase setup (per environment)

1. Create the project.
2. Run the migrations: `supabase link --project-ref <ref>` then `supabase db push` (or apply the SQL files in `supabase/migrations/` in order via the SQL editor).
3. **Do not** run `supabase/seed.sql` against production — it inserts 15 clearly-labelled `[SAMPLE]` items. Use it for development/rehearsal only; production items are entered for real via `/admin/items`.
4. In Authentication settings: enable Email provider, disable "Confirm email" double-opt (bidders sign in via magic link/OTP, which is itself the confirmation), set the Site URL and Redirect URLs to the environment's real domain (`https://<domain>/auth/callback`).
5. **[HUMAN ACTION REQUIRED]** Configure custom SMTP (Settings → Auth → SMTP) to send Supabase's own auth emails (magic link/OTP) through Resend, using the same domain configured in section 4 below, so the sign-in email matches the auction's branding and sending domain rather than Supabase's shared sender.
6. Copy the Project URL, anon key and service role key into the environment's Vercel variables (never commit these).

## 3. Vercel setup

1. **[HUMAN ACTION REQUIRED]** Create the Vercel project from this repository.
2. Configure three sets of environment variables (Vercel → Settings → Environment Variables), one per environment scope (Production / Preview / a custom "Rehearsal" environment if using Vercel's environment branching, or a second Vercel project for rehearsal — either is fine, but keep the Supabase/Stripe/Resend credentials fully separate per environment).
3. `vercel.json` in this repo defines the cron schedule (item closing sweep + closing-soon warnings every minute/5 minutes, email outbox processor every minute). Vercel Cron calls these routes with `Authorization: Bearer $CRON_SECRET` automatically once `CRON_SECRET` is set as an environment variable — generate a long random value per environment.
4. **[HUMAN ACTION REQUIRED]** Point the environment's domain (see §5) at the Vercel deployment (Vercel → Domains).

## 4. Environment variable reference

Set every variable in `.env.example` for each environment. Notes on the
ones that need care:

| Variable | Notes |
|---|---|
| `APP_ENV` | `development` \| `rehearsal` \| `production`. Drives rehearsal email/payment guardrails and disables the test-only sign-in route in production. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Vercel "sensitive" env var. Never appears in any `NEXT_PUBLIC_*` variable or client bundle. |
| `STRIPE_SECRET_KEY` | `sk_test_...` for development/rehearsal, `sk_live_...` for production only. |
| `STRIPE_WEBHOOK_SECRET` | One per environment — see §6. |
| `EMAIL_FROM_ADDRESS`, `EMAIL_REPLY_TO_ADDRESS`, `ADMIN_NOTIFICATION_EMAIL` | Set per environment. Rehearsal should use addresses that make it obvious they're not production, e.g. `auction-rehearsal@...`. |
| `REHEARSAL_EMAIL_OVERRIDE` | **Required** whenever `APP_ENV=rehearsal`. All rehearsal email is redirected here regardless of the real bidder's address. |
| `CRON_SECRET` | Long random value; must match what Vercel Cron sends. |

## 5. DNS — auction website

**[HUMAN ACTION REQUIRED]** — whoever controls the domain registrar/DNS
must add these records. This app does not and cannot change DNS itself.

For a temporary auction domain (e.g. `auction.abcf.org.au` or a
purpose-registered domain):

| Type | Host | Value | Purpose |
|---|---|---|---|
| CNAME | `auction` (or the chosen subdomain) | `cname.vercel-dns.com` | Points the auction site at Vercel |
| — or — A/ALIAS at apex | `@` | Vercel's provided apex IP/ALIAS target (Vercel shows the exact value once the domain is added in the dashboard) | If using an apex domain instead of a subdomain |

Vercel issues and renews the TLS certificate automatically once DNS
resolves — no separate certificate step is required.

### Domain longevity (90-day requirement)

Winners need to reach receipts and support for at least 90 days after the
event. **[HUMAN ACTION REQUIRED — confirm before the event, not after]**:

- Confirm the domain/subdomain registration will not lapse within 90 days of the event date.
- Keep the Vercel project and its production deployment live (do not delete the project) for at least 90 days post-event.
- Keep the production Supabase project active (not paused/deleted) for the same period, since receipts and payment status are read from it.
- If the auction domain is temporary and will be retired, plan a redirect or a static "thank you / contact support" page to replace the app after the 90-day window, rather than letting the domain 404. See `docs/RECOVERY_GUIDE.md` post-auction checklist.

## 6. Stripe

1. **[HUMAN ACTION REQUIRED]** Create/confirm the Stripe account for the Australian Brain Cancer Foundation. Use test mode keys for development/rehearsal, live mode keys for production only, once Stripe account activation (business details, bank account) is complete.
2. Add a webhook endpoint per environment: Stripe Dashboard → Developers → Webhooks → Add endpoint.
   - URL: `https://<environment-domain>/api/stripe/webhook`
   - Events to send: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`.
   - Copy the endpoint's **Signing secret** into `STRIPE_WEBHOOK_SECRET` for that environment.
3. **Verifying the webhook is correctly configured**:
   - In the Stripe Dashboard, open the webhook endpoint and click "Send test webhook" for `checkout.session.completed`. Confirm it shows a `200` response and check `/admin/status` (admin-only) shows the email/database integrations healthy.
   - Locally/in CI, use the Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`, then `stripe trigger checkout.session.completed`. The CLI's own signing secret goes into `.env.local`'s `STRIPE_WEBHOOK_SECRET` while `stripe listen` is running.
   - Confirm signature verification actually rejects bad requests: `curl -X POST https://<domain>/api/stripe/webhook -d '{}'` (no `stripe-signature` header) must return `400`/`500`, never `200`.
   - Confirm idempotency: resend the same test event twice from the Dashboard's webhook event log ("Resend"). The second delivery must return success without creating a second payment record — check `tests/integration/webhook_idempotency.test.ts` and the `webhook_events` table.
4. **[HUMAN ACTION REQUIRED]** Have an ABCF-authorised person review and approve the live Stripe account's payout bank details, statement descriptor, and business details before the event (see `docs/LAUNCH_CHECKLIST.md`).

## 7. Resend (email) + DNS for transactional email

1. **[HUMAN ACTION REQUIRED]** Create a Resend account, add the sending domain (the same domain the auction site uses, or a subdomain like `mail.auction.abcf.org.au`), and add the DNS records Resend's dashboard generates for that domain.
2. **[HUMAN ACTION REQUIRED — DNS]** Add these record types (Resend's dashboard shows the exact values for your domain; do not guess the values):

   - **SPF**: a `TXT` record on the sending domain authorising Resend's mail servers, e.g. `v=spf1 include:spf.resend.com ~all` (if another SPF record already exists for the domain, merge into ONE record — multiple SPF TXT records break validation).
   - **DKIM**: one or more `CNAME`/`TXT` records (Resend provides the exact selector and value) that let receiving mail servers verify Resend's cryptographic signature on outgoing mail.
   - **DMARC**: a `TXT` record at `_dmarc.<sending domain>`, e.g. `v=DMARC1; p=quarantine; rua=mailto:<address that receives DMARC reports>; pct=100`. Start at `p=quarantine` (not `p=reject`) until SPF/DKIM alignment is confirmed working, then consider tightening.
3. Verify domain status shows "Verified" in the Resend dashboard before sending any real bidder email.
4. Set `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_REPLY_TO_ADDRESS`, `ADMIN_NOTIFICATION_EMAIL` per environment.
5. Send a real test email through `/admin/status` (or trigger `/api/cron/process-outbox` after registering a test account) and confirm it lands in the inbox, not spam, before rehearsal.

## 8. Confirming no secret is committed

- `.gitignore` excludes `.env`, `.env.local`, `.env.*.local` and `.vercel`.
- `.env.example` contains variable **names only** — every value is blank or a `[PLACEHOLDER]`.
- Search before every release: `git grep -nE "sk_(test|live)_|SUPABASE_SERVICE_ROLE|re_[A-Za-z0-9]{20,}"` across the repo should return nothing outside `.env.example`'s empty placeholders and documentation prose.
- **[HUMAN ACTION REQUIRED]** Run GitHub's secret scanning (or `mcp__github__run_secret_scanning` if available in your tooling) on the repository before each deployment and resolve any alert before proceeding.

## 9. Cron verification

After deploying, confirm in Vercel → Project → Cron Jobs that all three
jobs from `vercel.json` show recent successful runs. Manually trigger one
to verify auth:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/process-outbox
```
