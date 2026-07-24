-- ============================================================
-- Migration 006: Production ticket lifecycle repair + batch claim
-- Future Times Events
--
-- IMPORTANT:
--   1. Review this file in full before running it.
--   2. Run it manually in the Supabase SQL Editor.
--   3. Do not run it automatically from the application or CI.
--
-- This migration is intentionally defensive. It repairs the partially
-- migrated legacy ticket/profile schema, removes stored raw legacy QR
-- values after hashing them, and installs the atomic N-ticket claim RPC.
-- ============================================================

BEGIN;

SET LOCAL lock_timeout = '15s';
SET LOCAL statement_timeout = '120s';
SET LOCAL search_path = public, extensions, pg_catalog;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL
     OR to_regclass('public.events') IS NULL
     OR to_regclass('public.tickets') IS NULL THEN
    RAISE EXCEPTION
      'Migration 006 requires public.profiles, public.events, and public.tickets';
  END IF;
END;
$$;

-- ----------------------------------------------------------------
-- 1. Repair profile roles before validating the production role set.
-- ----------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check,
  DROP CONSTRAINT IF EXISTS profiles_account_status_check;

UPDATE public.profiles
SET role = CASE
  WHEN role = 'user' THEN 'attendee'
  WHEN role = 'organizer' THEN 'event_manager'
  WHEN role IN ('attendee', 'host', 'event_manager', 'admin', 'super_admin') THEN role
  ELSE 'attendee'
END;

UPDATE public.profiles
SET account_status = 'active'
WHERE account_status IS NULL
   OR account_status NOT IN ('active', 'suspended', 'deleted');

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'attendee',
  ALTER COLUMN role SET NOT NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('attendee', 'host', 'event_manager', 'admin', 'super_admin')),
  ADD CONSTRAINT profiles_account_status_check
    CHECK (account_status IN ('active', 'suspended', 'deleted')) NOT VALID;

ALTER TABLE public.profiles
  VALIDATE CONSTRAINT profiles_account_status_check;

-- A user may edit their normal profile fields, but can never promote their
-- own role, reactivate their own suspended account, or change the profile
-- email used by ticket ownership policies. Service-role/admin operations
-- have auth.uid() = NULL or target a different profile and are unaffected.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_request_user UUID := auth.uid();
  v_request_role TEXT := COALESCE(auth.role(), '');
  v_request_email TEXT := NULLIF(auth.jwt() ->> 'email', '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Profile rows created by normal signup, OAuth hooks, or authenticated
    -- browser fallback inserts always start at the least-privileged role.
    -- A trusted service-role workflow may deliberately seed a privileged
    -- profile, but user-controlled auth metadata can never do so.
    IF v_request_role <> 'service_role' THEN
      NEW.role := 'attendee';
      NEW.account_status := 'active';
    END IF;

    -- Bind a browser-created profile to the signed Auth email instead of a
    -- caller-supplied email. Database auth hooks have no request JWT and
    -- already receive their email from auth.users.
    IF v_request_user IS NOT NULL AND v_request_email IS NOT NULL THEN
      NEW.email := lower(v_request_email);
    END IF;
  ELSIF v_request_user IS NOT NULL AND v_request_role <> 'service_role' THEN
    -- Applies to every authenticated browser update, including an admin
    -- targeting another row. Privileged changes must use a server-side
    -- service-role/admin path.
    NEW.role := OLD.role;
    NEW.account_status := OLD.account_status;
    NEW.email := OLD.email;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation
  ON public.profiles;

CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

REVOKE ALL PRIVILEGES ON FUNCTION public.prevent_profile_privilege_escalation()
  FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Anon can insert profile on signup" ON public.profiles;

-- Never expose the base profiles table as a public directory. It contains
-- private identity/contact and authorization fields (email, phone, role and
-- account_status) that cannot be hidden with a row policy alone.
CREATE OR REPLACE FUNCTION public.is_active_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND p.account_status = 'active'
  );
$$;

REVOKE ALL PRIVILEGES ON FUNCTION public.is_active_platform_admin()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_platform_admin()
  TO authenticated, service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_read" ON public.profiles;
CREATE POLICY "profiles_own_read"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_read" ON public.profiles;
CREATE POLICY "profiles_admin_read"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_active_platform_admin());

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_active_platform_admin())
  WITH CHECK (public.is_active_platform_admin());

-- Public-facing features must use this deliberately narrow projection rather
-- than joining the base profiles table. The view owner applies the explicit
-- active-account filter and the view exposes no contact or authorization data.
CREATE OR REPLACE VIEW public.public_profile_cards
WITH (security_barrier = TRUE)
AS
SELECT
  id,
  display_name,
  avatar_url,
  avatar_color,
  initials
FROM public.profiles
WHERE account_status = 'active';

REVOKE ALL PRIVILEGES ON TABLE public.public_profile_cards
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.public_profile_cards TO anon, authenticated;

-- Remove the broad grants from the legacy schema. Authenticated users may
-- create their own least-privileged profile and edit presentation fields,
-- but protected identity/authorization columns are not update-grantable.
REVOKE SELECT ON public.profiles FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT (
  id, email, display_name, avatar_url, avatar_color, initials, bio,
  location, phone, role, account_status
) ON public.profiles TO authenticated;
GRANT UPDATE (
  display_name, avatar_url, avatar_color, initials, bio, location, phone
) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- ----------------------------------------------------------------
-- 2. Repair event compatibility fields and status values.
-- ----------------------------------------------------------------

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS venue_name TEXT,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS doors_open_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Africa/Harare',
  ADD COLUMN IF NOT EXISTS attendees INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ticket_claim_opens_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ticket_claim_closes_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'venue'
  ) THEN
    EXECUTE $sql$
      UPDATE public.events
      SET venue_name = COALESCE(NULLIF(venue_name, ''), venue)
      WHERE venue_name IS NULL OR venue_name = ''
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'date'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'time'
  ) THEN
    EXECUTE $sql$
      UPDATE public.events
      SET starts_at = (
        date::TEXT || 'T' || COALESCE(time::TEXT, '00:00:00') || '+02:00'
      )::TIMESTAMPTZ
      WHERE starts_at IS NULL
        AND date IS NOT NULL
    $sql$;
  END IF;
END;
$$;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_status_check;

UPDATE public.events
SET status = 'draft'
WHERE status IS NULL
   OR status NOT IN (
     'draft', 'scheduled', 'published', 'sold_out',
     'completed', 'cancelled', 'postponed', 'archived'
   );

ALTER TABLE public.events
  ADD CONSTRAINT events_status_check
    CHECK (status IN (
      'draft', 'scheduled', 'published', 'sold_out',
      'completed', 'cancelled', 'postponed', 'archived'
    ));

UPDATE public.events
SET attendees = GREATEST(COALESCE(attendees, 0), 0),
    capacity = GREATEST(COALESCE(capacity, 0), 0);

-- ----------------------------------------------------------------
-- 3. Converge ticket_tiers -> ticket_types without assuming that the
--    earlier rename completed successfully.
-- ----------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.ticket_types') IS NOT NULL
     AND to_regclass('public.ticket_tiers') IS NOT NULL THEN
    RAISE EXCEPTION
      'Both public.ticket_types and public.ticket_tiers exist. Reconcile the duplicate tier tables before migration 006.';
  ELSIF to_regclass('public.ticket_types') IS NULL
     AND to_regclass('public.ticket_tiers') IS NOT NULL THEN
    ALTER TABLE public.ticket_tiers RENAME TO ticket_types;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.ticket_types (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                 UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  description              TEXT NOT NULL DEFAULT '',
  price                    NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity_total           INTEGER NOT NULL DEFAULT 0,
  quantity_available       INTEGER NOT NULL DEFAULT 0,
  claim_limit_per_contact  INTEGER NOT NULL DEFAULT 1,
  claim_opens_at           TIMESTAMPTZ,
  claim_closes_at          TIMESTAMPTZ,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible               BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order               INTEGER NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ticket_types
  ADD COLUMN IF NOT EXISTS quantity_total INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_available INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claim_limit_per_contact INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS claim_opens_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claim_closes_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ticket_types'
      AND column_name = 'total'
  ) THEN
    EXECUTE $sql$
      UPDATE public.ticket_types
      SET quantity_total = GREATEST(COALESCE(quantity_total, total, 0), 0)
      WHERE quantity_total = 0 AND COALESCE(total, 0) > 0
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ticket_types'
      AND column_name = 'available'
  ) THEN
    EXECUTE $sql$
      UPDATE public.ticket_types
      SET quantity_available = GREATEST(COALESCE(quantity_available, available, 0), 0)
      WHERE quantity_available = 0 AND COALESCE(available, 0) > 0
    $sql$;
  END IF;
END;
$$;

-- ----------------------------------------------------------------
-- 4. Ensure claims exist and can be bound to an authenticated user.
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ticket_claims (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  ticket_type_id        UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE RESTRICT,
  user_id               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  quantity              INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  attendee_name         TEXT NOT NULL,
  attendee_email        TEXT NOT NULL,
  attendee_phone        TEXT,
  status                TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled')),
  idempotency_key       TEXT UNIQUE,
  show_in_whos_going    BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_opt_in      BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source                TEXT NOT NULL DEFAULT 'web',
  ip_hash               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ticket_claims
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_claims_idempotency
  ON public.ticket_claims(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ----------------------------------------------------------------
-- 5. Repair the legacy tickets table before new inserts.
-- ----------------------------------------------------------------

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS ticket_number TEXT,
  ADD COLUMN IF NOT EXISTS ticket_sequence BIGINT,
  ADD COLUMN IF NOT EXISTS ticket_type_id UUID REFERENCES public.ticket_types(id),
  ADD COLUMN IF NOT EXISTS claim_id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS attendee_name TEXT,
  ADD COLUMN IF NOT EXISTS attendee_email TEXT,
  ADD COLUMN IF NOT EXISTS attendee_phone TEXT,
  ADD COLUMN IF NOT EXISTS qr_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS gate TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'tier_id'
  ) THEN
    EXECUTE $sql$
      UPDATE public.tickets
      SET ticket_type_id = tier_id
      WHERE ticket_type_id IS NULL AND tier_id IS NOT NULL
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'ticket_id'
  ) THEN
    EXECUTE $sql$
      UPDATE public.tickets
      SET ticket_number = ticket_id
      WHERE ticket_number IS NULL AND ticket_id IS NOT NULL
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'holder_name'
  ) THEN
    EXECUTE $sql$
      UPDATE public.tickets
      SET attendee_name = holder_name
      WHERE attendee_name IS NULL AND holder_name IS NOT NULL
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'holder_email'
  ) THEN
    EXECUTE $sql$
      UPDATE public.tickets
      SET attendee_email = lower(holder_email)
      WHERE attendee_email IS NULL AND holder_email IS NOT NULL
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'purchased_at'
  ) THEN
    EXECUTE $sql$
      UPDATE public.tickets
      SET issued_at = COALESCE(issued_at, purchased_at),
          created_at = COALESCE(created_at, purchased_at)
      WHERE purchased_at IS NOT NULL
    $sql$;
  END IF;
END;
$$;

-- ticket_type_id is the canonical relationship. Keep the legacy tier_id
-- value for audit/rollback, but remove its second relationship so PostgREST
-- embeds cannot become ambiguous.
ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_tier_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tickets_ticket_type_id_fkey'
      AND conrelid = 'public.tickets'::regclass
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_ticket_type_id_fkey
      FOREIGN KEY (ticket_type_id)
      REFERENCES public.ticket_types(id)
      ON DELETE RESTRICT
      NOT VALID;

    ALTER TABLE public.tickets
      VALIDATE CONSTRAINT tickets_ticket_type_id_fkey;
  END IF;
END;
$$;

ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_status_check;

UPDATE public.tickets SET status = 'issued' WHERE status = 'upcoming';
UPDATE public.tickets SET status = 'checked_in' WHERE status = 'checked-in';
UPDATE public.tickets SET status = 'cancelled' WHERE status = 'past';
UPDATE public.tickets
SET status = 'revoked',
    revocation_reason = COALESCE(revocation_reason, 'Invalid legacy status')
WHERE status IS NULL
   OR status NOT IN ('issued', 'checked_in', 'cancelled', 'revoked');

ALTER TABLE public.tickets
  ALTER COLUMN status SET DEFAULT 'issued',
  ADD CONSTRAINT tickets_status_check
    CHECK (status IN ('issued', 'checked_in', 'cancelled', 'revoked'));

-- Hash legacy QR credentials once, then erase every raw database copy.
DO $$
DECLARE
  v_hash_collision BOOLEAN := FALSE;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'qr_code'
  ) THEN
    EXECUTE $sql$
      SELECT EXISTS (
        SELECT 1
        FROM public.tickets AS raw_ticket
        JOIN public.tickets AS hashed_ticket
          ON hashed_ticket.id <> raw_ticket.id
         AND hashed_ticket.qr_token_hash = encode(
           digest(raw_ticket.qr_code, 'sha256'),
           'hex'
         )
        WHERE raw_ticket.qr_code IS NOT NULL
      )
    $sql$
    INTO v_hash_collision;

    IF v_hash_collision THEN
      RAISE EXCEPTION
        'A legacy qr_code collides with another stored QR hash. Resolve or revoke the duplicate credential before migration 006.';
    END IF;

    EXECUTE $sql$
      WITH ranked_legacy_qr AS (
        SELECT
          id,
          qr_code,
          ROW_NUMBER() OVER (
            PARTITION BY qr_code
            ORDER BY COALESCE(issued_at, created_at), id
          ) AS credential_position
        FROM public.tickets
        WHERE qr_code IS NOT NULL
      )
      UPDATE public.tickets AS target
      SET qr_token_hash = encode(
        digest(ranked_legacy_qr.qr_code, 'sha256'),
        'hex'
      )
      FROM ranked_legacy_qr
      WHERE target.id = ranked_legacy_qr.id
        AND target.qr_token_hash IS NULL
        AND ranked_legacy_qr.credential_position = 1
    $sql$;
    EXECUTE $sql$
      WITH ranked_legacy_qr AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY qr_code
            ORDER BY COALESCE(issued_at, created_at), id
          ) AS credential_position
        FROM public.tickets
        WHERE qr_code IS NOT NULL
      )
      UPDATE public.tickets AS target
      SET status = 'revoked',
          revocation_reason = COALESCE(
            revocation_reason,
            'Duplicate legacy QR credential revoked during migration 006'
          ),
          qr_token_hash = NULL,
          updated_at = NOW()
      FROM ranked_legacy_qr
      WHERE target.id = ranked_legacy_qr.id
        AND ranked_legacy_qr.credential_position > 1
    $sql$;
    EXECUTE 'ALTER TABLE public.tickets ALTER COLUMN qr_code DROP NOT NULL';
    EXECUTE 'UPDATE public.tickets SET qr_code = NULL WHERE qr_code IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'qr_code_legacy'
  ) THEN
    EXECUTE $sql$
      SELECT EXISTS (
        SELECT 1
        FROM public.tickets AS raw_ticket
        JOIN public.tickets AS hashed_ticket
          ON hashed_ticket.id <> raw_ticket.id
         AND hashed_ticket.qr_token_hash = encode(
           digest(raw_ticket.qr_code_legacy, 'sha256'),
           'hex'
         )
        WHERE raw_ticket.qr_code_legacy IS NOT NULL
      )
    $sql$
    INTO v_hash_collision;

    IF v_hash_collision THEN
      RAISE EXCEPTION
        'A legacy qr_code_legacy value collides with another stored QR hash. Resolve or revoke the duplicate credential before migration 006.';
    END IF;

    EXECUTE $sql$
      WITH ranked_legacy_qr AS (
        SELECT
          id,
          qr_code_legacy,
          ROW_NUMBER() OVER (
            PARTITION BY qr_code_legacy
            ORDER BY COALESCE(issued_at, created_at), id
          ) AS credential_position
        FROM public.tickets
        WHERE qr_code_legacy IS NOT NULL
      )
      UPDATE public.tickets AS target
      SET qr_token_hash = encode(
        digest(ranked_legacy_qr.qr_code_legacy, 'sha256'),
        'hex'
      )
      FROM ranked_legacy_qr
      WHERE target.id = ranked_legacy_qr.id
        AND target.qr_token_hash IS NULL
        AND ranked_legacy_qr.credential_position = 1
    $sql$;
    EXECUTE $sql$
      WITH ranked_legacy_qr AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY qr_code_legacy
            ORDER BY COALESCE(issued_at, created_at), id
          ) AS credential_position
        FROM public.tickets
        WHERE qr_code_legacy IS NOT NULL
      )
      UPDATE public.tickets AS target
      SET status = 'revoked',
          revocation_reason = COALESCE(
            revocation_reason,
            'Duplicate legacy QR credential revoked during migration 006'
          ),
          qr_token_hash = NULL,
          updated_at = NOW()
      FROM ranked_legacy_qr
      WHERE target.id = ranked_legacy_qr.id
        AND ranked_legacy_qr.credential_position > 1
    $sql$;
    EXECUTE 'ALTER TABLE public.tickets ALTER COLUMN qr_code_legacy DROP NOT NULL';
    EXECUTE 'UPDATE public.tickets SET qr_code_legacy = NULL WHERE qr_code_legacy IS NOT NULL';
  END IF;
END;
$$;

-- Duplicate legacy QR values cannot safely identify one admission. Keep the
-- first credential and revoke the duplicates so a scan can never be ambiguous.
WITH duplicate_hashes AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY qr_token_hash
      ORDER BY COALESCE(issued_at, created_at), id
    ) AS duplicate_position
  FROM public.tickets
  WHERE qr_token_hash IS NOT NULL
)
UPDATE public.tickets AS t
SET status = 'revoked',
    revocation_reason = COALESCE(
      t.revocation_reason,
      'Duplicate legacy QR credential revoked during migration 006'
    ),
    qr_token_hash = NULL,
    updated_at = NOW()
FROM duplicate_hashes AS d
WHERE d.id = t.id
  AND d.duplicate_position > 1;

-- The earlier secure migration added new columns but left these old required
-- fields NOT NULL. New production inserts intentionally do not write them.
DO $$
DECLARE
  v_column TEXT;
BEGIN
  FOREACH v_column IN ARRAY ARRAY[
    'ticket_id', 'tier_id', 'holder_name', 'holder_email',
    'qr_code', 'qr_code_legacy', 'purchased_at'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tickets'
        AND column_name = v_column
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.tickets ALTER COLUMN %I DROP NOT NULL',
        v_column
      );
    END IF;
  END LOOP;
END;
$$;

CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq
  AS BIGINT
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1
  NO CYCLE;

WITH current_max AS (
  SELECT COALESCE(MAX(ticket_sequence), 0) AS max_sequence
  FROM public.tickets
),
ranked AS (
  SELECT
    t.id,
    ROW_NUMBER() OVER (
      ORDER BY COALESCE(t.issued_at, t.created_at), t.id
    )::BIGINT AS position
  FROM public.tickets AS t
  WHERE t.ticket_sequence IS NULL
)
UPDATE public.tickets AS t
SET ticket_sequence = current_max.max_sequence + ranked.position
FROM ranked, current_max
WHERE t.id = ranked.id;

DO $$
DECLARE
  v_max_sequence BIGINT;
  v_max_number_suffix BIGINT;
  v_sequence_value BIGINT;
BEGIN
  SELECT COALESCE(MAX(ticket_sequence), 0)
  INTO v_max_sequence
  FROM public.tickets;

  SELECT COALESCE(
    MAX(substring(ticket_number FROM '^FTE-([0-9]+)$')::BIGINT),
    0
  )
  INTO v_max_number_suffix
  FROM public.tickets
  WHERE ticket_number ~ '^FTE-[0-9]+$';

  v_sequence_value := GREATEST(v_max_sequence, v_max_number_suffix);

  IF v_sequence_value > 0 THEN
    PERFORM setval('public.ticket_number_seq', v_sequence_value, TRUE);
  ELSE
    PERFORM setval('public.ticket_number_seq', 1, FALSE);
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_ticket_sequence
  ON public.tickets(ticket_sequence)
  WHERE ticket_sequence IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_ticket_number_v2
  ON public.tickets(ticket_number)
  WHERE ticket_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_qr_token_hash_v2
  ON public.tickets(qr_token_hash)
  WHERE qr_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_event_active_v2
  ON public.tickets(event_id, status);

CREATE INDEX IF NOT EXISTS idx_tickets_user_issued_v2
  ON public.tickets(user_id, issued_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_tickets_claim_id'
      AND conrelid = 'public.tickets'::regclass
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT fk_tickets_claim_id
      FOREIGN KEY (claim_id)
      REFERENCES public.ticket_claims(id)
      ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END;
$$;

-- Keep the backup useful for structural rollback without retaining raw QR
-- credentials in an exposed public-schema table.
DO $$
BEGIN
  IF to_regclass('public.tickets_backup_20260720') IS NOT NULL THEN
    ALTER TABLE public.tickets_backup_20260720 ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.tickets_backup_20260720 FROM anon, authenticated;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tickets_backup_20260720'
        AND column_name = 'qr_code'
    ) THEN
      EXECUTE
        'ALTER TABLE public.tickets_backup_20260720 ALTER COLUMN qr_code DROP NOT NULL';
      EXECUTE
        'UPDATE public.tickets_backup_20260720 SET qr_code = NULL WHERE qr_code IS NOT NULL';
    END IF;
  END IF;
END;
$$;

-- ----------------------------------------------------------------
-- 6. Supporting tables used by the batch claim.
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.attendee_visibility (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id            UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_id             UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  is_visible           BOOLEAN NOT NULL DEFAULT FALSE,
  public_display_name  TEXT,
  public_message       TEXT,
  avatar_permission    BOOLEAN NOT NULL DEFAULT FALSE,
  is_moderated         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_id)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  before_state  JSONB,
  after_state   JSONB,
  ip_hash       TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type              TEXT NOT NULL,
  recipient_email   TEXT NOT NULL,
  recipient_name    TEXT,
  payload           JSONB NOT NULL DEFAULT '{}'::JSONB,
  scheduled_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status            TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed', 'cancelled')),
  attempt_count     INTEGER NOT NULL DEFAULT 0,
  provider_result   JSONB,
  idempotency_key   TEXT UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_staff (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'host'
    CHECK (role IN ('host', 'event_manager')),
  gate          TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.ticket_scans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id        UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  event_id         UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  scanner_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  gate             TEXT,
  scan_result      TEXT NOT NULL CHECK (scan_result IN (
    'valid_checked_in', 'already_checked_in', 'not_found',
    'wrong_event', 'cancelled', 'revoked', 'invalid_status',
    'invalid_token', 'event_not_open'
  )),
  reason           TEXT,
  idempotency_key  TEXT,
  scanned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata         JSONB NOT NULL DEFAULT '{}'::JSONB
);

-- Minimal scanner dashboard aggregate. Hosts never need direct SELECT access
-- to complete ticket rows (which also contain attendee contact data and the QR
-- hash) just to render issued/check-in totals.
CREATE OR REPLACE FUNCTION public.get_checkin_stats(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_id          UUID := auth.uid();
  v_total_issued      BIGINT := 0;
  v_total_checked_in  BIGINT := 0;
BEGIN
  IF p_event_id IS NULL THEN
    RETURN jsonb_build_object('result', 'invalid_event');
  END IF;

  IF v_actor_id IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.profiles AS p
       WHERE p.id = v_actor_id
         AND p.account_status = 'active'
         AND (
           p.role IN ('admin', 'super_admin')
           OR EXISTS (
             SELECT 1
             FROM public.event_staff AS es
             WHERE es.event_id = p_event_id
               AND es.user_id = v_actor_id
               AND es.is_active = TRUE
               AND es.role IN ('host', 'event_manager')
           )
         )
     ) THEN
    RETURN jsonb_build_object('result', 'unauthorized');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.events AS e
    WHERE e.id = p_event_id
  ) THEN
    RETURN jsonb_build_object('result', 'event_not_found');
  END IF;

  SELECT
    COALESCE(
      SUM(GREATEST(COALESCE(t.quantity, 1), 1))
        FILTER (WHERE t.status IN ('issued', 'checked_in')),
      0
    ),
    COALESCE(
      SUM(GREATEST(COALESCE(t.quantity, 1), 1))
        FILTER (WHERE t.status = 'checked_in'),
      0
    )
  INTO v_total_issued, v_total_checked_in
  FROM public.tickets AS t
  WHERE t.event_id = p_event_id;

  RETURN jsonb_build_object(
    'result', 'success',
    'event_id', p_event_id,
    'total_issued', v_total_issued,
    'total_checked_in', v_total_checked_in,
    'remaining_to_scan', GREATEST(v_total_issued - v_total_checked_in, 0)
  );
END;
$$;

REVOKE ALL PRIVILEGES ON FUNCTION public.get_checkin_stats(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_checkin_stats(UUID)
  TO authenticated, service_role;

ALTER TABLE public.ticket_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendee_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;

-- Re-establish the minimum production read policies in case an earlier
-- migration stopped before policy creation.
DROP POLICY IF EXISTS "ticket_types_public_read" ON public.ticket_types;
CREATE POLICY "ticket_types_public_read"
  ON public.ticket_types
  FOR SELECT
  TO anon, authenticated
  USING (is_visible = TRUE);

DROP POLICY IF EXISTS "tickets_own_read" ON public.tickets;
CREATE POLICY "tickets_own_read"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(attendee_email) = lower((
      SELECT p.email
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "tickets_host_read" ON public.tickets;
-- Hosts read aggregate counts through get_checkin_stats(UUID). Direct ticket
-- reads are intentionally limited to the ticket owner and active admins.

DROP POLICY IF EXISTS "tickets_admin_read" ON public.tickets;
CREATE POLICY "tickets_admin_read"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
        AND p.account_status = 'active'
    )
  );

DROP POLICY IF EXISTS "ticket_claims_own_read" ON public.ticket_claims;
CREATE POLICY "ticket_claims_own_read"
  ON public.ticket_claims
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(attendee_email) = lower((
      SELECT p.email
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "ticket_claims_admin_read" ON public.ticket_claims;
CREATE POLICY "ticket_claims_admin_read"
  ON public.ticket_claims
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
        AND p.account_status = 'active'
    )
  );

DROP POLICY IF EXISTS "Event staff viewable by authenticated"
  ON public.event_staff;
DROP POLICY IF EXISTS "event_staff_admin_read" ON public.event_staff;
DROP POLICY IF EXISTS "event_staff_own_read" ON public.event_staff;
CREATE POLICY "event_staff_own_read"
  ON public.event_staff
  FOR SELECT
  TO authenticated
  USING (
    (
      user_id = auth.uid()
      AND is_active = TRUE
      AND EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = auth.uid()
          AND p.account_status = 'active'
      )
    )
    OR public.is_active_platform_admin()
  );

DROP POLICY IF EXISTS "ticket_scans_host_read" ON public.ticket_scans;
DROP POLICY IF EXISTS "ticket_scans_authorized_read" ON public.ticket_scans;
CREATE POLICY "ticket_scans_authorized_read"
  ON public.ticket_scans
  FOR SELECT
  TO authenticated
  USING (
    (
      scanner_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = auth.uid()
          AND p.account_status = 'active'
      )
      AND EXISTS (
        SELECT 1
        FROM public.event_staff AS es
        WHERE es.event_id = ticket_scans.event_id
          AND es.user_id = auth.uid()
          AND es.is_active = TRUE
          AND es.role IN ('host', 'event_manager')
      )
    )
    OR public.is_active_platform_admin()
  );

REVOKE INSERT, UPDATE, DELETE ON public.ticket_types
  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.tickets
  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ticket_claims
  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.event_staff
  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ticket_scans
  FROM anon, authenticated;

GRANT SELECT ON public.ticket_types TO anon, authenticated;
GRANT SELECT ON public.tickets, public.ticket_claims, public.event_staff
  TO authenticated;
GRANT SELECT ON public.ticket_scans TO authenticated;
GRANT ALL ON public.ticket_types, public.tickets, public.ticket_claims,
  public.event_staff, public.ticket_scans, public.attendee_visibility, public.audit_logs,
  public.notification_jobs TO service_role;

-- Recompute canonical issued counts before enforcing future capacity.
UPDATE public.events AS e
SET attendees = COALESCE((
  SELECT SUM(GREATEST(COALESCE(t.quantity, 1), 1))::INTEGER
  FROM public.tickets AS t
  WHERE t.event_id = e.id
    AND t.status IN ('issued', 'checked_in')
), 0);

UPDATE public.ticket_types AS tt
SET quantity_total = GREATEST(COALESCE(tt.quantity_total, 0), 0),
    quantity_available = GREATEST(
      GREATEST(COALESCE(tt.quantity_total, 0), 0) - COALESCE((
        SELECT SUM(GREATEST(COALESCE(t.quantity, 1), 1))::INTEGER
        FROM public.tickets AS t
        WHERE t.ticket_type_id = tt.id
          AND t.status IN ('issued', 'checked_in')
      ), 0),
      0
    ),
    updated_at = NOW();

ALTER TABLE public.ticket_types
  DROP CONSTRAINT IF EXISTS ticket_types_quantity_total_check,
  DROP CONSTRAINT IF EXISTS ticket_types_quantity_available_check,
  DROP CONSTRAINT IF EXISTS ticket_types_claim_limit_check;

ALTER TABLE public.ticket_types
  ADD CONSTRAINT ticket_types_quantity_total_check
    CHECK (quantity_total >= 0),
  ADD CONSTRAINT ticket_types_quantity_available_check
    CHECK (
      quantity_available >= 0
      AND quantity_available <= quantity_total
    ),
  ADD CONSTRAINT ticket_types_claim_limit_check
    CHECK (claim_limit_per_contact >= 0);

-- ----------------------------------------------------------------
-- 7. Atomic batch claim: one database ticket + one QR hash for each
--    admission. Raw QR tokens never enter PostgreSQL.
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_tickets_batch_atomic(
  p_event_id              UUID,
  p_ticket_type_id        UUID,
  p_user_id               UUID,
  p_attendee_name         TEXT,
  p_attendee_email        TEXT,
  p_attendee_phone        TEXT,
  p_quantity              INTEGER,
  p_idempotency_key       UUID,
  p_show_in_whos_going    BOOLEAN,
  p_marketing_opt_in      BOOLEAN,
  p_qr_token_hashes       TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_event                 public.events%ROWTYPE;
  v_ticket_type           public.ticket_types%ROWTYPE;
  v_existing_claim        public.ticket_claims%ROWTYPE;
  v_claim_id              UUID;
  v_ticket_id             UUID;
  v_ticket_number         TEXT;
  v_ticket_sequence       BIGINT;
  v_existing_quantity     INTEGER := 0;
  v_event_attendees       INTEGER := 0;
  v_remaining             INTEGER := 0;
  v_index                 INTEGER;
  v_ticket_results        JSONB := '[]'::JSONB;
  v_existing_results      JSONB := '[]'::JSONB;
BEGIN
  IF p_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('result', 'invalid_idempotency_key');
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 10 THEN
    RETURN jsonb_build_object('result', 'invalid_quantity');
  END IF;

  IF p_attendee_name IS NULL
     OR char_length(btrim(p_attendee_name)) < 2
     OR p_attendee_email IS NULL
     OR position('@' IN p_attendee_email) < 2 THEN
    RETURN jsonb_build_object('result', 'invalid_attendee');
  END IF;

  IF COALESCE(array_length(p_qr_token_hashes, 1), 0) <> p_quantity THEN
    RETURN jsonb_build_object('result', 'invalid_token_hashes');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_qr_token_hashes) AS token_hash
    WHERE token_hash IS NULL OR token_hash !~ '^[0-9a-f]{64}$'
  ) OR (
    SELECT COUNT(DISTINCT token_hash)
    FROM unnest(p_qr_token_hashes) AS token_hash
  ) <> p_quantity THEN
    RETURN jsonb_build_object('result', 'invalid_token_hashes');
  END IF;

  -- Serialize every request sharing this idempotency key, including requests
  -- that accidentally target different events.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_idempotency_key::TEXT, 0)
  );

  SELECT *
  INTO v_existing_claim
  FROM public.ticket_claims
  WHERE idempotency_key = p_idempotency_key::TEXT;

  IF FOUND THEN
    IF v_existing_claim.event_id <> p_event_id
       OR v_existing_claim.ticket_type_id <> p_ticket_type_id
       OR v_existing_claim.user_id IS DISTINCT FROM p_user_id
       OR lower(btrim(v_existing_claim.attendee_email))
          <> lower(btrim(p_attendee_email))
       OR btrim(v_existing_claim.attendee_name) <> btrim(p_attendee_name)
       OR COALESCE(btrim(v_existing_claim.attendee_phone), '')
          <> COALESCE(btrim(p_attendee_phone), '')
       OR v_existing_claim.quantity <> p_quantity
       OR v_existing_claim.show_in_whos_going
          <> COALESCE(p_show_in_whos_going, FALSE)
       OR v_existing_claim.marketing_opt_in
          <> COALESCE(p_marketing_opt_in, FALSE) THEN
      RETURN jsonb_build_object('result', 'idempotency_conflict');
    END IF;

    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'ticket_id', t.id,
          'ticket_number', t.ticket_number,
          'token_index', COALESCE(
            (t.metadata ->> 'batch_token_index')::INTEGER,
            0
          )
        )
        ORDER BY t.ticket_sequence, t.id
      ),
      '[]'::JSONB
    )
    INTO v_existing_results
    FROM public.tickets AS t
    WHERE t.claim_id = v_existing_claim.id;

    RETURN jsonb_build_object(
      'result', 'already_claimed',
      'claim_id', v_existing_claim.id,
      'quantity', v_existing_claim.quantity,
      'tickets', v_existing_results,
      'requires_qr_reissue', TRUE
    );
  END IF;

  -- Fixed lock order: event first, then ticket type. This serializes the
  -- canonical event attendee count and prevents cross-tier overbooking.
  SELECT *
  INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'event_not_found');
  END IF;

  IF v_event.status <> 'published' THEN
    RETURN jsonb_build_object(
      'result', 'event_not_available',
      'status', v_event.status
    );
  END IF;

  IF v_event.ticket_claim_opens_at IS NOT NULL
     AND NOW() < v_event.ticket_claim_opens_at THEN
    RETURN jsonb_build_object(
      'result', 'claim_not_open',
      'opens_at', v_event.ticket_claim_opens_at
    );
  END IF;

  IF v_event.ticket_claim_closes_at IS NOT NULL
     AND NOW() > v_event.ticket_claim_closes_at THEN
    RETURN jsonb_build_object('result', 'claim_closed');
  END IF;

  SELECT *
  INTO v_ticket_type
  FROM public.ticket_types
  WHERE id = p_ticket_type_id
    AND event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND
     OR NOT v_ticket_type.is_active
     OR NOT v_ticket_type.is_visible THEN
    RETURN jsonb_build_object('result', 'invalid_ticket_type');
  END IF;

  IF v_ticket_type.claim_opens_at IS NOT NULL
     AND NOW() < v_ticket_type.claim_opens_at THEN
    RETURN jsonb_build_object(
      'result', 'claim_not_open',
      'opens_at', v_ticket_type.claim_opens_at
    );
  END IF;

  IF v_ticket_type.claim_closes_at IS NOT NULL
     AND NOW() > v_ticket_type.claim_closes_at THEN
    RETURN jsonb_build_object('result', 'claim_closed');
  END IF;

  SELECT COALESCE(SUM(GREATEST(COALESCE(t.quantity, 1), 1)), 0)::INTEGER
  INTO v_existing_quantity
  FROM public.tickets AS t
  WHERE t.ticket_type_id = p_ticket_type_id
    AND t.status IN ('issued', 'checked_in')
    AND (
      (p_user_id IS NOT NULL AND t.user_id = p_user_id)
      OR lower(t.attendee_email) = lower(p_attendee_email)
    );

  IF v_ticket_type.claim_limit_per_contact > 0
     AND v_existing_quantity + p_quantity
       > v_ticket_type.claim_limit_per_contact THEN
    RETURN jsonb_build_object(
      'result', 'claim_limit_exceeded',
      'limit', v_ticket_type.claim_limit_per_contact,
      'held', v_existing_quantity
    );
  END IF;

  IF v_ticket_type.quantity_available < p_quantity THEN
    RETURN jsonb_build_object(
      'result', 'sold_out',
      'available', v_ticket_type.quantity_available
    );
  END IF;

  v_event_attendees := GREATEST(COALESCE(v_event.attendees, 0), 0);

  IF v_event.capacity > 0
     AND v_event_attendees + p_quantity > v_event.capacity THEN
    RETURN jsonb_build_object(
      'result', 'event_capacity_exceeded',
      'available', GREATEST(v_event.capacity - v_event_attendees, 0)
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.tickets AS t
    WHERE t.qr_token_hash = ANY(p_qr_token_hashes)
  ) THEN
    RETURN jsonb_build_object('result', 'duplicate_token_hash');
  END IF;

  INSERT INTO public.ticket_claims (
    event_id,
    ticket_type_id,
    user_id,
    quantity,
    attendee_name,
    attendee_email,
    attendee_phone,
    idempotency_key,
    show_in_whos_going,
    marketing_opt_in,
    terms_accepted_at,
    status
  ) VALUES (
    p_event_id,
    p_ticket_type_id,
    p_user_id,
    p_quantity,
    btrim(p_attendee_name),
    lower(btrim(p_attendee_email)),
    NULLIF(btrim(p_attendee_phone), ''),
    p_idempotency_key::TEXT,
    COALESCE(p_show_in_whos_going, FALSE),
    COALESCE(p_marketing_opt_in, FALSE),
    NOW(),
    'confirmed'
  )
  RETURNING id INTO v_claim_id;

  v_remaining := v_ticket_type.quantity_available - p_quantity;
  v_event_attendees := v_event_attendees + p_quantity;

  UPDATE public.ticket_types
  SET quantity_available = v_remaining,
      updated_at = NOW()
  WHERE id = p_ticket_type_id;

  UPDATE public.events
  SET attendees = v_event_attendees,
      status = CASE
        WHEN capacity > 0 AND v_event_attendees >= capacity THEN 'sold_out'
        ELSE status
      END,
      updated_at = NOW()
  WHERE id = p_event_id;

  FOR v_index IN 1..p_quantity LOOP
    v_ticket_sequence := nextval('public.ticket_number_seq');
    v_ticket_number := 'FTE-' || lpad(
      v_ticket_sequence::TEXT,
      GREATEST(8, char_length(v_ticket_sequence::TEXT)),
      '0'
    );

    INSERT INTO public.tickets (
      ticket_number,
      ticket_sequence,
      event_id,
      ticket_type_id,
      claim_id,
      user_id,
      attendee_name,
      attendee_email,
      attendee_phone,
      qr_token_hash,
      quantity,
      status,
      issued_at,
      metadata
    ) VALUES (
      v_ticket_number,
      v_ticket_sequence,
      p_event_id,
      p_ticket_type_id,
      v_claim_id,
      p_user_id,
      btrim(p_attendee_name),
      lower(btrim(p_attendee_email)),
      NULLIF(btrim(p_attendee_phone), ''),
      p_qr_token_hashes[v_index],
      1,
      'issued',
      NOW(),
      jsonb_build_object('batch_token_index', v_index - 1)
    )
    RETURNING id INTO v_ticket_id;

    INSERT INTO public.attendee_visibility (
      ticket_id,
      event_id,
      is_visible
    ) VALUES (
      v_ticket_id,
      p_event_id,
      COALESCE(p_show_in_whos_going, FALSE) AND v_index = 1
    )
    ON CONFLICT (ticket_id) DO NOTHING;

    v_ticket_results := v_ticket_results || jsonb_build_array(
      jsonb_build_object(
        'ticket_id', v_ticket_id,
        'ticket_number', v_ticket_number,
        'token_index', v_index - 1
      )
    );
  END LOOP;

  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    after_state
  ) VALUES (
    p_user_id,
    'ticket.claim.batch',
    'ticket_claim',
    v_claim_id,
    jsonb_build_object(
      'event_id', p_event_id,
      'ticket_type_id', p_ticket_type_id,
      'quantity', p_quantity,
      'first_ticket_number', v_ticket_results -> 0 ->> 'ticket_number',
      'last_ticket_number',
        v_ticket_results -> (p_quantity - 1) ->> 'ticket_number'
    )
  );

  RETURN jsonb_build_object(
    'result', 'success',
    'claim_id', v_claim_id,
    'quantity', p_quantity,
    'remaining', v_remaining,
    'event_attendees', v_event_attendees,
    'tickets', v_ticket_results,
    'requires_qr_reissue', FALSE
  );
END;
$$;

-- Atomic, online-only check-in. The database independently verifies the
-- scanner's active account and assignment, then locks the ticket row so only
-- the first concurrent scan can change it from issued to checked_in.
CREATE OR REPLACE FUNCTION public.verify_and_checkin(
  p_token_hash TEXT,
  p_scanner_id UUID,
  p_event_id   UUID,
  p_gate       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_ticket         public.tickets%ROWTYPE;
  v_event          public.events%ROWTYPE;
  v_scan_id        UUID;
  v_checked_in_at  TIMESTAMPTZ;
BEGIN
  IF p_scanner_id IS NULL
     OR p_event_id IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.profiles AS p
       WHERE p.id = p_scanner_id
         AND p.account_status = 'active'
         AND (
           p.role IN ('admin', 'super_admin')
           OR EXISTS (
             SELECT 1
             FROM public.event_staff AS es
             WHERE es.event_id = p_event_id
               AND es.user_id = p_scanner_id
               AND es.is_active = TRUE
               AND es.role IN ('host', 'event_manager')
           )
         )
     ) THEN
    RETURN jsonb_build_object('result', 'unauthorized');
  END IF;

  SELECT *
  INTO v_event
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'event_not_open');
  END IF;

  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    INSERT INTO public.ticket_scans (
      event_id, scanner_id, gate, scan_result
    ) VALUES (
      p_event_id, p_scanner_id, p_gate, 'invalid_token'
    );
    RETURN jsonb_build_object('result', 'invalid_token');
  END IF;

  SELECT *
  INTO v_ticket
  FROM public.tickets
  WHERE qr_token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.ticket_scans (
      event_id, scanner_id, gate, scan_result
    ) VALUES (
      p_event_id, p_scanner_id, p_gate, 'not_found'
    );
    RETURN jsonb_build_object('result', 'not_found');
  END IF;

  IF v_ticket.event_id <> p_event_id THEN
    INSERT INTO public.ticket_scans (
      ticket_id, event_id, scanner_id, gate, scan_result
    ) VALUES (
      v_ticket.id, p_event_id, p_scanner_id, p_gate, 'wrong_event'
    );
    RETURN jsonb_build_object('result', 'wrong_event');
  END IF;

  -- A completed/cancelled/postponed event is never an open admission gate.
  IF v_event.status NOT IN ('published', 'sold_out') THEN
    INSERT INTO public.ticket_scans (
      ticket_id, event_id, scanner_id, gate, scan_result
    ) VALUES (
      v_ticket.id, p_event_id, p_scanner_id, p_gate, 'event_not_open'
    );
    RETURN jsonb_build_object(
      'result', 'event_not_open',
      'event_status', v_event.status
    );
  END IF;

  IF v_ticket.status = 'checked_in' THEN
    INSERT INTO public.ticket_scans (
      ticket_id, event_id, scanner_id, gate, scan_result
    ) VALUES (
      v_ticket.id, p_event_id, p_scanner_id, p_gate, 'already_checked_in'
    );
    RETURN jsonb_build_object(
      'result', 'already_checked_in',
      'checked_in_at', v_ticket.checked_in_at,
      'gate', v_ticket.gate,
      'attendee_name', v_ticket.attendee_name,
      'ticket_number', v_ticket.ticket_number
    );
  END IF;

  IF v_ticket.status = 'cancelled' THEN
    INSERT INTO public.ticket_scans (
      ticket_id, event_id, scanner_id, gate, scan_result
    ) VALUES (
      v_ticket.id, p_event_id, p_scanner_id, p_gate, 'cancelled'
    );
    RETURN jsonb_build_object('result', 'cancelled');
  END IF;

  IF v_ticket.status = 'revoked' THEN
    INSERT INTO public.ticket_scans (
      ticket_id, event_id, scanner_id, gate, scan_result
    ) VALUES (
      v_ticket.id, p_event_id, p_scanner_id, p_gate, 'revoked'
    );
    RETURN jsonb_build_object('result', 'revoked');
  END IF;

  IF v_ticket.status <> 'issued' THEN
    INSERT INTO public.ticket_scans (
      ticket_id, event_id, scanner_id, gate, scan_result
    ) VALUES (
      v_ticket.id, p_event_id, p_scanner_id, p_gate, 'invalid_status'
    );
    RETURN jsonb_build_object(
      'result', 'invalid_status',
      'status', v_ticket.status
    );
  END IF;

  v_checked_in_at := NOW();

  UPDATE public.tickets
  SET status = 'checked_in',
      checked_in_at = v_checked_in_at,
      checked_in_by = p_scanner_id,
      gate = p_gate,
      updated_at = v_checked_in_at
  WHERE id = v_ticket.id;

  INSERT INTO public.ticket_scans (
    ticket_id, event_id, scanner_id, gate, scan_result
  ) VALUES (
    v_ticket.id, p_event_id, p_scanner_id, p_gate, 'valid_checked_in'
  )
  RETURNING id INTO v_scan_id;

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, after_state
  ) VALUES (
    p_scanner_id,
    'ticket.checkin',
    'ticket',
    v_ticket.id,
    jsonb_build_object(
      'gate', p_gate,
      'scan_id', v_scan_id,
      'ticket_number', v_ticket.ticket_number,
      'checked_in_at', v_checked_in_at
    )
  );

  RETURN jsonb_build_object(
    'result', 'valid_checked_in',
    'ticket_number', v_ticket.ticket_number,
    'attendee_name', v_ticket.attendee_name,
    'ticket_type_id', v_ticket.ticket_type_id,
    'checked_in_at', v_checked_in_at,
    'scan_id', v_scan_id
  );
END;
$$;

-- SECURITY DEFINER mutation functions must not be callable directly by a
-- browser role. The application calls them only with the server-side
-- service-role client after request authentication/validation.
DO $$
DECLARE
  v_function RECORD;
BEGIN
  FOR v_function IN
    SELECT
      p.proname,
      p.oid::regprocedure::TEXT AS signature
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'claim_ticket_atomic',
        'claim_tickets_batch_atomic',
        'verify_and_checkin'
      )
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON FUNCTION %s FROM PUBLIC',
      v_function.signature
    );
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON FUNCTION %s FROM anon',
      v_function.signature
    );
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON FUNCTION %s FROM authenticated',
      v_function.signature
    );
    IF v_function.proname = 'claim_ticket_atomic' THEN
      -- The legacy RPC creates one multi-quantity row and caller-supplied
      -- numbers, so no application role may use it after this migration.
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON FUNCTION %s FROM service_role',
        v_function.signature
      );
    ELSE
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %s TO service_role',
        v_function.signature
      );
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_tickets_batch_atomic(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, UUID, BOOLEAN, BOOLEAN, TEXT[]
) TO service_role;

COMMIT;

-- ============================================================
-- Post-run verification (read-only; run manually after COMMIT)
-- ============================================================
-- SELECT COUNT(*) FILTER (
--   WHERE NULLIF(
--     COALESCE(
--       to_jsonb(t) ->> 'qr_code',
--       to_jsonb(t) ->> 'qr_code_legacy'
--     ),
--     ''
--   ) IS NOT NULL
-- ) AS raw_qr_rows
-- FROM public.tickets AS t;
--
-- SELECT ticket_number, ticket_sequence, quantity, status
-- FROM public.tickets
-- ORDER BY ticket_sequence DESC NULLS LAST
-- LIMIT 20;
--
-- SELECT event_id, quantity_total, quantity_available,
--        claim_limit_per_contact
-- FROM public.ticket_types
-- ORDER BY event_id, sort_order;
--
-- SELECT routine_name, grantee, privilege_type
-- FROM information_schema.routine_privileges
-- WHERE routine_schema = 'public'
--   AND routine_name IN (
--     'claim_ticket_atomic',
--     'claim_tickets_batch_atomic',
--     'verify_and_checkin'
--   )
-- ORDER BY routine_name, grantee;
