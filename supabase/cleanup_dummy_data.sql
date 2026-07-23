-- ============================================================
-- CLEANUP DUMMY DATA SCRIPT
-- Future Times Events Platform
-- Run in Supabase SQL Editor
-- WARNING: This will DELETE all dummy events, users, and related data
-- ============================================================

-- ── SAFETY: Run in a transaction ────────────────────────────
BEGIN;

-- ── 1. Delete dependent data first (respecting foreign keys) ─────

-- Delete tickets
DELETE FROM public.tickets WHERE 1=1;

-- Delete ticket tiers
DELETE FROM public.ticket_tiers WHERE 1=1;

-- Delete bookings
DELETE FROM public.bookings WHERE 1=1;

-- Delete orders
DELETE FROM public.orders WHERE 1=1;

-- Delete analytics
DELETE FROM public.analytics WHERE 1=1;

-- Delete attendees
DELETE FROM public.attendees WHERE 1=1;

-- Delete saved events
DELETE FROM public.saved_events WHERE 1=1;

-- Delete notifications
DELETE FROM public.notifications WHERE 1=1;

-- Delete comments
DELETE FROM public.comments WHERE 1=1;

-- ── 2. Delete dummy events ───────────────────────────────────────
-- This deletes ALL events. If you want to keep specific events, 
-- add a WHERE clause to filter them out.
DELETE FROM public.events WHERE 1=1;

-- ── 3. Delete dummy profiles (except your admin account) ───────────
-- Keep your admin account (nigelmarara0@gmail.com)
-- Delete all other profiles
DELETE FROM public.profiles 
WHERE email NOT IN ('nigelmarara0@gmail.com');

-- ── 4. Reset sequences (optional, for clean IDs) ───────────────────
-- This resets auto-increment IDs to start fresh
-- Uncomment if you want clean IDs starting from 1

-- ALTER SEQUENCE public.events_id_seq RESTART WITH 1;
-- ALTER SEQUENCE public.profiles_id_seq RESTART WITH 1;
-- ALTER SEQUENCE public.tickets_id_seq RESTART WITH 1;
-- ALTER SEQUENCE public.ticket_tiers_id_seq RESTART WITH 1;

COMMIT;

-- ── Verification queries ───────────────────────────────────────────
-- Run these after the cleanup to verify:

-- Check remaining events (should be 0)
-- SELECT COUNT(*) FROM public.events;

-- Check remaining profiles (should be 1 - your admin)
-- SELECT COUNT(*) FROM public.profiles;

-- Check remaining tickets (should be 0)
-- SELECT COUNT(*) FROM public.tickets;
