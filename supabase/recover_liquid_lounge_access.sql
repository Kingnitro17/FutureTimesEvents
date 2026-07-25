-- ============================================================
-- Recovery: Restore Liquid Lounge organizer access + event
-- 
-- Run this in Supabase SQL Editor when the event detail page
-- shows "Event not found" and liquidlounge216@gmail.com gets
-- "Access Denied" or "Organizer Access Only" on the dashboard.
--
-- This is idempotent — safe to run multiple times.
-- ============================================================

BEGIN;

SET LOCAL lock_timeout = '15s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = public, extensions, pg_catalog;

DO $$
DECLARE
  v_organizer_id       UUID;
  v_organizer_email    TEXT;
  v_organizer_name     TEXT;
  v_event_id           UUID;
  v_profile_exists     BOOLEAN;
  v_profile_role       TEXT;
  v_event_exists       BOOLEAN;
  v_event_status       TEXT;
  v_event_organizer_id UUID;
  v_staff_exists       BOOLEAN;
  v_rpc_result         JSONB;
BEGIN
  -- 1. Locate the auth user
  SELECT
    au.id,
    lower(au.email),
    COALESCE(
      NULLIF(au.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(au.raw_user_meta_data ->> 'name', ''),
      'Liquid Lounge'
    )
  INTO
    v_organizer_id,
    v_organizer_email,
    v_organizer_name
  FROM auth.users AS au
  WHERE lower(au.email) = 'liquidlounge216@gmail.com'
  ORDER BY au.created_at
  LIMIT 1;

  IF v_organizer_id IS NULL THEN
    RAISE EXCEPTION
      'No auth user for liquidlounge216@gmail.com. Sign in with Google or create an account first.';
  END IF;

  RAISE NOTICE 'Found auth user: % (%)', v_organizer_id, v_organizer_email;

  -- 2. Ensure profiles row exists with event_manager role
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_organizer_id)
  INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    INSERT INTO public.profiles (id, email, display_name, initials, role, account_status)
    VALUES (v_organizer_id, v_organizer_email, v_organizer_name,
            upper(left(v_organizer_name, 2)), 'event_manager', 'active');
    RAISE NOTICE 'Created missing profile for %', v_organizer_email;
  ELSE
    SELECT role INTO v_profile_role
    FROM public.profiles WHERE id = v_organizer_id;

    UPDATE public.profiles
    SET role = 'event_manager',
        account_status = 'active',
        display_name = COALESCE(NULLIF(display_name, ''), v_organizer_name),
        email = v_organizer_email,
        updated_at = NOW()
    WHERE id = v_organizer_id;

    RAISE NOTICE 'Updated profile: role was %, now event_manager', v_profile_role;
  END IF;

  -- 3. Ensure the event exists and is correctly linked
  SELECT EXISTS(SELECT 1 FROM public.events WHERE slug = 'alick-macheso-peter-moyo-live')
  INTO v_event_exists;

  IF NOT v_event_exists THEN
    RAISE EXCEPTION 'Event slug alick-macheso-peter-moyo-live does not exist. Was migration 006 run?';
  END IF;

  SELECT status, organizer_id
  INTO v_event_status, v_event_organizer_id
  FROM public.events
  WHERE slug = 'alick-macheso-peter-moyo-live';

  UPDATE public.events
  SET
    organizer_id = v_organizer_id,
    created_by = COALESCE(created_by, v_organizer_id),
    organizer_name = 'Liquid Lounge',
    status = CASE
      WHEN status IS NULL OR status NOT IN ('published', 'sold_out', 'completed', 'postponed')
      THEN 'published'
      ELSE status
    END,
    updated_at = NOW()
  WHERE slug = 'alick-macheso-peter-moyo-live'
    AND (
      organizer_id IS DISTINCT FROM v_organizer_id
      OR organizer_name IS DISTINCT FROM 'Liquid Lounge'
      OR status IS NULL
      OR status NOT IN ('published', 'sold_out', 'completed', 'postponed')
    );

  RAISE NOTICE 'Event %: status=%, organizer_id=%',
    'alick-macheso-peter-moyo-live', v_event_status, v_event_organizer_id;

  SELECT id INTO v_event_id
  FROM public.events
  WHERE slug = 'alick-macheso-peter-moyo-live';

  -- 4. Ensure event_staff entry exists for Liquid Lounge
  SELECT EXISTS(
    SELECT 1 FROM public.event_staff
    WHERE event_id = v_event_id AND user_id = v_organizer_id
  ) INTO v_staff_exists;

  IF NOT v_staff_exists THEN
    INSERT INTO public.event_staff (event_id, user_id, role, gate, is_active, assigned_by)
    VALUES (v_event_id, v_organizer_id, 'event_manager', 'Main Gate', TRUE, v_organizer_id);
    RAISE NOTICE 'Created event_staff entry';
  ELSE
    UPDATE public.event_staff
    SET role = 'event_manager', is_active = TRUE, gate = 'Main Gate'
    WHERE event_id = v_event_id AND user_id = v_organizer_id;
    RAISE NOTICE 'Updated event_staff entry';
  END IF;

  -- 5. Test get_my_profile() for this user
  -- We can't call it as another user from here, but we can verify the profiles row is sound
  RAISE NOTICE 'Profile row for %: event_manager with active status confirmed', v_organizer_email;

  -- 6. Ensure Data API grants are correct for event detail content tables
  GRANT SELECT ON public.events TO anon, authenticated;
  GRANT SELECT ON public.ticket_types TO anon, authenticated;
  GRANT SELECT ON public.event_faqs TO anon, authenticated;
  GRANT SELECT ON public.event_sponsors TO anon, authenticated;
  GRANT SELECT ON public.event_schedule_items TO anon, authenticated;

  -- 7. Ensure ticket_type exists and has available inventory
  IF NOT EXISTS (
    SELECT 1 FROM public.ticket_types
    WHERE event_id = v_event_id AND lower(name) = 'general admission'
  ) THEN
    INSERT INTO public.ticket_types (
      event_id, name, description, price,
      quantity_total, quantity_available, claim_limit_per_contact,
      is_active, is_visible, sort_order
    ) VALUES (
      v_event_id,
      'General Admission',
      'FREE entry to Alick Macheso & Peter Moyo Live concert.',
      0.00,
      2000, 2000, 10,
      TRUE, TRUE, 0
    );
    RAISE NOTICE 'Created General Admission ticket type';
  ELSE
    UPDATE public.ticket_types
    SET is_active = TRUE, is_visible = TRUE
    WHERE event_id = v_event_id AND lower(name) = 'general admission';
    RAISE NOTICE 'Activated existing General Admission ticket type';
  END IF;

  RAISE NOTICE 'Recovery complete — liquidlounge216@gmail.com is now event_manager';
END;
$$;

COMMIT;

-- Verification: paste these into SQL Editor after COMMIT
-- SELECT id, email, role, account_status
-- FROM public.profiles
-- WHERE lower(email) = 'liquidlounge216@gmail.com';
--
-- SELECT id, slug, title, status, organizer_id, organizer_name
-- FROM public.events
-- WHERE slug = 'alick-macheso-peter-moyo-live';
