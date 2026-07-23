-- ============================================================
-- ADD ALICK MACHESO & PETER MOYO SHOW
-- Future Times Events Platform
-- Run in Supabase SQL Editor AFTER cleanup_dummy_data.sql
-- ============================================================

-- ── SAFETY: Run in a transaction ────────────────────────────
BEGIN;

-- ── 1. Get or create organizer profile (your admin account) ─────
-- This assumes your admin profile already exists with email nigelmarara0@gmail.com
-- If not, you may need to adjust the organizer_id below

-- ── 2. Insert Alick Macheso & Peter Moyo Show ─────────────────────
INSERT INTO public.events (
  id,
  title,
  slug,
  category,
  category_label,
  description,
  long_description,
  date,
  time,
  end_time,
  venue,
  address,
  city,
  price,
  capacity,
  attendees,
  image_url,
  mood,
  tags,
  featured,
  lineup,
  organizer_id,
  organizer_name,
  lat,
  lng,
  status
) VALUES (
  gen_random_uuid(),  -- id
  'Alick Macheso & Peter Moyo Live',  -- title
  'alick-macheso-peter-moyo-live',  -- slug
  'concert',  -- category
  'Concert',  -- category_label
  'Experience an unforgettable night with Zimbabwe''s music legends Alick Macheso and Peter Moyo performing live!',  -- description
  'Join us for a historic evening featuring two of Zimbabwe''s most beloved musicians. Alick Macheso, the sungura maestro, and Peter Moyo, the dancehall sensation, will share the stage for one epic night of music.

  **What to Expect:**
  • Live performances by Alick Macheso & Peter Moyo
  • Full band accompaniment
  • Classic hits and new releases
  • Electric atmosphere and dancing
  • Professional venue with great sound and lighting

  **Venue Information:**
  • Spacious concert hall
  • Multiple bar areas
  • Secure parking available
  • Professional security team

  This is a special promotional event - tickets are FREE! Get your QR ticket now and join us for an incredible night of Zimbabwean music.',  -- long_description
  '2026-08-20',  -- date (Wednesday)
  '18:00:00',  -- time (6 PM)
  '23:00:00',  -- end_time (11 PM)
  'Liquid Lounge Shamva',  -- venue
  '1km from Shamva on your way to Bindura',  -- address
  'Shamva',  -- city
  0.00,  -- price (FREE - promotional event)
  2000,  -- capacity
  0,  -- attendees (starts at 0)
  'https://ecbbmcqwluivbzlaqdsd.supabase.co/storage/v1/object/public/events/events/file_00000000989881f49999e739199437ab.png',  -- image_url
  'celebratory',  -- mood
  ARRAY['concert', 'music', 'live', 'sungura', 'dancehall', 'zimbabwe'],  -- tags
  true,  -- featured (hero page)
  ARRAY['Alick Macheso', 'Peter Moyo', 'Orchestra Mberikwazvo', 'Extra Large'],  -- lineup
  (SELECT id FROM public.profiles WHERE email = 'nigelmarara0@gmail.com' LIMIT 1),  -- organizer_id
  'Future Times Events',  -- organizer_name
  -17.8292,  -- lat (Harare coordinates)
  31.0524,  -- lng (Harare coordinates)
  'published'  -- status
) ON CONFLICT (slug) DO NOTHING;

-- ── 3. Insert Single Free Ticket Tier ───────────────────────────
-- Get the event ID we just inserted
DO $$
DECLARE
  event_id UUID;
BEGIN
  SELECT id INTO event_id FROM public.events WHERE slug = 'alick-macheso-peter-moyo-live' LIMIT 1;
  
  -- Single Free General Admission Tier with QR
  INSERT INTO public.ticket_tiers (
    id,
    event_id,
    name,
    price,
    description,
    perks,
    available,
    total,
    gradient
  ) VALUES (
    gen_random_uuid(),
    event_id,
    'General Admission',
    0.00,
    'FREE entry to Alick Macheso & Peter Moyo Live concert. Download your QR ticket for instant access.',
    ARRAY['FREE entry', 'QR ticket for instant access', 'Downloadable ticket', 'Retrievable anytime'],
    2000,
    2000,
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  ) ON CONFLICT DO NOTHING;
  
END $$;

COMMIT;

-- ── Verification queries ───────────────────────────────────────────
-- Run these after insertion to verify:

-- Check the event was created
-- SELECT id, title, slug, date, time, venue, status FROM public.events WHERE slug = 'alick-macheso-peter-moyo-live';

-- Check ticket tier was created
-- SELECT id, name, price, available, total FROM public.ticket_tiers 
-- WHERE event_id = (SELECT id FROM public.events WHERE slug = 'alick-macheso-peter-moyo-live');

-- Count total events (should be 1)
-- SELECT COUNT(*) FROM public.events;
