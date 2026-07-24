-- ============================================================
-- UPDATE LIQUID LOUNGE EVENT — Production Ready
-- Run in Supabase SQL Editor
-- ============================================================
BEGIN;

-- ── 1. Ensure liquidlounge216@gmail.com has organizer role ──
UPDATE public.profiles
SET role = 'event_manager'
WHERE email = 'liquidlounge216@gmail.com'
  AND (role IS NULL OR role = 'user');

-- ── 2. Update the event details ─────────────────────────────
UPDATE public.events
SET
  date = '2026-08-09',
  time = '18:00:00',
  end_time = '23:00:00',
  image_url = 'https://ecbbmcqwluivbzlaqdsd.supabase.co/storage/v1/object/public/events/events/landscape-poster.png',
  lat = -17.279231829121493,
  lng = 31.486001194492793,
  address = 'Liquid Lounge Shamva, Shamva, Zimbabwe',
  organizer_id = (SELECT id FROM public.profiles WHERE email = 'liquidlounge216@gmail.com' LIMIT 1),
  organizer_name = 'Liquid Lounge'
WHERE slug = 'alick-macheso-peter-moyo-live';

-- ── 3. Assign liquidlounge216 as event_staff for check-in ───
INSERT INTO public.event_staff (user_id, event_id, gate, is_active)
SELECT
  (SELECT id FROM public.profiles WHERE email = 'liquidlounge216@gmail.com' LIMIT 1),
  id,
  'Main Gate',
  true
FROM public.events
WHERE slug = 'alick-macheso-peter-moyo-live'
  AND NOT EXISTS (
    SELECT 1 FROM public.event_staff es
    WHERE es.event_id = public.events.id
      AND es.user_id = (SELECT id FROM public.profiles WHERE email = 'liquidlounge216@gmail.com' LIMIT 1)
  );

COMMIT;

-- ── Verification queries ────────────────────────────────────
-- SELECT id, title, date, lat, lng, image_url, organizer_name FROM public.events WHERE slug = 'alick-macheso-peter-moyo-live';
-- SELECT p.email, p.role FROM public.profiles p WHERE p.email = 'liquidlounge216@gmail.com';
-- SELECT es.* FROM public.event_staff es JOIN public.events e ON e.id = es.event_id WHERE e.slug = 'alick-macheso-peter-moyo-live';