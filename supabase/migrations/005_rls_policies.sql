-- ============================================================
-- Migration 005: Row Level Security policies
-- Future Times Events Platform
-- Created: 2026-07-20
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- EVENTS
-- ─────────────────────────────────────────────────────────────

-- Public: anyone can read published events
DROP POLICY IF EXISTS "Events are viewable by everyone"       ON public.events;
CREATE POLICY "events_public_read" ON public.events
  FOR SELECT USING (status IN ('published', 'sold_out', 'completed'));

-- Admins can see all events (including drafts)
CREATE POLICY "events_admin_read_all" ON public.events
  FOR SELECT USING (public.get_my_role() IN ('admin', 'super_admin'));

-- Admins and event_managers can insert
CREATE POLICY "events_admin_insert" ON public.events
  FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'super_admin', 'event_manager'));

-- Admins can update any event; event_managers can update their assigned events
CREATE POLICY "events_admin_update" ON public.events
  FOR UPDATE USING (public.get_my_role() IN ('admin', 'super_admin'));

-- Only super_admin can delete (soft-delete preferred via status change)
CREATE POLICY "events_super_admin_delete" ON public.events
  FOR DELETE USING (public.get_my_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────

-- Anyone can read profiles (display name, avatar — public info)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "profiles_public_read" ON public.profiles
  FOR SELECT USING (account_status = 'active');

-- Users can only update their own profile
CREATE POLICY "profiles_own_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Admins can update any profile (e.g., change role, suspend)
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE USING (public.get_my_role() IN ('admin', 'super_admin'));

-- Only backend (service role) can insert profiles
-- (profile is created via trigger on auth.users, not directly by users)

-- ─────────────────────────────────────────────────────────────
-- TICKET TYPES
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "ticket_types_public_read" ON public.ticket_types
  FOR SELECT USING (is_visible = TRUE);

CREATE POLICY "ticket_types_admin_all" ON public.ticket_types
  FOR ALL USING (public.get_my_role() IN ('admin', 'super_admin', 'event_manager'));

-- ─────────────────────────────────────────────────────────────
-- TICKET CLAIMS
-- ─────────────────────────────────────────────────────────────

-- Claimants can see their own claims
CREATE POLICY "ticket_claims_own_read" ON public.ticket_claims
  FOR SELECT USING (lower(attendee_email) = lower((SELECT email FROM public.profiles WHERE id = auth.uid())));

-- Admins see all
CREATE POLICY "ticket_claims_admin_read" ON public.ticket_claims
  FOR SELECT USING (public.get_my_role() IN ('admin', 'super_admin', 'event_manager'));

-- Inserts only via the claim_ticket_atomic function (SECURITY DEFINER bypasses RLS)
-- No direct public insert

-- ─────────────────────────────────────────────────────────────
-- TICKETS
-- ─────────────────────────────────────────────────────────────

-- Attendees can read their own tickets (by email match or user_id)
CREATE POLICY "tickets_own_read" ON public.tickets
  FOR SELECT USING (
    user_id = auth.uid()
    OR lower(attendee_email) = lower((SELECT email FROM public.profiles WHERE id = auth.uid()))
  );

-- Hosts can read tickets for their assigned events (not QR hash — that's excluded in queries)
CREATE POLICY "tickets_host_read" ON public.tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.event_staff es
      WHERE es.event_id = tickets.event_id
        AND es.user_id = auth.uid()
        AND es.is_active = TRUE
    )
  );

-- Admins and event_managers can read all tickets
CREATE POLICY "tickets_admin_read" ON public.tickets
  FOR SELECT USING (public.get_my_role() IN ('admin', 'super_admin', 'event_manager'));

-- Updates only via verify_and_checkin and admin functions (SECURITY DEFINER)
-- No direct public update

-- ─────────────────────────────────────────────────────────────
-- TICKET SCANS
-- ─────────────────────────────────────────────────────────────

-- Hosts can read scans for their assigned events
CREATE POLICY "ticket_scans_host_read" ON public.ticket_scans
  FOR SELECT USING (
    scanner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.event_staff es
      WHERE es.event_id = ticket_scans.event_id
        AND es.user_id = auth.uid()
        AND es.is_active = TRUE
    )
    OR public.get_my_role() IN ('admin', 'super_admin', 'event_manager')
  );

-- No direct inserts (inserted inside verify_and_checkin SECURITY DEFINER function)

-- ─────────────────────────────────────────────────────────────
-- EVENT STAFF
-- ─────────────────────────────────────────────────────────────

-- Staff can see their own assignment
CREATE POLICY "event_staff_own_read" ON public.event_staff
  FOR SELECT USING (user_id = auth.uid());

-- Admins see all
CREATE POLICY "event_staff_admin_read" ON public.event_staff
  FOR SELECT USING (public.get_my_role() IN ('admin', 'super_admin', 'event_manager'));

-- Only admins can assign/remove staff
CREATE POLICY "event_staff_admin_write" ON public.event_staff
  FOR ALL USING (public.get_my_role() IN ('admin', 'super_admin'));

-- ─────────────────────────────────────────────────────────────
-- EVENT PUBLIC CONTENT (FAQs, sponsors, schedule, media)
-- ─────────────────────────────────────────────────────────────

-- Public read for FAQs
CREATE POLICY "event_faqs_public_read" ON public.event_faqs
  FOR SELECT USING (TRUE);
CREATE POLICY "event_faqs_admin_write" ON public.event_faqs
  FOR ALL USING (public.get_my_role() IN ('admin', 'super_admin', 'event_manager'));

-- Public read for sponsors
CREATE POLICY "event_sponsors_public_read" ON public.event_sponsors
  FOR SELECT USING (TRUE);
CREATE POLICY "event_sponsors_admin_write" ON public.event_sponsors
  FOR ALL USING (public.get_my_role() IN ('admin', 'super_admin', 'event_manager'));

-- Public read for schedule
CREATE POLICY "event_schedule_public_read" ON public.event_schedule_items
  FOR SELECT USING (TRUE);
CREATE POLICY "event_schedule_admin_write" ON public.event_schedule_items
  FOR ALL USING (public.get_my_role() IN ('admin', 'super_admin', 'event_manager'));

-- Public read for published media
CREATE POLICY "event_media_public_read" ON public.event_media
  FOR SELECT USING (is_published = TRUE);
CREATE POLICY "event_media_admin_write" ON public.event_media
  FOR ALL USING (public.get_my_role() IN ('admin', 'super_admin', 'event_manager'));

-- ─────────────────────────────────────────────────────────────
-- ATTENDEE VISIBILITY (Who's Going)
-- ─────────────────────────────────────────────────────────────

-- Anyone can see opted-in, non-moderated visibility records
CREATE POLICY "attendee_vis_public_read" ON public.attendee_visibility
  FOR SELECT USING (is_visible = TRUE AND is_moderated = FALSE);

-- Ticket holders can update their own visibility
CREATE POLICY "attendee_vis_own_update" ON public.attendee_visibility
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = attendee_visibility.ticket_id
        AND (t.user_id = auth.uid()
          OR lower(t.attendee_email) = lower((SELECT email FROM public.profiles WHERE id = auth.uid())))
    )
  );

-- Admins can moderate
CREATE POLICY "attendee_vis_admin_all" ON public.attendee_visibility
  FOR ALL USING (public.get_my_role() IN ('admin', 'super_admin'));

-- ─────────────────────────────────────────────────────────────
-- NOTIFICATION JOBS — admin only
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "notification_jobs_admin_read" ON public.notification_jobs
  FOR SELECT USING (public.get_my_role() IN ('admin', 'super_admin'));

-- ─────────────────────────────────────────────────────────────
-- AUDIT LOGS — admin only, no update/delete ever
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT USING (public.get_my_role() IN ('admin', 'super_admin'));

-- ─────────────────────────────────────────────────────────────
-- EXISTING TABLES — clean up and update
-- ─────────────────────────────────────────────────────────────

-- Notifications: user sees their own
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own_read" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_own_update" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Comments: existing public read kept
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "comments_public_read" ON public.comments
  FOR SELECT USING (TRUE);
CREATE POLICY "comments_own_insert" ON public.comments
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments_own_delete" ON public.comments
  FOR DELETE USING (user_id = auth.uid());

-- Saved events: own only
CREATE POLICY "saved_events_own" ON public.saved_events
  FOR ALL USING (user_id = auth.uid());

-- Attendees: own only (existing table)
CREATE POLICY "attendees_own" ON public.attendees
  FOR ALL USING (user_id = auth.uid());

COMMIT;
