-- Migration 012: keep public profiles synchronized with Supabase Auth users
-- and grant the two named platform owners super-admin access.
--
-- Review and run manually in the Supabase SQL Editor. Never run automatically.
BEGIN;

CREATE OR REPLACE FUNCTION public.sync_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  profile_name TEXT;
  profile_email TEXT;
BEGIN
  profile_email := lower(COALESCE(NEW.email, ''));
  profile_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), ''),
    NULLIF(split_part(profile_email, '@', 1), ''),
    'User'
  );

  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    initials,
    role,
    account_status,
    updated_at
  )
  VALUES (
    NEW.id,
    profile_email,
    profile_name,
    upper(left(profile_name, 2)),
    CASE
      WHEN profile_email IN ('nigelmarara0@gmail.com', 'rodwelldenga@icloud.com')
        THEN 'super_admin'
      ELSE 'attendee'
    END,
    'active',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = CASE
      WHEN trim(public.profiles.display_name) = '' THEN EXCLUDED.display_name
      ELSE public.profiles.display_name
    END,
    initials = CASE
      WHEN trim(COALESCE(public.profiles.initials, '')) = '' THEN EXCLUDED.initials
      ELSE public.profiles.initials
    END,
    role = CASE
      WHEN EXCLUDED.email IN ('nigelmarara0@gmail.com', 'rodwelldenga@icloud.com')
        THEN 'super_admin'
      ELSE public.profiles.role
    END,
    account_status = CASE
      WHEN EXCLUDED.email IN ('nigelmarara0@gmail.com', 'rodwelldenga@icloud.com')
        THEN 'active'
      ELSE public.profiles.account_status
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_auth_user_profile() FROM PUBLIC;

DROP TRIGGER IF EXISTS sync_auth_user_profile_trigger ON auth.users;
CREATE TRIGGER sync_auth_user_profile_trigger
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_user_profile();

-- Backfill everyone who signed up before this trigger existed. Existing roles
-- are preserved, except for the two explicitly named super-admin accounts.
INSERT INTO public.profiles (
  id,
  email,
  display_name,
  initials,
  role,
  account_status,
  created_at,
  updated_at
)
SELECT
  auth_user.id,
  lower(COALESCE(auth_user.email, '')),
  COALESCE(
    NULLIF(trim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(trim(auth_user.raw_user_meta_data ->> 'name'), ''),
    NULLIF(split_part(lower(COALESCE(auth_user.email, '')), '@', 1), ''),
    'User'
  ),
  upper(left(COALESCE(
    NULLIF(trim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(trim(auth_user.raw_user_meta_data ->> 'name'), ''),
    NULLIF(split_part(lower(COALESCE(auth_user.email, '')), '@', 1), ''),
    'User'
  ), 2)),
  CASE
    WHEN lower(COALESCE(auth_user.email, '')) IN ('nigelmarara0@gmail.com', 'rodwelldenga@icloud.com')
      THEN 'super_admin'
    ELSE 'attendee'
  END,
  'active',
  COALESCE(auth_user.created_at, NOW()),
  NOW()
FROM auth.users AS auth_user
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = CASE
    WHEN EXCLUDED.email IN ('nigelmarara0@gmail.com', 'rodwelldenga@icloud.com')
      THEN 'super_admin'
    ELSE public.profiles.role
  END,
  account_status = CASE
    WHEN EXCLUDED.email IN ('nigelmarara0@gmail.com', 'rodwelldenga@icloud.com')
      THEN 'active'
    ELSE public.profiles.account_status
  END,
  updated_at = NOW();

COMMIT;

-- Verification after running:
-- SELECT id, email, display_name, role, account_status
-- FROM public.profiles
-- ORDER BY created_at DESC;
--
-- SELECT email, role, account_status
-- FROM public.profiles
-- WHERE lower(email) IN ('nigelmarara0@gmail.com', 'rodwelldenga@icloud.com');
