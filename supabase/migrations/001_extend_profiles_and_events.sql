-- ============================================================
-- Migration 001: Extend profiles and events for production
-- Future Times Events Platform
-- Run in Supabase SQL Editor
-- Created: 2026-07-20
-- ============================================================

-- ── SAFETY: Run in a transaction ────────────────────────────
BEGIN;

-- ── 1. Add phone and account_status to profiles ─────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'deleted'));

-- Expand role check constraint to include all platform roles
-- First drop the existing constraint, then recreate it
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('attendee', 'host', 'event_manager', 'admin', 'super_admin'));

-- Migrate old role values to new enum
UPDATE public.profiles SET role = 'attendee' WHERE role = 'user';
UPDATE public.profiles SET role = 'admin'    WHERE role = 'organizer';

-- ── 2. Extend events table ───────────────────────────────────

-- Add slug if missing (events already had it, ensure NOT NULL)
-- Add subtitle
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS subtitle TEXT DEFAULT NULL;

-- Add publication state (extends existing status field)
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_status_check
    CHECK (status IN ('draft', 'scheduled', 'published', 'sold_out', 'completed', 'cancelled', 'postponed', 'archived'));

-- Update existing status values
UPDATE public.events SET status = 'published' WHERE status = 'published';  -- no-op but safe

-- Add timezone column
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Africa/Harare';

-- Add starts_at / ends_at as proper timestamptz columns
-- These replace the old date + time columns while keeping them for backward compat
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS doors_open_at TIMESTAMPTZ DEFAULT NULL;

-- Backfill starts_at from existing date + time columns where not already set
UPDATE public.events
SET starts_at = (date::TEXT || 'T' || COALESCE(time::TEXT, '00:00:00') || '+02:00')::TIMESTAMPTZ
WHERE starts_at IS NULL AND date IS NOT NULL;

-- Add additional event fields
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS venue_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dress_code TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS age_guidance TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS event_rules TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seo_title TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seo_description TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS social_image_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ticket_claim_opens_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ticket_claim_closes_at TIMESTAMPTZ DEFAULT NULL;

-- ── 3. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_status       ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_starts_at    ON public.events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_slug         ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_role       ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles(lower(email));

COMMIT;
