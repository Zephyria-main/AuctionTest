-- Bidder number sequence: human-friendly numbers starting at 1001.
create sequence if not exists public.bidder_number_seq start with 1001 increment by 1;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'bidder' check (role in ('bidder', 'admin')),
  bidder_number integer unique not null default nextval('public.bidder_number_seq'),
  full_name text not null,
  email text not null,
  mobile text not null,
  accepted_terms_at timestamptz,
  accepted_privacy_at timestamptz,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.profiles is 'One row per registered person (bidder or admin). Keyed to auth.users.';
comment on column public.profiles.marketing_consent is
  'Separate, explicit opt-in. Auction registration must never imply marketing consent.';

create unique index profiles_email_lower_idx on public.profiles (lower(email));

create table public.auction_settings (
  id boolean primary key default true check (id),
  auction_opens_at timestamptz,
  auction_closes_at timestamptz,
  extensions_enabled boolean not null default true,
  extension_trigger_minutes integer not null default 2,
  extension_minutes integer not null default 2,
  bidding_paused boolean not null default false,
  paused_at timestamptz,
  paused_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
comment on table public.auction_settings is 'Singleton row (id is always true) holding global auction configuration.';
insert into public.auction_settings (id) values (true);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_description text not null,
  full_description text not null,
  donor_name text not null,
  estimated_value_cents integer not null check (estimated_value_cents >= 0),
  opening_bid_cents integer not null check (opening_bid_cents > 0),
  min_increment_cents integer not null check (min_increment_cents > 0),
  current_bid_cents integer check (current_bid_cents is null or current_bid_cents > 0),
  current_bid_bidder_id uuid references public.profiles(id),
  closing_time timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'open', 'paused', 'closed')),
  display_order integer not null default 0,
  extensions_enabled boolean, -- null = inherit auction_settings
  extension_trigger_minutes integer,
  extension_minutes integer,
  winner_bidder_id uuid references public.profiles(id),
  winning_bid_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.items is 'Auction catalogue items. Money stored as integer AUD cents.';

create table public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  bidder_id uuid not null references public.profiles(id),
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id),
  void_reason text
);
comment on table public.bids is
  'Append-only. Bids are never edited or deleted; an admin void annotates the row without removing it.';

create index bids_item_id_created_at_idx on public.bids (item_id, created_at desc);
create index bids_bidder_id_idx on public.bids (bidder_id);

alter table public.items
  add constraint items_winning_bid_fk foreign key (winning_bid_id) references public.bids(id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  winner_bidder_id uuid not null references public.profiles(id),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded', 'offline_paid')),
  amount_cents integer not null check (amount_cents >= 0),
  is_rehearsal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_items (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  item_id uuid not null references public.items(id),
  amount_cents integer not null check (amount_cents > 0)
);
create index payment_items_payment_id_idx on public.payment_items (payment_id);
create unique index payment_items_item_id_active_idx on public.payment_items (item_id);

create table public.webhook_events (
  id text primary key, -- Stripe event id; used for idempotency via PK conflict
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb
);
comment on table public.webhook_events is 'Every processed Stripe webhook event id, for idempotent handling of retried/duplicate deliveries.';

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  recipient_bidder_id uuid not null references public.profiles(id),
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
comment on table public.email_outbox is
  'Emails are enqueued here (outside the bidding transaction) and sent by a cron-triggered processor. dedupe_key prevents duplicate sends when enqueue or processing is retried.';
create index email_outbox_status_idx on public.email_outbox (status, created_at) where status = 'pending';

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
comment on table public.audit_log is 'Append-only administrator action log. No update/delete policies are granted to any role.';
create index audit_log_created_at_idx on public.audit_log (created_at desc);
