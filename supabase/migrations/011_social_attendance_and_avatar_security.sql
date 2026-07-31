-- Migration 011: private-by-default RSVP visibility and owner-scoped avatar storage.
-- Review and run manually in Supabase SQL Editor. Never run automatically.
BEGIN;

ALTER TABLE public.rsvps ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_rsvps_public_event ON public.rsvps(event_id, created_at DESC)
  WHERE status = 'going' AND is_public = TRUE;

DROP POLICY IF EXISTS "rsvps_select_all" ON public.rsvps;
DROP POLICY IF EXISTS rsvps_select_own ON public.rsvps;
CREATE POLICY rsvps_select_own ON public.rsvps FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.rsvps FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rsvps TO authenticated;

-- Profiles are no longer broadly readable. Public attendee previews are assembled
-- server-side from an explicit safe-field allowlist.
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;
DROP POLICY IF EXISTS profiles_own_read ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_read ON public.profiles;
CREATE POLICY profiles_own_read ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY profiles_admin_read ON public.profiles FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('admin', 'super_admin'));
REVOKE SELECT ON public.profiles FROM anon;

-- The avatars bucket is public-read, but writes and object listing remain owner-scoped.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', TRUE, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS avatars_owner_insert ON storage.objects;
DROP POLICY IF EXISTS avatars_owner_update ON storage.objects;
DROP POLICY IF EXISTS avatars_owner_delete ON storage.objects;
CREATE POLICY avatars_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY avatars_owner_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY avatars_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

COMMIT;

-- Rollback: retain the nullable-compatible is_public column; drop the partial index and three
-- storage policies, then restore the prior bucket policies. Do not restore public RSVP table reads.
