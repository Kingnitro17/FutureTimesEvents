-- ============================================================
-- Migration 002: Secure tickets table
-- Future Times Events Platform
-- ⚠️  REQUIRES HUMAN APPROVAL — alters existing tickets table
-- Created: 2026-07-20
-- ============================================================
--
-- Rollback procedure:
--   If anything goes wrong after COMMIT, run:
--   ALTER TABLE public.tickets RENAME TO tickets_v2_backup;
--   ALTER TABLE public.tickets_backup RENAME TO tickets;
--   (Only safe if tickets_backup was created before running this migration)
-- ============================================================

BEGIN;

-- ── 1. Backup existing tickets ───────────────────────────────
-- Create a backup before altering
CREATE TABLE IF NOT EXISTS public.tickets_backup_20260720
  AS SELECT * FROM public.tickets;

-- ── 2. Rename old ticket_tiers → ticket_types (new name) ────
-- ticket_tiers is renamed and extended
ALTER TABLE public.ticket_tiers
  RENAME TO ticket_types;

ALTER TABLE public.ticket_types
  ADD COLUMN IF NOT EXISTS quantity_total     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_available INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claim_limit_per_contact INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS claim_opens_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS claim_closes_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_visible      BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sort_order      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW();

-- Backfill quantity fields from old available/total columns
UPDATE public.ticket_types SET
  quantity_total     = COALESCE(total, 0),
  quantity_available = COALESCE(available, 0);

-- ── 3. Add new columns to tickets ────────────────────────────

-- Rename old insecure qr_code to legacy for reference during migration
ALTER TABLE public.tickets
  RENAME COLUMN qr_code TO qr_code_legacy;

-- Add the new secure columns
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS ticket_number    TEXT UNIQUE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ticket_type_id   UUID REFERENCES public.ticket_types(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS claim_id         UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attendee_name    TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attendee_email   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attendee_phone   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS qr_token_hash    TEXT UNIQUE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS quantity         INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS issued_at        TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS checked_in_by    UUID REFERENCES public.profiles(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gate             TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS revocation_reason   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS metadata        JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW();

-- Update status check constraint for the new enum
ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_status_check;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_status_check
    CHECK (status IN ('issued', 'checked_in', 'cancelled', 'revoked'));

-- Migrate old status values
UPDATE public.tickets SET status = 'issued'      WHERE status = 'upcoming';
UPDATE public.tickets SET status = 'checked_in'  WHERE status = 'checked-in';
UPDATE public.tickets SET status = 'cancelled'   WHERE status = 'cancelled';
UPDATE public.tickets SET status = 'cancelled'   WHERE status = 'past';

-- Backfill ticket_type_id from tier_id
UPDATE public.tickets SET ticket_type_id = tier_id WHERE ticket_type_id IS NULL;

-- Backfill attendee name/email from old columns
UPDATE public.tickets SET
  attendee_name  = holder_name,
  attendee_email = lower(holder_email),
  ticket_number  = ticket_id,
  issued_at      = purchased_at
WHERE attendee_name IS NULL;

-- Backfill qr_token_hash with SHA256 of the old qr_code (for backward compat)
-- NOTE: Old QR codes had no real security. This creates a hash for existing records.
-- All NEW tickets will have a proper 256-bit random token hash.
UPDATE public.tickets
SET qr_token_hash = encode(digest(qr_code_legacy, 'sha256'), 'hex')
WHERE qr_token_hash IS NULL AND qr_code_legacy IS NOT NULL;

-- ── 4. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tickets_qr_hash         ON public.tickets(qr_token_hash);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number    ON public.tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_attendee_email   ON public.tickets(lower(attendee_email));
CREATE INDEX IF NOT EXISTS idx_tickets_event_status     ON public.tickets(event_id, status);
CREATE INDEX IF NOT EXISTS idx_ticket_types_event       ON public.ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_types_active      ON public.ticket_types(event_id, is_active);

COMMIT;
