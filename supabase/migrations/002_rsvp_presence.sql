-- migrations/002_rsvp_presence.sql
-- FutureTimesEvents — RSVP & Presence Feature Migration
-- Idempotent: safe to run multiple times.
-- Compatible with Supabase Postgres 15+.
-- ============================================================

-- ============================================================
-- 1. rsvps table
--    Core RSVP record. One row per (event, user) pair.
--    Uses UPSERT via ON CONFLICT in API layer.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rsvps (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID        NOT NULL REFERENCES public.events(id)    ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'going'
                            CHECK (status IN ('going', 'interested', 'not_going')),
  -- Phone for WhatsApp/SMS fallback (Zimbabwe +263 prefix)
  phone         TEXT,
  phone_verified BOOLEAN    NOT NULL DEFAULT FALSE,
  -- Optimistic-concurrency version counter
  version       INTEGER     NOT NULL DEFAULT 1,
  -- Idempotency key supplied by client to prevent double-submits
  idempotency_key TEXT      UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_rsvp_event_user UNIQUE (event_id, user_id)
);

COMMENT ON TABLE public.rsvps IS
  'One RSVP per (event, user). status going|interested|not_going. '
  'phone_verified required before WhatsApp notifications fire.';

-- ============================================================
-- 2. event_attendee_snapshots table
--    Pre-aggregated "Who''s Going" snapshot per event.
--    Updated by background worker; avoids COUNT(*) on hot path.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_attendee_snapshots (
  event_id         UUID        PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  going_count      INTEGER     NOT NULL DEFAULT 0,
  interested_count INTEGER     NOT NULL DEFAULT 0,
  -- JSONB array of { user_id, display_name, avatar_url, avatar_color, initials }
  -- stores up to 12 most-recent "going" attendees for avatar display
  preview_attendees JSONB      NOT NULL DEFAULT '[]',
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.event_attendee_snapshots IS
  'Pre-aggregated attendee counts + avatar preview per event. '
  'Updated by worker on every RSVP write, or via recompute_attendee_snapshot() RPC.';

-- ============================================================
-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_rsvps_event_status
  ON public.rsvps (event_id, status);

CREATE INDEX IF NOT EXISTS idx_rsvps_user
  ON public.rsvps (user_id);

CREATE INDEX IF NOT EXISTS idx_rsvps_updated
  ON public.rsvps (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_rsvps_phone
  ON public.rsvps (phone)
  WHERE phone IS NOT NULL;

-- ============================================================
-- 4. updated_at trigger (reuse or create helper)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rsvps_updated_at ON public.rsvps;
CREATE TRIGGER trg_rsvps_updated_at
  BEFORE UPDATE ON public.rsvps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. Snapshot recompute RPC
--    Called by worker or via cron; fully idempotent.
--    Tradeoff: runs inside a transaction — fine for <10k attendees.
--    For >100k, switch to incremental counter approach.
-- ============================================================
CREATE OR REPLACE FUNCTION public.recompute_attendee_snapshot(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER  -- runs as owner, bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_going      INTEGER;
  v_interested INTEGER;
  v_preview    JSONB;
BEGIN
  -- Count totals
  SELECT
    COUNT(*) FILTER (WHERE status = 'going'),
    COUNT(*) FILTER (WHERE status = 'interested')
  INTO v_going, v_interested
  FROM public.rsvps
  WHERE event_id = p_event_id;

  -- Build preview array: 12 most recent "going" with profile data
  SELECT COALESCE(jsonb_agg(sub ORDER BY sub.rsvp_at DESC) FILTER (WHERE sub IS NOT NULL), '[]')
  INTO v_preview
  FROM (
    SELECT
      r.user_id,
      p.display_name,
      p.avatar_url,
      p.avatar_color,
      p.initials,
      r.created_at AS rsvp_at
    FROM public.rsvps r
    JOIN public.profiles p ON p.id = r.user_id
    WHERE r.event_id = p_event_id
      AND r.status = 'going'
    ORDER BY r.created_at DESC
    LIMIT 12
  ) sub;

  -- Upsert snapshot
  INSERT INTO public.event_attendee_snapshots
    (event_id, going_count, interested_count, preview_attendees, computed_at)
  VALUES
    (p_event_id, v_going, v_interested, v_preview, NOW())
  ON CONFLICT (event_id) DO UPDATE SET
    going_count      = EXCLUDED.going_count,
    interested_count = EXCLUDED.interested_count,
    preview_attendees = EXCLUDED.preview_attendees,
    computed_at      = EXCLUDED.computed_at;

  -- Also sync events.attendees denorm column
  UPDATE public.events
  SET attendees = v_going, updated_at = NOW()
  WHERE id = p_event_id;
END;
$$;

COMMENT ON FUNCTION public.recompute_attendee_snapshot IS
  'Idempotent recompute of going/interested counts + preview JSON for one event. '
  'Safe to call from worker or pg_cron.';

-- ============================================================
-- 6. Row Level Security
-- ============================================================
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendee_snapshots ENABLE ROW LEVEL SECURITY;

-- rsvps: authenticated users may read all; write only own rows
DROP POLICY IF EXISTS "rsvps_select_all" ON public.rsvps;
CREATE POLICY "rsvps_select_all"
  ON public.rsvps FOR SELECT
  USING (true);  -- public event; attendee list is not private

DROP POLICY IF EXISTS "rsvps_insert_own" ON public.rsvps;
CREATE POLICY "rsvps_insert_own"
  ON public.rsvps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rsvps_update_own" ON public.rsvps;
CREATE POLICY "rsvps_update_own"
  ON public.rsvps FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rsvps_delete_own" ON public.rsvps;
CREATE POLICY "rsvps_delete_own"
  ON public.rsvps FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- snapshots: public read, service_role write only
DROP POLICY IF EXISTS "snapshots_select_all" ON public.event_attendee_snapshots;
CREATE POLICY "snapshots_select_all"
  ON public.event_attendee_snapshots FOR SELECT
  USING (true);

-- service_role bypasses RLS, so no INSERT/UPDATE policy needed for worker.

-- ============================================================
-- 7. Grants
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rsvps
  TO anon, authenticated, service_role;

GRANT SELECT ON public.event_attendee_snapshots
  TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.event_attendee_snapshots
  TO service_role;

GRANT EXECUTE ON FUNCTION public.recompute_attendee_snapshot(UUID)
  TO service_role;
