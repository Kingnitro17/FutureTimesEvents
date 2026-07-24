-- ============================================================
-- Liquid Lounge production configuration
--
-- Prerequisite:
--   Review and run migrations/006_production_ticketing.sql first.
--
-- Run this file manually in the Supabase SQL Editor after reviewing it.
-- It is non-destructive and idempotent: no tables, policies, assignments,
-- tickets, claims, or scans are dropped, and sold inventory is never reset.
-- ============================================================

BEGIN;

SET LOCAL lock_timeout = '15s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = public, extensions, pg_catalog;

DO $$
DECLARE
  v_organizer_id       UUID;
  v_event_id           UUID;
  v_ticket_type_id     UUID;
  v_event_issued       INTEGER := 0;
  v_type_issued        INTEGER := 0;
  v_event_capacity     INTEGER := 2000;
  v_type_total         INTEGER := 2000;
  v_type_available     INTEGER := 0;
  v_general_type_count INTEGER := 0;
BEGIN
  SELECT p.id
  INTO v_organizer_id
  FROM public.profiles AS p
  WHERE lower(p.email) = 'liquidlounge216@gmail.com'
  ORDER BY p.created_at
  LIMIT 1;

  IF v_organizer_id IS NULL THEN
    RAISE EXCEPTION
      'No profile exists for liquidlounge216@gmail.com. Create/sign in to that account first.';
  END IF;

  -- This account is scoped to its assigned event. Do not preserve a legacy
  -- admin promotion that may have originated from the old organizer mapping.
  UPDATE public.profiles
  SET role = 'event_manager',
      account_status = 'active',
      updated_at = NOW()
  WHERE id = v_organizer_id;

  SELECT e.id
  INTO v_event_id
  FROM public.events AS e
  WHERE e.slug = 'alick-macheso-peter-moyo-live'
  ORDER BY e.created_at
  LIMIT 1
  FOR UPDATE;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION
      'Event slug alick-macheso-peter-moyo-live does not exist.';
  END IF;

  SELECT COALESCE(
    SUM(GREATEST(COALESCE(t.quantity, 1), 1)),
    0
  )::INTEGER
  INTO v_event_issued
  FROM public.tickets AS t
  WHERE t.event_id = v_event_id
    AND t.status IN ('issued', 'checked_in');

  -- Never set capacity below tickets that have already been validly issued.
  v_event_capacity := GREATEST(2000, v_event_issued);

  UPDATE public.events
  SET
    date = DATE '2026-08-09',
    time = TIME '18:00:00',
    end_time = TIME '23:00:00',
    starts_at = TIMESTAMPTZ '2026-08-09 18:00:00+02',
    ends_at = TIMESTAMPTZ '2026-08-09 23:00:00+02',
    doors_open_at = TIMESTAMPTZ '2026-08-09 17:00:00+02',
    timezone = 'Africa/Harare',
    venue = 'Liquid Lounge Shamva',
    venue_name = 'Liquid Lounge Shamva',
    address = 'Liquid Lounge Shamva, Shamva, Zimbabwe',
    image_url = 'https://ecbbmcqwluivbzlaqdsd.supabase.co/storage/v1/object/public/events/events/IMG_5056.JPG.jpeg',
    lat = -17.279231829121493,
    lng = 31.486001194492793,
    organizer_id = v_organizer_id,
    created_by = v_organizer_id,
    organizer_name = 'Liquid Lounge',
    capacity = v_event_capacity,
    attendees = v_event_issued,
    status = CASE
      WHEN v_event_issued >= v_event_capacity THEN 'sold_out'
      ELSE 'published'
    END,
    updated_at = NOW()
  WHERE id = v_event_id;

  INSERT INTO public.event_staff (
    user_id,
    event_id,
    role,
    gate,
    is_active,
    assigned_by
  ) VALUES (
    v_organizer_id,
    v_event_id,
    'event_manager',
    'Main Gate',
    TRUE,
    v_organizer_id
  )
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET
    role = EXCLUDED.role,
    gate = EXCLUDED.gate,
    is_active = TRUE,
    assigned_by = EXCLUDED.assigned_by;

  SELECT COUNT(*)::INTEGER
  INTO v_general_type_count
  FROM public.ticket_types AS tt
  WHERE tt.event_id = v_event_id
    AND lower(tt.name) = 'general admission';

  IF v_general_type_count > 1 THEN
    RAISE EXCEPTION
      'Multiple General Admission ticket types exist for the Liquid Lounge event. Merge or deactivate duplicates before running this setup.';
  END IF;

  SELECT tt.id
  INTO v_ticket_type_id
  FROM public.ticket_types AS tt
  WHERE tt.event_id = v_event_id
    AND lower(tt.name) = 'general admission'
  ORDER BY tt.sort_order, tt.created_at
  LIMIT 1
  FOR UPDATE;

  IF v_ticket_type_id IS NULL THEN
    INSERT INTO public.ticket_types (
      event_id,
      name,
      description,
      price,
      quantity_total,
      quantity_available,
      claim_limit_per_contact,
      is_active,
      is_visible,
      sort_order
    ) VALUES (
      v_event_id,
      'General Admission',
      'FREE entry to Alick Macheso & Peter Moyo Live concert.',
      0.00,
      2000,
      2000,
      10,
      TRUE,
      TRUE,
      0
    )
    RETURNING id INTO v_ticket_type_id;
  END IF;

  SELECT COALESCE(
    SUM(GREATEST(COALESCE(t.quantity, 1), 1)),
    0
  )::INTEGER
  INTO v_type_issued
  FROM public.tickets AS t
  WHERE t.ticket_type_id = v_ticket_type_id
    AND t.status IN ('issued', 'checked_in');

  v_type_total := GREATEST(2000, v_type_issued);
  v_type_available := GREATEST(v_type_total - v_type_issued, 0);

  UPDATE public.ticket_types
  SET
    name = 'General Admission',
    description = 'FREE entry to Alick Macheso & Peter Moyo Live concert.',
    price = 0.00,
    quantity_total = v_type_total,
    quantity_available = v_type_available,
    claim_limit_per_contact = 10,
    is_active = TRUE,
    is_visible = TRUE,
    sort_order = 0,
    updated_at = NOW()
  WHERE id = v_ticket_type_id;

  -- Re-evaluate event availability after the inventory repair.
  UPDATE public.events
  SET status = CASE
        WHEN attendees >= capacity OR v_type_available = 0 THEN 'sold_out'
        ELSE 'published'
      END,
      updated_at = NOW()
  WHERE id = v_event_id;
END;
$$;

COMMIT;

-- ============================================================
-- Read-only verification queries (run manually after COMMIT)
-- ============================================================
-- SELECT id, email, role, account_status
-- FROM public.profiles
-- WHERE lower(email) = 'liquidlounge216@gmail.com';
--
-- SELECT id, title, slug, starts_at, ends_at, venue_name,
--        organizer_id, created_by, capacity, attendees, status
-- FROM public.events
-- WHERE slug = 'alick-macheso-peter-moyo-live';
--
-- SELECT es.event_id, es.user_id, es.role, es.gate, es.is_active
-- FROM public.event_staff AS es
-- JOIN public.events AS e ON e.id = es.event_id
-- WHERE e.slug = 'alick-macheso-peter-moyo-live';
--
-- SELECT tt.id, tt.name, tt.quantity_total, tt.quantity_available,
--        tt.claim_limit_per_contact, tt.is_active, tt.is_visible
-- FROM public.ticket_types AS tt
-- JOIN public.events AS e ON e.id = tt.event_id
-- WHERE e.slug = 'alick-macheso-peter-moyo-live';
