# Event-night operator guide

## Roles

| Role | Responsibility |
|---|---|
| **Auction lead** | Owns go/no-go decisions: pausing, extending, early-closing, and any Stripe or refund action. Only person who should use "Pause all bidding" or "Close now" without checking with someone else first. |
| **Floor support (1–2 people)** | Helps guests register and bid on their phones. Watches `/admin` dashboard for stalled registrations or confused bidders. Cannot access `/admin` on the floor unless also an admin — otherwise relays issues to the auction lead. |
| **Tech support (remote or on-site)** | Owns `/admin/status`, Vercel/Supabase dashboards, DNS/Stripe if something needs a platform-level fix. First point of contact for anything in `docs/RECOVERY_GUIDE.md`. |

## Before doors open

1. Check `/admin/status` — database, Stripe, email should all show green.
2. Check `/admin` dashboard — registrations at zero (or expected pre-registrations), all items `open` with correct closing times.
3. Confirm `APP_ENV=production` in Vercel (not rehearsal).
4. Have this guide and `docs/RECOVERY_GUIDE.md` open on a phone/tablet.

## During the event

- **Registrations**: guests register themselves at `/register` on their own phones. Floor support can help by pointing a phone at the URL/QR code, not by registering on the guest's behalf unless asked (the mobile number and email must be the guest's own).
- **Bidding**: encourage guests to check `/my-bids` to see what they're winning/losing. The countdown on each item is server-time based — if a guest's phone clock looks wrong, that's expected and doesn't affect the real closing time.
- **Closing soon**: items send an automatic email ~15 minutes before close to anyone who has bid on them. In the final 2 minutes (default, configurable), a valid bid pushes the closing time out by 2 minutes — this is automatic and intentional (it stops a single last-second snipe from being unfair). Don't be alarmed if an item's closing time keeps moving during a bidding war.
- **Pausing bidding**: only the auction lead uses "Pause all bidding" on `/admin`, and only for a real reason (system issue, need to make an announcement about a specific item). It stops every item, immediately, everywhere. Always add a reason — it's recorded in the audit log. Resume as soon as the reason is resolved.
- **Closing an item early or late**: prefer letting the timer run. If an item genuinely must close early (e.g. donor needs to leave), use "Close now" on `/admin/items` — confirm with the auction lead first, since it is immediate and cannot be undone by reopening at the exact same state (see the accidental-early-closure recovery process in `docs/RECOVERY_GUIDE.md` if this happens by mistake).

## After the auction closes

1. Items close automatically at their closing time (checked every minute). Confirm on `/admin` that every item shows `closed` with a winner (or no winner if no bids).
2. Winners receive an email with a link to `/winner` to pay for everything they won in one Stripe Checkout session.
3. Watch `/admin/status` email counters — "pending" should drain to zero within a few minutes; "failed" should stay at zero. If not, see `docs/RECOVERY_GUIDE.md` → Email provider outage.
4. Floor support can help winners find and use the `/winner` payment page on their phone before they leave, if practical.

## Escalation

1. **Bidder can't register/sign in** → floor support checks they're using the right email and checking spam. If email genuinely isn't arriving, escalate to tech support (see Recovery Guide → Email outage).
2. **Bid rejected unexpectedly** → check the error message shown (it explains why — too low, item closed, bidding paused). If it looks like a bug, escalate to tech support with the item name and time.
3. **Payment fails** → normal and expected sometimes (declined card). The winner simply tries again from `/winner` — nothing is lost, they are not marked as paid until Stripe confirms. Escalate only if `/winner` itself is broken.
4. **Anything Stripe, refunds, or money-related** → auction lead + tech support only. Never guess; see `docs/RECOVERY_GUIDE.md`.
5. **Site down or clearly broken** → tech support checks `/api/health` and `/admin/status` first, then Vercel/Supabase status pages, then this repo's `docs/RECOVERY_GUIDE.md`.
