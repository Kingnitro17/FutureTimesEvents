-- Migration 010: additive organizer review workflow, notification outbox metadata, and audit support.
-- Review and run manually in the Supabase SQL Editor. This migration is not executed by the app.
BEGIN;

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_status_check CHECK (status IN (
  'draft', 'pending_review', 'changes_requested', 'approved', 'scheduled',
  'published', 'rejected', 'sold_out', 'completed', 'cancelled', 'postponed', 'archived'
));

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS organizer_notes TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE public.notification_jobs
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS recipient TEXT,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;

UPDATE public.notification_jobs SET recipient = recipient_email WHERE recipient IS NULL;
ALTER TABLE public.notification_jobs DROP CONSTRAINT IF EXISTS notification_jobs_channel_check;
ALTER TABLE public.notification_jobs ADD CONSTRAINT notification_jobs_channel_check
  CHECK (channel IN ('email', 'whatsapp'));

CREATE UNIQUE INDEX IF NOT EXISTS notification_jobs_idempotency_unique
  ON public.notification_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_review_queue_idx
  ON public.events(status, submitted_at DESC) WHERE status IN ('pending_review', 'changes_requested');

DROP POLICY IF EXISTS events_admin_insert ON public.events;
CREATE POLICY events_organizer_insert ON public.events FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'super_admin')
    OR (public.get_my_role() = 'event_manager' AND organizer_id = auth.uid() AND created_by = auth.uid() AND status = 'draft')
  );

DROP POLICY IF EXISTS events_admin_update ON public.events;
CREATE POLICY events_admin_update ON public.events FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY events_organizer_update_own ON public.events FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'event_manager' AND organizer_id = auth.uid())
  WITH CHECK (public.get_my_role() = 'event_manager' AND organizer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.protect_event_review_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE actor_role TEXT;
BEGIN
  IF current_user IN ('postgres', 'service_role') THEN RETURN NEW; END IF;
  actor_role := public.get_my_role();
  IF actor_role = 'event_manager' THEN
    IF NEW.organizer_id IS DISTINCT FROM OLD.organizer_id
       OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
       OR NEW.published_at IS DISTINCT FROM OLD.published_at
       OR NEW.status NOT IN ('draft', 'pending_review', 'changes_requested') THEN
      RAISE EXCEPTION 'Organizer cannot alter protected event review fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_event_review_fields_trigger ON public.events;
CREATE TRIGGER protect_event_review_fields_trigger BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.protect_event_review_fields();

COMMIT;

-- Rollback notes: drop the trigger/policies/indexes and the seven nullable event columns plus four
-- nullable notification columns. Restore the previous status constraint only after converting new states.
