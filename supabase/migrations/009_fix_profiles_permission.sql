-- ============================================================
-- Migration 009: Fix "permission denied for table profiles"
-- Allows new/unauthenticated users to view events without
-- requiring a profile row to exist.
-- ============================================================

BEGIN;

-- ── Fix get_my_role to handle missing profiles gracefully ──
-- When a new user signs up but the profile trigger hasn't
-- created their profile row yet, this returns 'anonymous'
-- instead of erroring out.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'anonymous'
  );
$$;

-- ── Fix profiles RLS: allow reading profiles for all ───────
-- The previous policy required account_status = 'active',
-- which blocked new users who don't have a profile yet.
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_public_read" ON public.profiles
  FOR SELECT
  USING (TRUE);

-- ── Ensure events public read policy is correct ────────────
DROP POLICY IF EXISTS "events_public_read" ON public.events;
CREATE POLICY "events_public_read" ON public.events
  FOR SELECT
  USING (status IN ('published', 'sold_out', 'completed'));

COMMIT;
