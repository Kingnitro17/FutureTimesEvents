-- migrations/003_messages_push.sql
-- Adds: messages table (event chat), push_subscriptions table (web push)
-- Idempotent: safe to run multiple times.

-- ============================================================
-- 1. messages table (event-level public chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID        REFERENCES public.events(id) ON DELETE CASCADE,
  from_user_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id     UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  body           TEXT        NOT NULL,
  read           BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_event    ON public.messages(event_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user  ON public.messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_from     ON public.messages(from_user_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Event chat: everyone can read messages for public events
DROP POLICY IF EXISTS "messages_select_event" ON public.messages;
CREATE POLICY "messages_select_event"
  ON public.messages FOR SELECT
  USING (to_user_id IS NULL);  -- event-level messages (no DM recipient)

-- DMs: only sender and recipient can read
DROP POLICY IF EXISTS "messages_select_dm" ON public.messages;
CREATE POLICY "messages_select_dm"
  ON public.messages FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

GRANT SELECT, INSERT ON public.messages TO anon, authenticated;
GRANT ALL ON public.messages TO service_role;

-- Enable realtime
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;


-- ============================================================
-- 2. push_subscriptions table (browser Web Push)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint   TEXT        NOT NULL UNIQUE,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subs_manage_own" ON public.push_subscriptions;
CREATE POLICY "push_subs_manage_own"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;


-- ============================================================
-- 3. Enable realtime on rsvps + notifications (idempotent)
--    Each block checks the table EXISTS before adding to publication
--    so this is safe even if migration 002 hasn't been run yet.
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rsvps')
  AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rsvps')
  THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvps; END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications')
  AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications')
  THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_attendee_snapshots')
  AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'event_attendee_snapshots')
  THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.event_attendee_snapshots; END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'push_subscriptions')
  AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'push_subscriptions')
  THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions; END IF;
END $$;
