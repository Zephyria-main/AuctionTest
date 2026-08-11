-- =========================================================================
-- place_bid: the single, atomic entry point for placing a bid.
-- SECURITY DEFINER so it can write to items/bids despite the tables having
-- no direct INSERT/UPDATE grants for bidders (see 0004_rls.sql) — every
-- business rule is enforced inside this function, not trusted from the
-- client. Bidder identity is taken from auth.uid(), never from a parameter.
-- =========================================================================
create or replace function public.place_bid(p_item_id uuid, p_amount_cents integer)
returns table (
  bid_id uuid,
  item_id uuid,
  item_title text,
  amount_cents integer,
  new_closing_time timestamptz,
  was_extended boolean,
  previous_bidder_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bidder_id uuid := auth.uid();
  v_item public.items%rowtype;
  v_settings public.auction_settings%rowtype;
  v_min_acceptable integer;
  v_now timestamptz := now();
  v_new_closing timestamptz;
  v_extensions_enabled boolean;
  v_extension_trigger_minutes integer;
  v_extension_minutes integer;
  v_bid_id uuid;
begin
  if v_bidder_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = '22023';
  end if;

  select * into v_settings from public.auction_settings where id = true;

  if v_settings.bidding_paused then
    raise exception 'BIDDING_PAUSED' using errcode = 'P0001';
  end if;

  -- Lock the item row: this is what makes concurrent bids on the same
  -- item safe. Every other transaction calling place_bid for this item
  -- blocks here until this one commits or rolls back, so two bids can
  -- never both be accepted as "the" winning bid at the same time.
  select * into v_item from public.items where id = p_item_id for update;

  if not found then
    raise exception 'ITEM_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_item.status = 'paused' then
    raise exception 'ITEM_PAUSED' using errcode = 'P0003';
  end if;

  if v_item.status <> 'open' then
    raise exception 'ITEM_NOT_OPEN' using errcode = 'P0004';
  end if;

  -- Authoritative closing check uses the database clock, not client input.
  if v_item.closing_time <= v_now then
    update public.items set status = 'closed', updated_at = v_now where id = p_item_id;
    raise exception 'ITEM_CLOSED' using errcode = 'P0005';
  end if;

  if v_item.current_bid_cents is null then
    v_min_acceptable := v_item.opening_bid_cents;
  else
    v_min_acceptable := v_item.current_bid_cents + v_item.min_increment_cents;
  end if;

  if p_amount_cents < v_min_acceptable then
    raise exception 'BID_TOO_LOW:%', v_min_acceptable using errcode = 'P0006';
  end if;

  insert into public.bids (item_id, bidder_id, amount_cents)
  values (p_item_id, v_bidder_id, p_amount_cents)
  returning id into v_bid_id;

  v_extensions_enabled := coalesce(v_item.extensions_enabled, v_settings.extensions_enabled);
  v_extension_trigger_minutes := coalesce(v_item.extension_trigger_minutes, v_settings.extension_trigger_minutes);
  v_extension_minutes := coalesce(v_item.extension_minutes, v_settings.extension_minutes);
  v_new_closing := v_item.closing_time;

  if v_extensions_enabled
     and v_item.closing_time - v_now <= make_interval(mins => v_extension_trigger_minutes) then
    v_new_closing := greatest(v_item.closing_time, v_now + make_interval(mins => v_extension_minutes));
  end if;

  update public.items
  set current_bid_cents = p_amount_cents,
      current_bid_bidder_id = v_bidder_id,
      closing_time = v_new_closing,
      updated_at = v_now
  where id = p_item_id;

  return query select
    v_bid_id,
    p_item_id,
    v_item.title,
    p_amount_cents,
    v_new_closing,
    (v_new_closing > v_item.closing_time),
    v_item.current_bid_bidder_id; -- the leader *before* this bid (null if first bid)
end;
$$;

comment on function public.place_bid(uuid, integer) is
  'Atomically validates and records a bid: locks the item row, checks pause/open/closing-time state, computes the minimum acceptable bid server-side, inserts the bid, applies closing-extension rules, and updates the item — all in one transaction.';

revoke all on function public.place_bid(uuid, integer) from public;
grant execute on function public.place_bid(uuid, integer) to authenticated;

-- =========================================================================
-- close_expired_items: called by the cron route to sweep any items whose
-- closing_time has passed while still 'open', determining the winner from
-- the item's own current_bid_bidder_id/current_bid_cents (already the
-- authoritative highest accepted bid). Returns the set of items it closed
-- so the caller can enqueue winner emails and build payment summaries.
-- =========================================================================
create or replace function public.close_expired_items()
returns setof public.items
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
begin
  return query
  with closed as (
    update public.items
    set status = 'closed',
        winner_bidder_id = current_bid_bidder_id,
        winning_bid_id = (
          select b.id from public.bids b
          where b.item_id = items.id and b.voided_at is null
          order by b.amount_cents desc, b.created_at asc
          limit 1
        ),
        updated_at = v_now
    where status = 'open' and closing_time <= v_now
    returning *
  )
  select * from closed;
end;
$$;

revoke all on function public.close_expired_items() from public;
grant execute on function public.close_expired_items() to service_role;

-- =========================================================================
-- my_bids: lets an authenticated bidder see items they've bid on and
-- whether they're currently leading, without exposing any other bidder's
-- identity (current_bid_bidder_id itself is never selectable directly —
-- see column privilege revokes in 0004_rls.sql).
-- =========================================================================
create or replace function public.my_bids()
returns table (
  item_id uuid,
  item_title text,
  my_highest_bid_cents integer,
  current_bid_cents integer,
  is_leading boolean,
  item_status text,
  closing_time timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    i.id,
    i.title,
    max(b.amount_cents) filter (where b.voided_at is null) as my_highest_bid_cents,
    i.current_bid_cents,
    (i.current_bid_bidder_id = auth.uid()) as is_leading,
    i.status,
    i.closing_time
  from public.bids b
  join public.items i on i.id = b.item_id
  where b.bidder_id = auth.uid()
  group by i.id, i.title, i.current_bid_cents, i.current_bid_bidder_id, i.status, i.closing_time
  order by i.closing_time asc;
$$;

revoke all on function public.my_bids() from public;
grant execute on function public.my_bids() to authenticated;

-- =========================================================================
-- Admin actions: pause/resume bidding, set item status, void a bid.
-- Each writes an audit_log row in the same transaction as the change.
-- =========================================================================
create or replace function public.admin_set_bidding_paused(p_paused boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;

  update public.auction_settings
  set bidding_paused = p_paused,
      paused_at = case when p_paused then now() else null end,
      paused_by = case when p_paused then v_admin else null end,
      updated_at = now()
  where id = true;

  insert into public.audit_log (actor_id, action, target_type, reason, metadata)
  values (v_admin, case when p_paused then 'bidding_paused' else 'bidding_resumed' end, 'auction_settings', p_reason, '{}'::jsonb);
end;
$$;
revoke all on function public.admin_set_bidding_paused(boolean, text) from public;
grant execute on function public.admin_set_bidding_paused(boolean, text) to authenticated;

create or replace function public.admin_set_item_status(p_item_id uuid, p_status text, p_reason text default null)
returns public.items
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := auth.uid();
  v_item public.items%rowtype;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;
  if p_status not in ('draft', 'open', 'paused', 'closed') then
    raise exception 'INVALID_STATUS' using errcode = '22023';
  end if;

  update public.items
  set status = p_status, updated_at = now()
  where id = p_item_id
  returning * into v_item;

  if not found then
    raise exception 'ITEM_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.audit_log (actor_id, action, target_type, target_id, reason, metadata)
  values (v_admin, 'item_status_changed', 'item', p_item_id, p_reason, jsonb_build_object('new_status', p_status));

  return v_item;
end;
$$;
revoke all on function public.admin_set_item_status(uuid, text, text) from public;
grant execute on function public.admin_set_item_status(uuid, text, text) to authenticated;

create or replace function public.admin_void_bid(p_bid_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := auth.uid();
  v_bid public.bids%rowtype;
  v_new_top public.bids%rowtype;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'REASON_REQUIRED' using errcode = '22023';
  end if;

  select * into v_bid from public.bids where id = p_bid_id for update;
  if not found then
    raise exception 'BID_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_bid.voided_at is not null then
    raise exception 'BID_ALREADY_VOID' using errcode = 'P0002';
  end if;

  -- Retain the original bid row; annotate it rather than deleting/editing amount_cents.
  update public.bids
  set voided_at = now(), voided_by = v_admin, void_reason = p_reason
  where id = p_bid_id;

  -- Recompute the item's current leader from remaining, non-void bids.
  select * into v_new_top from public.bids
  where item_id = v_bid.item_id and voided_at is null
  order by amount_cents desc, created_at asc
  limit 1;

  update public.items
  set current_bid_cents = v_new_top.amount_cents,
      current_bid_bidder_id = v_new_top.bidder_id,
      updated_at = now()
  where id = v_bid.item_id;

  insert into public.audit_log (actor_id, action, target_type, target_id, reason, metadata)
  values (v_admin, 'bid_voided', 'bid', p_bid_id, p_reason, jsonb_build_object('item_id', v_bid.item_id, 'amount_cents', v_bid.amount_cents));
end;
$$;
revoke all on function public.admin_void_bid(uuid, text) from public;
grant execute on function public.admin_void_bid(uuid, text) to authenticated;

-- Server time endpoint support: lets clients calibrate a clock-skew offset.
create or replace function public.server_now()
returns timestamptz
language sql
stable
as $$ select now(); $$;
grant execute on function public.server_now() to anon, authenticated;
