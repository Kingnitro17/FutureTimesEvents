-- ============================================================
-- UPDATE LIQUID LOUNGE EVENT — Production Ready v3
-- Run in Supabase SQL Editor
-- ============================================================
BEGIN;

-- ── 0. Drop and recreate event_staff to ensure correct schema ──
DROP TABLE IF EXISTS public.event_staff CASCADE;

CREATE TABLE public.event_staff (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'host' CHECK (role IN ('host', 'event_manager')),
  gate         TEXT DEFAULT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by  UUID REFERENCES public.profiles(id) DEFAULT NULL,
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Event staff viewable by authenticated" ON public.event_staff;
CREATE POLICY "Event staff viewable by authenticated" ON public.event_staff
  FOR SELECT USING (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_staff TO anon, authenticated, service_role;

-- ── 0b. Create ticket_types table if it doesn't exist ──────
CREATE TABLE IF NOT EXISTS public.ticket_types (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id               UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  description            TEXT DEFAULT '',
  price                  NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity_available     INTEGER NOT NULL DEFAULT 0,
  quantity_total         INTEGER NOT NULL DEFAULT 0,
  claim_limit_per_contact INTEGER NOT NULL DEFAULT 1,
  claim_opens_at         TIMESTAMPTZ DEFAULT NULL,
  claim_closes_at        TIMESTAMPTZ DEFAULT NULL,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order             INTEGER NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ticket types viewable by everyone" ON public.ticket_types;
CREATE POLICY "Ticket types viewable by everyone" ON public.ticket_types
  FOR SELECT USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_types TO anon, authenticated, service_role;

-- ── 1. Ensure liquidlounge216@gmail.com has event_manager role ──
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
  image_url = 'https://ecbbmcqwluivbzlaqdsd.supabase.co/storage/v1/object/public/events/events/IMG_5056.JPG.jpeg',
  lat = -17.279231829121493,
  lng = 31.486001194492793,
  address = 'Liquid Lounge Shamva, Shamva, Zimbabwe',
  organizer_id = (SELECT id FROM public.profiles WHERE email = 'liquidlounge216@gmail.com' LIMIT 1),
  organizer_name = 'Liquid Lounge',
  capacity = 2000
WHERE slug = 'alick-macheso-peter-moyo-live';

-- ── 3. Assign liquidlounge216 as event_staff for check-in ───
INSERT INTO public.event_staff (user_id, event_id, role, gate, is_active)
SELECT
  (SELECT id FROM public.profiles WHERE email = 'liquidlounge216@gmail.com' LIMIT 1),
  id,
  'event_manager',
  'Main Gate',
  true
FROM public.events
WHERE slug = 'alick-macheso-peter-moyo-live'
  AND NOT EXISTS (
    SELECT 1 FROM public.event_staff es
    WHERE es.event_id = public.events.id
      AND es.user_id = (SELECT id FROM public.profiles WHERE email = 'liquidlounge216@gmail.com' LIMIT 1)
  );

-- ── 4. Insert ticket_types for the claim system ─────────────
INSERT INTO public.ticket_types (
  event_id, name, description, price,
  quantity_available, quantity_total,
  claim_limit_per_contact, is_active, sort_order
)
SELECT
  id,
  'General Admission',
  'FREE entry to Alick Macheso & Peter Moyo Live concert.',
  0.00,
  2000, 2000,
  1, true, 0
FROM public.events
WHERE slug = 'alick-macheso-peter-moyo-live'
  AND NOT EXISTS (
    SELECT 1 FROM public.ticket_types tt
    WHERE tt.event_id = public.events.id AND tt.name = 'General Admission'
  );

-- Also reset event status back to published if it was marked sold_out
UPDATE public.events
SET status = 'published'
WHERE slug = 'alick-macheso-peter-moyo-live'
  AND status = 'sold_out';

COMMIT;

-- ── Verification queries ────────────────────────────────────
-- SELECT id, title, date, lat, lng, image_url, organizer_name, capacity, status FROM public.events WHERE slug = 'alick-macheso-peter-moyo-live';
-- SELECT p.email, p.role FROM public.profiles p WHERE p.email = 'liquidlounge216@gmail.com';
-- SELECT es.* FROM public.event_staff es JOIN public.events e ON e.id = es.event_id WHERE e.slug = 'alick-macheso-peter-moyo-live';
-- SELECT tt.name, tt.quantity_available, tt.quantity_total FROM public.ticket_types tt JOIN public.events e ON e.id = tt.event_id WHERE e.slug = 'alick-macheso-peter-moyo-live';