-- =========================================================================
-- Row Level Security. Default posture: no policy = no access. Writes to
-- items/bids/payments/audit_log go only through the SECURITY DEFINER
-- functions in 0003_functions.sql or through the service_role key (which
-- bypasses RLS entirely and is used only in trusted server code).
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.auction_settings enable row level security;
alter table public.items enable row level security;
alter table public.item_images enable row level security;
alter table public.bids enable row level security;
alter table public.payments enable row level security;
alter table public.payment_items enable row level security;
alter table public.webhook_events enable row level security;
alter table public.email_outbox enable row level security;
alter table public.audit_log enable row level security;

-- ---- profiles ----
-- A bidder may read their own profile; an admin may read all.
create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());
-- No client INSERT/UPDATE/DELETE policies: profile writes happen only via
-- the service-role registration route and admin server actions.

-- ---- auction_settings ----
-- Public/authenticated may read (needed to show pause banners, extension rules).
create policy auction_settings_select_all on public.auction_settings
  for select using (true);
-- Writes only via admin_set_bidding_paused() (SECURITY DEFINER) or service role.

-- ---- items ----
-- Anyone (including anonymous visitors browsing before sign-in) may see
-- non-draft items. Draft items are visible to admins only.
create policy items_select_public on public.items
  for select using (status <> 'draft' or public.is_admin());
-- No direct INSERT/UPDATE/DELETE policies for anon/authenticated: all
-- writes go through place_bid(), admin_set_item_status(), or service role.

-- Column-level privilege: never let a bidder read who is currently
-- winning directly off the items table. The catalogue/item pages select
-- an explicit column list that excludes current_bid_bidder_id; my_bids()
-- and is_current_leader-style checks go through the SECURITY DEFINER
-- functions instead, which compare against auth.uid() server-side.
revoke select (current_bid_bidder_id) on public.items from anon, authenticated;
grant select (
  id, title, short_description, full_description, donor_name,
  estimated_value_cents, opening_bid_cents, min_increment_cents,
  current_bid_cents, closing_time, status, display_order,
  extensions_enabled, extension_trigger_minutes, extension_minutes,
  winner_bidder_id, winning_bid_id, created_at, updated_at
) on public.items to anon, authenticated;

-- ---- item_images ----
create policy item_images_select_public on public.item_images
  for select using (
    exists (select 1 from public.items i where i.id = item_id and (i.status <> 'draft' or public.is_admin()))
  );

-- ---- bids ----
-- A bidder may read their own bid history. Nobody may read another
-- bidder's individual bids directly (aggregate current price comes from
-- items.current_bid_cents instead). Admins may read all for support/export.
create policy bids_select_own_or_admin on public.bids
  for select using (bidder_id = auth.uid() or public.is_admin());
-- No INSERT/UPDATE/DELETE policies: writes only via place_bid()/admin_void_bid().

-- ---- payments ----
create policy payments_select_own_or_admin on public.payments
  for select using (winner_bidder_id = auth.uid() or public.is_admin());

-- ---- payment_items ----
create policy payment_items_select_own_or_admin on public.payment_items
  for select using (
    exists (
      select 1 from public.payments p
      where p.id = payment_id and (p.winner_bidder_id = auth.uid() or public.is_admin())
    )
  );

-- ---- webhook_events ----
-- Server-side only (service role); no client policies at all.

-- ---- email_outbox ----
-- Admins may view for support/debugging; bidders never read this table.
create policy email_outbox_select_admin on public.email_outbox
  for select using (public.is_admin());

-- ---- audit_log ----
-- Append-only and admin-readable only. No update/delete policy exists for
-- any role, so the log cannot be altered even by a compromised admin
-- session without direct database access.
create policy audit_log_select_admin on public.audit_log
  for select using (public.is_admin());
