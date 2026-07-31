# Performance, mobile UX, and social attendance report

## Root causes

- Cold authentication could execute the profile RPC, a direct profile select, an insert, and another select sequentially. Password sign-in also called profile synchronization while the auth subscription handled the same event. The shell was already moved ahead of profile loading, but the duplicate and fallback requests remained.
- The mobile menu lacked complete dialog semantics, focus transfer/restoration, Escape handling, and scroll locking. The bottom navigation used unrelated dark styling and moved icons between states.
- Legacy RSVP policies allowed broad table reads and snapshots were created without explicit public opt-in. The new public attendee feature therefore could not safely reuse those responses as-is.
- Avatar uploads used a shared `avatars/{userId}.ext` style path, silently treated failed uploads as success, and did not roll back when the profile update failed.
- Destination labels were anchored too close to the lower oval boundary. Ticket cards needed a stronger list gap and mobile padding. Footer store controls were active links despite no released applications.

## Implementation

- `lib/auth-context.tsx`: one auth subscription, one deduplicated `get_my_profile` request, auth-metadata shell first, stale-response guard, non-blocking idempotent missing-profile insert, retry action, and `fte-auth-bootstrap` / `fte-profile-request` performance measures.
- `components/layout/Navbar.tsx`: accessible mobile dialog, body-scroll management, Escape/outside close, focus transfer and restoration, safe-area drawer sizing, and role-aware routes.
- `components/layout/MobileBottomNav.tsx`: token-based light surface, stable icons, safe-area padding, touch targets, focus rings, and `aria-current`.
- `app/api/events/[id]/attendance/route.ts` and `components/events/WhosGoing.tsx`: authenticated self-only join/leave, public opt-in filtering, safe profile allowlist, idempotent upsert, optimistic rollback, logged-out prompt, loading/empty/error states.
- `supabase/migrations/011_social_attendance_and_avatar_security.sql`: private-by-default RSVP visibility, partial index, owner-only RSVP reads, removal of anonymous RSVP/profile access, owner-scoped avatar storage policies, MIME and size constraints.
- `app/profile/page.tsx`: removed decorative banner, added normal page gap, real owner-folder upload, MIME/extension/size validation, preview, cache-busted immutable object URL, database rollback, friendly errors, and retryable profile state.
- Destination, ticket, footer, and mobile navigation components received token-based spacing and state polish without changing ticket/QR/check-in behavior.

## Performance evidence

Static request-path audit before this pass found up to four sequential profile operations after the session resolved, plus a duplicate profile synchronization initiated by sign-in. The normal cold path is now one Supabase auth event and one profile RPC. A genuinely missing profile adds one non-blocking insert while auth metadata remains visible.

Exact millisecond timings were not recorded because this workspace has no staging Supabase credentials or test account. In a credentialed incognito session, read the `fte-auth-bootstrap` and `fte-profile-request` measures from `performance.getEntriesByType('measure')`. Record shell, identity, and optional-stat timings before production approval.

## Verification

- Production build: passed.
- TypeScript: passed.
- ESLint: zero errors (existing warnings remain).
- Security/production tests: 16 passed.
- Production HTTP smoke tests: `/`, `/profile`, and `/tickets` returned 200.
- Runtime route collision detected during smoke testing was repaired by aligning the attendance route segment with the existing `[id]` Pages API segment.
- `git diff --check`: passed.

## Remaining credentialed checks

Migration 011 was not executed. Live RSVP RLS, avatar upload persistence, incognito timings, role-specific menu states, and authenticated ticket expansion require a staging database and test accounts. Headless screenshot capture was attempted but the local Chrome process did not produce artifacts, so no screenshots or physical-device results are claimed.
