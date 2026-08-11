-- Extensions
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- Helper: is the current JWT an admin?
-- Declared before RLS policies so it can be referenced by them.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'True if the currently authenticated user is an auction administrator. SECURITY DEFINER so it can read profiles regardless of the caller''s own RLS visibility.';
