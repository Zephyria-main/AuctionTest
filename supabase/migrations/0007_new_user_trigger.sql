-- Creates a profile row automatically when a bidder completes Supabase Auth
-- sign-up (triggered by auth.signInWithOtp with shouldCreateUser: true).
-- Registration details (full name, mobile, consent) travel in user_metadata
-- set by src/app/api/register/route.ts and are copied into public.profiles
-- here, inside the same transaction as the auth.users insert.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_is_new boolean;
begin
  select not exists(select 1 from public.profiles where id = new.id) into v_is_new;

  insert into public.profiles (id, email, full_name, mobile, accepted_terms_at, accepted_privacy_at, marketing_consent)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Registered bidder'),
    coalesce(new.raw_user_meta_data->>'mobile', ''),
    case when (new.raw_user_meta_data->>'accepted_terms') = 'true' then now() else null end,
    case when (new.raw_user_meta_data->>'accepted_privacy') = 'true' then now() else null end,
    coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false)
  )
  on conflict (id) do nothing
  returning * into v_profile;

  if v_is_new and v_profile.id is not null then
    insert into public.email_outbox (template_key, recipient_bidder_id, dedupe_key, payload)
    values (
      'registration_confirmed',
      v_profile.id,
      'registration_confirmed:' || v_profile.id,
      jsonb_build_object('fullName', v_profile.full_name, 'bidderNumber', v_profile.bidder_number)
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

comment on function public.handle_new_auth_user() is
  'Populates public.profiles from auth.users metadata on first sign-up. Registration is rejected server-side (src/app/api/register/route.ts) unless accepted_terms and accepted_privacy are both true, so this trigger only records what was already validated.';
