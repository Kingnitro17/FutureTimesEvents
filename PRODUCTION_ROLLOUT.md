# Future Times Events production rollout

This release is not ready to receive bookings until every step below is
complete. The SQL files must be reviewed and run manually in the Supabase SQL
Editor. Never run all historical migration files blindly against the live
project: this repository contains duplicate historical migration numbers. For
the existing Future Times Events database, use the two reviewed files named
below in the stated order.

## 1. Back up and preflight Supabase

1. Create a restorable Supabase database backup or point-in-time recovery
   checkpoint.
2. Confirm that `liquidlounge216@gmail.com` has signed in at least once so its
   Auth user and profile exist.
3. Run this read-only preflight in the SQL Editor:

```sql
SELECT
  to_regclass('public.profiles') AS profiles,
  to_regclass('public.events') AS events,
  to_regclass('public.tickets') AS tickets,
  to_regclass('public.ticket_types') AS ticket_types,
  to_regclass('public.ticket_tiers') AS legacy_ticket_tiers;

SELECT id, email, role
FROM public.profiles
WHERE lower(email) = 'liquidlounge216@gmail.com';

SELECT id, title, slug, status, capacity, attendees
FROM public.events
WHERE slug = 'alick-macheso-peter-moyo-live';

```

Stop if any of `profiles`, `events`, or `tickets` is null, if the organizer
profile or event is missing, or if both `ticket_types` and
`legacy_ticket_tiers` are non-null. Resolve that data issue before continuing.
Do not query `ticket_types` yet when only the legacy `ticket_tiers` table
exists—the migration renames it. The production migration also stops safely if
it detects an ambiguous legacy ticket schema or QR-hash collision. The Liquid
Lounge setup later stops if it finds duplicate General Admission types.

## 2. Coordinate a short maintenance window

The currently deployed claim route uses the legacy `claim_ticket_atomic` RPC,
while this release uses `claim_tickets_batch_atomic`. Migration 006 disables
the legacy RPC and creates the new one. Therefore, coordinate migration,
deployment, and the health check in one maintenance window:

1. Pause or announce ticket reservations.
2. Run migration 006 and the Liquid Lounge setup.
3. Deploy this exact release immediately.
4. Pass the health check and the acceptance test below.
5. Reopen reservations.

Do not leave the old application running after migration 006, and do not expose
the new application before migration 006. Claims in that compatibility gap are
expected to be unavailable.

## 3. Install the production ticket lifecycle

1. Review
   [`supabase/migrations/006_production_ticketing.sql`](supabase/migrations/006_production_ticketing.sql)
   in full.
2. Paste the complete file into the Supabase SQL Editor and run it once.
3. Confirm that the transaction ends with `COMMIT`, with no error.
4. Run these read-only checks:

```sql
SELECT count(*) FILTER (
  WHERE NULLIF(
    COALESCE(
      to_jsonb(t) ->> 'qr_code',
      to_jsonb(t) ->> 'qr_code_legacy'
    ),
    ''
  ) IS NOT NULL
) AS raw_qr_rows
FROM public.tickets AS t;

SELECT ticket_number, ticket_sequence, quantity, status,
       qr_token_hash IS NOT NULL AS has_hash
FROM public.tickets
ORDER BY ticket_sequence DESC NULLS LAST
LIMIT 20;

SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'claim_ticket_atomic',
    'claim_tickets_batch_atomic',
    'verify_and_checkin'
  )
ORDER BY routine_name, grantee;
```

Expected:

- `raw_qr_rows` is `0`.
- New tickets use unique ordered `FTE-########` numbers. Existing legacy ticket
  numbers are preserved and receive a sequence value for deterministic order.
- Browser roles (`anon` and `authenticated`) cannot execute any ticket mutation
  RPC.
- `service_role` can execute only `claim_tickets_batch_atomic` and
  `verify_and_checkin`; it cannot execute the legacy `claim_ticket_atomic`.

The migration hashes and clears legacy raw QR values. A signed-in ticket owner
can use **Generate new QR** to obtain a new credential. Reissuing a QR
immediately invalidates every older screen or downloaded ticket for that
admission.

## 4. Configure the Liquid Lounge organizer and event

1. Review
   [`supabase/update_liquid_lounge_event.sql`](supabase/update_liquid_lounge_event.sql)
   in full.
2. Paste the complete file into the SQL Editor and run it once.
3. Run the verification queries included at the bottom of that file.

Expected:

- `liquidlounge216@gmail.com` is an active `event_manager`.
- It has one active `Main Gate` assignment for
  `alick-macheso-peter-moyo-live`.
- The event is `published` unless its inventory is exhausted.
- General Admission has a per-contact claim limit of `10`.
- Existing issued/check-in counts are preserved; capacity is never reduced
  below issued inventory.

## 5. Configure and deploy Netlify

Set these production environment variables in Netlify. Never put their values
in Git or expose the service-role key to browser code.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL=https://www.futuretimesevents.com
NEXT_PUBLIC_APP_VERSION=<release version>
```

If Web Push is enabled, also set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `VAPID_EMAIL`, and a long random
`PUSH_INTERNAL_SECRET` for trusted worker calls. Keep all except the public
VAPID key server-only.

Also verify in Supabase Auth:

- Site URL is the production HTTPS URL.
- Allowed redirect URLs include
  `https://www.futuretimesevents.com/auth/callback`.
- Email/password sign-in is enabled for the attendee and organizer acceptance
  accounts.

The repository pins Node 22 for production. Deploy only after the two SQL steps
above succeed. After deployment, open `/api/health`; it must return HTTP `200`
with `"status": "ok"` and `"database": "ok"`.

## 6. Required three-ticket acceptance test

Use two real accounts and two devices or browser profiles. Keep both online.

1. Before booking, record the event and General Admission counts:

```sql
SELECT e.id, e.attendees, e.capacity,
       tt.id AS ticket_type_id, tt.quantity_total, tt.quantity_available
FROM public.events AS e
JOIN public.ticket_types AS tt ON tt.event_id = e.id
WHERE e.slug = 'alick-macheso-peter-moyo-live'
  AND lower(tt.name) = 'general admission';
```

2. Sign in as a normal attendee, open the event, choose quantity `3`, accept
   the terms, and claim once.
3. Confirm the success screen and `/tickets` wallet show three separate
   admissions. Download each ticket PNG. Each must show its own ticket number
   and QR.
4. Verify the database without selecting either raw or hashed QR values:

```sql
SELECT id, ticket_number, ticket_sequence, status, quantity,
       attendee_email, created_at
FROM public.tickets
WHERE lower(attendee_email) = lower('<ATTENDEE_EMAIL>')
  AND event_id = (
    SELECT id FROM public.events
    WHERE slug = 'alick-macheso-peter-moyo-live'
  )
ORDER BY created_at DESC, ticket_sequence DESC
LIMIT 3;
```

Expected: three distinct rows, three distinct ordered ticket numbers,
`quantity = 1`, and `status = 'issued'`. The event attendee count must increase
by exactly `3`, and General Admission availability must decrease by exactly
`3`.

5. On the organizer device, sign in as
   `liquidlounge216@gmail.com`, open `/checkin`, select the event, and permit
   camera access.
6. Display the first attendee QR and scan it. Expected: admitted/checked in.
7. Scan that same QR again. Expected: already checked in; it must never produce
   a second valid admission.
8. Refresh the attendee wallet. That ticket must show checked in and must no
   longer expose an active QR or download action.
9. Scan each of the other two tickets once and confirm both are admitted.
10. Verify the audit trail:

```sql
SELECT t.ticket_number, t.status, t.checked_in_at,
       ts.scan_result, ts.scanned_at, ts.gate,
       p.email AS scanner_email
FROM public.tickets AS t
JOIN public.ticket_scans AS ts ON ts.ticket_id = t.id
LEFT JOIN public.profiles AS p ON p.id = ts.scanner_id
WHERE lower(t.attendee_email) = lower('<ATTENDEE_EMAIL>')
  AND t.event_id = (
    SELECT id FROM public.events
    WHERE slug = 'alick-macheso-peter-moyo-live'
  )
ORDER BY ts.scanned_at;
```

Expected: each ticket ends as `checked_in`; the repeated first scan has an
`already_checked_in` result; all successful scans identify the Liquid Lounge
organizer and `Main Gate`.

If any expected result differs, stop the release and keep the current
production deployment unchanged. Save the SQL error/result and application
request ID before troubleshooting.
