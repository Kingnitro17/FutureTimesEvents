-- ============================================================
-- Migration 007: Restore organizer identity + public event reads
-- Future Times Events
--
-- IMPORTANT:
--   1. Review this file in full before running it.
--   2. Run it manually in the Supabase SQL Editor.
--   3. Run migration 006 first.
--
-- This migration keeps the profiles table private, exposes only the signed-in
-- user's own profile through a narrow RPC, restores explicit Data API grants
-- for public event-detail content, and reconnects the Liquid Lounge organizer
-- assignment to the authoritative auth.users UUID.
-- ============================================================

BEGIN;

SET LOCAL lock_timeout = '15s';
SET LOCAL statement_timeout = '120s';
SET LOCAL search_path = public, extensions, pg_catalog;

-- Ensure platform event-content tables exist. Historical migration 003 may not
-- have been run on this project, so create any missing tables defensively.
CREATE TABLE IF NOT EXISTS public.event_faqs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_sponsors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  logo_url    TEXT DEFAULT NULL,
  website_url TEXT DEFAULT NULL,
  tier        TEXT NOT NULL DEFAULT 'partner'
    CHECK (tier IN ('title', 'gold', 'silver', 'bronze', 'partner')),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_schedule_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT DEFAULT NULL,
  performer    TEXT DEFAULT NULL,
  starts_at    TIMESTAMPTZ NOT NULL,
  ends_at      TIMESTAMPTZ DEFAULT NULL,
  stage        TEXT DEFAULT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.event_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_schedule_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL
     OR to_regclass('public.events') IS NULL
     OR to_regclass('public.event_staff') IS NULL THEN
    RAISE EXCEPTION
      'Migration 007 requires migration 006 and the core tables (profiles, events, event_staff).';
  END IF;
END;
$$;

-- Return only the current authenticated user's profile. The caller cannot
-- supply a user ID, so this function cannot be used as a profile directory.
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'display_name', p.display_name,
    'email', p.email,
    'phone', p.phone,
    'avatar_url', p.avatar_url,
    'avatar_color', p.avatar_color,
    'initials', p.initials,
    'bio', p.bio,
    'location', p.location,
    'loyalty_points', p.loyalty_points,
    'is_vip', p.is_vip,
    'role', p.role,
    'account_status', p.account_status,
    'total_spent', p.total_spent,
    'events_attended', p.events_attended,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  )
  FROM public.profiles AS p
  WHERE p.id = auth.uid();
$$;

REVOKE ALL PRIVILEGES ON FUNCTION public.get_my_profile()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile()
  TO authenticated, service_role;

-- Keep the existing role helper safe for all RLS policies that depend on it.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT p.role
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
    AND p.account_status = 'active';
$$;

REVOKE ALL PRIVILEGES ON FUNCTION public.get_my_role()
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role()
  TO anon, authenticated, service_role;

-- Normal users can read and maintain only their own profile. Protected role,
-- status, and email changes remain blocked by migration 006's trigger and
-- column-level UPDATE grant.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_own_read" ON public.profiles;
CREATE POLICY "profiles_own_read"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_own_insert" ON public.profiles;
CREATE POLICY "profiles_own_insert"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    AND role = 'attendee'
    AND account_status = 'active'
  );

DROP POLICY IF EXISTS "profiles_own_update" ON public.profiles;
CREATE POLICY "profiles_own_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT (
  id, email, display_name, avatar_url, avatar_color, initials, bio,
  location, phone, role, account_status
) ON public.profiles TO authenticated;
GRANT UPDATE (
  display_name, avatar_url, avatar_color, initials, bio, location, phone
) ON public.profiles TO authenticated;

-- Make event visibility match the statuses rendered by the public event page.
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "events_public_read" ON public.events;
CREATE POLICY "events_public_read"
  ON public.events
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'sold_out', 'completed', 'postponed'));

DROP POLICY IF EXISTS "events_manager_own_read" ON public.events;
CREATE POLICY "events_manager_own_read"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_platform_admin()
    OR (
      public.get_my_role() = 'event_manager'
      AND (
        organizer_id = auth.uid()
        OR created_by = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.event_staff AS staff
          WHERE staff.event_id = events.id
            AND staff.user_id = auth.uid()
            AND staff.role = 'event_manager'
            AND staff.is_active = TRUE
        )
      )
    )
  );

GRANT SELECT ON public.events TO anon, authenticated;

-- These tables had public RLS policies but no explicit Data API grants. A
-- denied optional embed caused the whole event query to be reported as 404.
ALTER TABLE public.event_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_schedule_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_faqs_public_read" ON public.event_faqs;
CREATE POLICY "event_faqs_public_read"
  ON public.event_faqs
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "event_sponsors_public_read" ON public.event_sponsors;
CREATE POLICY "event_sponsors_public_read"
  ON public.event_sponsors
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "event_schedule_public_read"
  ON public.event_schedule_items;
CREATE POLICY "event_schedule_public_read"
  ON public.event_schedule_items
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

GRANT SELECT ON public.event_faqs, public.event_sponsors,
  public.event_schedule_items TO anon, authenticated;
GRANT ALL ON public.event_faqs, public.event_sponsors,
  public.event_schedule_items TO service_role;

-- Recover the exact login identity, not an arbitrary public.profiles row that
-- happens to share the email address.
ALTER TABLE public.event_staff
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'host',
  ADD COLUMN IF NOT EXISTS gate TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.profiles(id)
    ON DELETE SET NULL;

DO $$
DECLARE
  v_organizer_id UUID;
  v_organizer_email TEXT;
  v_organizer_name TEXT;
  v_event_id UUID;
BEGIN
  SELECT
    auth_user.id,
    lower(auth_user.email),
    COALESCE(
      NULLIF(auth_user.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(auth_user.raw_user_meta_data ->> 'name', ''),
      'Liquid Lounge'
    )
  INTO
    v_organizer_id,
    v_organizer_email,
    v_organizer_name
  FROM auth.users AS auth_user
  WHERE lower(auth_user.email) = 'liquidlounge216@gmail.com'
  ORDER BY auth_user.created_at
  LIMIT 1;

  IF v_organizer_id IS NULL THEN
    RAISE EXCEPTION
      'No Supabase Auth user exists for liquidlounge216@gmail.com. Sign in or create that account before migration 007.';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    initials,
    role,
    account_status
  ) VALUES (
    v_organizer_id,
    v_organizer_email,
    v_organizer_name,
    upper(left(v_organizer_name, 2)),
    'attendee',
    'active'
  )
  ON CONFLICT (id)
  DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(
      NULLIF(public.profiles.display_name, ''),
      EXCLUDED.display_name
    ),
    updated_at = NOW();

  -- This explicit update runs after the signup-safety trigger has guaranteed
  -- that a newly inserted profile started least-privileged.
  UPDATE public.profiles
  SET role = 'event_manager',
      account_status = 'active',
      updated_at = NOW()
  WHERE id = v_organizer_id;

  SELECT event_row.id
  INTO v_event_id
  FROM public.events AS event_row
  WHERE event_row.slug = 'alick-macheso-peter-moyo-live'
  ORDER BY event_row.created_at
  LIMIT 1
  FOR UPDATE;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION
      'The Liquid Lounge event slug alick-macheso-peter-moyo-live does not exist.';
  END IF;

  UPDATE public.events
  SET organizer_id = v_organizer_id,
      created_by = v_organizer_id,
      organizer_name = 'Liquid Lounge',
      updated_at = NOW()
  WHERE id = v_event_id;

  UPDATE public.event_staff
  SET role = 'event_manager',
      gate = COALESCE(NULLIF(gate, ''), 'Main Gate'),
      is_active = TRUE,
      assigned_by = v_organizer_id
  WHERE event_id = v_event_id
    AND user_id = v_organizer_id;

  IF NOT FOUND THEN
    INSERT INTO public.event_staff (
      event_id,
      user_id,
      role,
      gate,
      is_active,
      assigned_by
    ) VALUES (
      v_event_id,
      v_organizer_id,
      'event_manager',
      'Main Gate',
      TRUE,
      v_organizer_id
    );
  END IF;
END;
$$;

COMMIT;

-- Verification (run manually after COMMIT):
-- SELECT public.get_my_profile(); -- run while signed in through the app/API
-- SELECT p.id, p.email, p.role, p.account_status
-- FROM public.profiles AS p
-- WHERE p.id = (
--   SELECT id FROM auth.users
--   WHERE lower(email) = 'liquidlounge216@gmail.com'
--   LIMIT 1
-- );
-- SELECT e.id, e.slug, e.status, e.organizer_id, es.role, es.is_active
-- FROM public.events AS e
-- JOIN public.event_staff AS es ON es.event_id = e.id
-- WHERE e.slug = 'alick-macheso-peter-moyo-live';
