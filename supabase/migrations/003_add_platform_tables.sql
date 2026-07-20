-- ============================================================
-- Migration 003: Add all missing platform tables
-- Future Times Events Platform
-- Created: 2026-07-20
-- ============================================================

BEGIN;

-- ── 1. ticket_claims — order record ──────────────────────────
CREATE TABLE IF NOT EXISTS public.ticket_claims (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  ticket_type_id   UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE RESTRICT,
  quantity         INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  attendee_name    TEXT NOT NULL,
  attendee_email   TEXT NOT NULL,
  attendee_phone   TEXT DEFAULT NULL,
  status           TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled')),
  idempotency_key  TEXT UNIQUE DEFAULT NULL,
  show_in_whos_going BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted_at TIMESTAMPTZ DEFAULT NOW(),
  source           TEXT NOT NULL DEFAULT 'web',
  ip_hash          TEXT DEFAULT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add claim_id foreign key back to tickets
ALTER TABLE public.tickets
  ADD CONSTRAINT fk_tickets_claim_id
    FOREIGN KEY (claim_id) REFERENCES public.ticket_claims(id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;

-- ── 2. ticket_scans — immutable audit of every scan attempt ──
CREATE TABLE IF NOT EXISTS public.ticket_scans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id        UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  event_id         UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  scanner_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  gate             TEXT DEFAULT NULL,
  scan_result      TEXT NOT NULL CHECK (scan_result IN (
    'valid_checked_in', 'already_checked_in', 'not_found',
    'wrong_event', 'cancelled', 'revoked', 'invalid_status',
    'invalid_token', 'event_not_open'
  )),
  reason           TEXT DEFAULT NULL,
  idempotency_key  TEXT DEFAULT NULL,
  scanned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata         JSONB NOT NULL DEFAULT '{}'
);

-- ── 3. event_staff — host and manager assignments ────────────
CREATE TABLE IF NOT EXISTS public.event_staff (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('host', 'event_manager')),
  gate         TEXT DEFAULT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by  UUID REFERENCES public.profiles(id) DEFAULT NULL,
  UNIQUE(event_id, user_id)
);

-- ── 4. event_schedule_items ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_schedule_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT DEFAULT NULL,
  performer    TEXT DEFAULT NULL,
  starts_at    TIMESTAMPTZ NOT NULL,
  ends_at      TIMESTAMPTZ DEFAULT NULL,
  stage        TEXT DEFAULT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. event_faqs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_faqs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. event_sponsors ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_sponsors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  logo_url    TEXT DEFAULT NULL,
  website_url TEXT DEFAULT NULL,
  tier        TEXT NOT NULL DEFAULT 'partner'
    CHECK (tier IN ('title', 'gold', 'silver', 'bronze', 'partner')),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. event_media ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  storage_path  TEXT DEFAULT NULL,
  media_type    TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  alt_text      TEXT DEFAULT NULL,
  caption       TEXT DEFAULT NULL,
  is_cover      BOOLEAN NOT NULL DEFAULT FALSE,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES public.profiles(id) DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 8. attendee_visibility (Who's Going) ──────────────────────
CREATE TABLE IF NOT EXISTS public.attendee_visibility (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id          UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_id           UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  is_visible         BOOLEAN NOT NULL DEFAULT FALSE,
  public_display_name TEXT DEFAULT NULL,
  public_message     TEXT DEFAULT NULL,
  avatar_permission  BOOLEAN NOT NULL DEFAULT FALSE,
  is_moderated       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_id)
);

-- ── 9. notification_jobs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type             TEXT NOT NULL,  -- 'ticket_confirmation', 'event_reminder', etc.
  recipient_email  TEXT NOT NULL,
  recipient_name   TEXT DEFAULT NULL,
  payload          JSONB NOT NULL DEFAULT '{}',
  scheduled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status           TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed', 'cancelled')),
  attempt_count    INTEGER NOT NULL DEFAULT 0,
  provider_result  JSONB DEFAULT NULL,
  idempotency_key  TEXT UNIQUE DEFAULT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 10. audit_logs — immutable platform audit trail ───────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,       -- 'ticket.claim', 'ticket.checkin', 'event.publish', etc.
  entity_type  TEXT NOT NULL,       -- 'ticket', 'event', 'profile', etc.
  entity_id    UUID DEFAULT NULL,
  before_state JSONB DEFAULT NULL,
  after_state  JSONB DEFAULT NULL,
  ip_hash      TEXT DEFAULT NULL,   -- hashed IP — not raw IP for privacy
  user_agent   TEXT DEFAULT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 11. Enable RLS on all new tables ─────────────────────────
ALTER TABLE public.ticket_claims      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_scans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_faqs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sponsors     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendee_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_jobs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs         ENABLE ROW LEVEL SECURITY;

-- ── 12. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ticket_claims_event        ON public.ticket_claims(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_claims_email        ON public.ticket_claims(lower(attendee_email));
CREATE INDEX IF NOT EXISTS idx_ticket_claims_idem         ON public.ticket_claims(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_ticket        ON public.ticket_scans(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_event         ON public.ticket_scans(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_scanner       ON public.ticket_scans(scanner_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_at            ON public.ticket_scans(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_staff_event          ON public.event_staff(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_user           ON public.event_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_event_media_event          ON public.event_media(event_id);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_status   ON public.notification_jobs(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity          ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor           ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created         ON public.audit_logs(created_at DESC);

COMMIT;
