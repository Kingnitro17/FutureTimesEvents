# Release hardening report

## Root causes and repairs

- The wallet selected `events.cover_image_url` even though the deployed ticket relationship exposes `image_url`. The wallet and ticket-view query now select only supported fields, deduplicate user-id/email ownership results, separate auth/loading/error/empty states, and retain the existing QR flow.
- First-login profile rendering waited for sequential profile bootstrap and profile fetches. Auth metadata now renders the shell immediately while the profile is resolved in the background through one auth subscription.
- Wallet admissions count ticket rows; attended events count distinct checked-in events, so the two labels intentionally describe different quantities.
- Destination cards mixed geographic regions, slogans, and hardcoded counts. They remain oval, use city-only labels, split Shamva and Bindura, and derive published-event counts from live event data.
- The map city rail lacked a bounded surface, token-based states, Shamva/Bindura, and duplicate-location protection. The rail is now scrollable, touch-sized, token-based, and reports geolocation errors.
- The organizer form published directly from the browser. It now creates an owned draft and uses a server-authenticated submission endpoint.
- The former admin screen was mock data. It is now a role-gated review queue. Publication requires a server-verified `super_admin`, a pending event, and an atomic status guard.
- Notification infrastructure had a generic jobs table and Twilio attendee helpers, but no event-review outbox schema. Review submission now queues idempotent email and WhatsApp jobs for the two approved recipients in each channel. Provider credentials were unavailable, so live delivery was not tested.

## Database migration

Apply `supabase/migrations/010_event_review_workflow.sql` manually after review. It is additive and was not executed automatically. It adds review timestamps/actors/notes, published timestamp, notification channel/recipient/retry metadata, idempotency and queue indexes, owner-scoped organizer policies, and a trigger that prevents organizers changing protected review fields. Existing public queries remain restricted to published states.

## Server environment

Configure the provider variables listed in `.env.example`. For WhatsApp, configure the access token, phone-number ID, business account, and an approved event-review template. Configure the email provider key and verified sender. The outbox recipients are `+263778595480`, `+263787550853`, `nigelmarara0@gmail.com`, and `rodelldenga@icloud.com`.

## Verification performed

- `npm run type-check`: pass
- `npm run lint`: pass with pre-existing warnings, zero errors
- `npm test`: pass, including ticket/QR/check-in security and event-review authorization/outbox assertions
- `npm run build`: pass
- `git diff --check`: pass

No live Supabase migration, provider delivery, authenticated end-to-end browser workflow, physical-device matrix, or screenshot capture was performed because production credentials/test accounts and provider credentials were not supplied.

## Deployment and rollback

1. Back up production and review migration 010.
2. Apply migration 010 manually in Supabase SQL Editor.
3. Configure server-only notification variables and deploy.
4. Test a controlled organizer draft, submission, four queued notification jobs, super-admin review, publication, claim, QR display, first check-in, and rejected duplicate check-in.
5. Confirm pending/rejected events are invisible when logged out.

To roll back application code, redeploy the previous commit. Keep the nullable additive columns in place during rollback; they are backward-compatible. Remove the new trigger/policies only after restoring the prior policies. Do not restore the old status constraint until all rows using new review states are converted safely.
