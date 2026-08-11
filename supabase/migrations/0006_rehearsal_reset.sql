-- =========================================================================
-- reset_rehearsal_data: removes rehearsal bidders/bids/payments/emails
-- while retaining item configuration, ready for production go-live.
-- Refuses to run unless the caller explicitly confirms and the app is not
-- pointed at production data (checked again in scripts/reset-rehearsal-data.ts
-- at the application layer — this function is the safe, auditable core).
-- Only removes bidders with role='bidder' whose email matches the
-- configured rehearsal test-data pattern, never admin accounts.
-- =========================================================================
create or replace function public.reset_rehearsal_data(p_email_pattern text)
returns table (deleted_bidders integer, deleted_bids integer, deleted_payments integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := auth.uid();
  v_bidder_ids uuid[];
  v_deleted_bids integer;
  v_deleted_payments integer;
  v_deleted_bidders integer;
begin
  -- Callable by a signed-in admin OR by the trusted service-role key (the
  -- CLI reset script authenticates with the service role, which has no
  -- auth.uid() to check against is_admin()).
  if not (public.is_admin() or session_user = 'service_role') then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;
  if p_email_pattern is null or length(trim(p_email_pattern)) = 0 then
    raise exception 'PATTERN_REQUIRED' using errcode = '22023';
  end if;

  select array_agg(id) into v_bidder_ids
  from public.profiles
  where role = 'bidder' and email ilike p_email_pattern;

  delete from public.payment_items where payment_id in (
    select id from public.payments where winner_bidder_id = any(v_bidder_ids)
  );
  delete from public.payments where winner_bidder_id = any(v_bidder_ids);
  get diagnostics v_deleted_payments = row_count;

  delete from public.email_outbox where recipient_bidder_id = any(v_bidder_ids);

  update public.items
  set current_bid_cents = null, current_bid_bidder_id = null,
      winner_bidder_id = null, winning_bid_id = null
  where current_bid_bidder_id = any(v_bidder_ids) or winner_bidder_id = any(v_bidder_ids);

  delete from public.bids where bidder_id = any(v_bidder_ids);
  get diagnostics v_deleted_bids = row_count;

  delete from public.profiles where id = any(v_bidder_ids);
  get diagnostics v_deleted_bidders = row_count;

  insert into public.audit_log (actor_id, action, target_type, reason, metadata)
  values (v_admin, 'rehearsal_data_reset', 'profiles', 'Pre-production rehearsal data reset',
          jsonb_build_object('email_pattern', p_email_pattern, 'deleted_bidders', v_deleted_bidders));

  return query select v_deleted_bidders, v_deleted_bids, v_deleted_payments;
end;
$$;
revoke all on function public.reset_rehearsal_data(text) from public;
grant execute on function public.reset_rehearsal_data(text) to authenticated, service_role;

comment on function public.reset_rehearsal_data(text) is
  'Deletes bidders/bids/payments/outbox rows matching an email pattern (e.g. %@rehearsal.test) and clears item bid state, while leaving items/images/settings intact. auth.users rows for those bidders must be deleted separately with the service role (see scripts/reset-rehearsal-data.ts) since auth schema is not writable from this function.';
