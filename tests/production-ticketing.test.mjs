import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8');

const claimRoute = read('app/api/tickets/claim/route.ts');
const scanRoute = read('app/api/scan/route.ts');
const viewRoute = read('app/api/tickets/[ticketId]/view/route.ts');
const pushSendRoute = read('pages/api/push/send.ts');
const pushSubscribeRoute = read('pages/api/push/subscribe.ts');
const checkinPage = read('app/checkin/page.tsx');
const eventChat = read('lib/useEventChat.ts');
const walletHook = read('lib/useTickets.ts');
const claimForm = read('components/events/TicketClaimForm.tsx');
const migration = read('supabase/migrations/006_production_ticketing.sql');
const liquidSetup = read('supabase/update_liquid_lounge_event.sql');

test('claim API creates one 256-bit credential per requested admission', () => {
  assert.match(claimRoute, /length:\s*input\.quantity/);
  assert.match(claimRoute, /randomBytes\(32\)\.toString\('base64url'\)/);
  assert.match(claimRoute, /const tokenHashes = rawTokens\.map\(hashToken\)/);
  assert.match(claimRoute, /p_qr_token_hashes:\s*tokenHashes/);
  assert.match(claimRoute, /qrToken:\s*rawTokens\[ticket\.token_index\]/);
});

test('confirmation jobs never contain a raw QR credential', () => {
  const notificationSection = claimRoute.slice(
    claimRoute.indexOf(".from('notification_jobs')"),
    claimRoute.indexOf('if (notificationError)'),
  );
  assert.ok(notificationSection.length > 0);
  assert.doesNotMatch(notificationSection, /qrToken|qr_token|tokenHash/);
  assert.match(notificationSection, /ticket_number/);
  assert.match(notificationSection, /ticket_url/);
});

test('batch SQL serializes idempotency, capacity, inventory and ticket issuance', () => {
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /FROM public\.events[\s\S]*FOR UPDATE/);
  assert.match(migration, /FROM public\.ticket_types[\s\S]*FOR UPDATE/);
  assert.match(migration, /FOR v_index IN 1\.\.p_quantity LOOP/);
  assert.match(migration, /nextval\('public\.ticket_number_seq'\)/);
  assert.match(migration, /'FTE-' \|\| lpad/);
  assert.match(migration, /p_qr_token_hashes\[v_index\]/);
  assert.match(migration, /jsonb_build_object\('batch_token_index', v_index - 1\)/);
});

test('migration installs an independently authorized, scan-once RPC', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.verify_and_checkin/);
  assert.match(migration, /p\.account_status = 'active'/);
  assert.match(migration, /es\.is_active = TRUE/);
  assert.match(migration, /WHERE qr_token_hash = p_token_hash\s+FOR UPDATE/);
  assert.match(migration, /v_event\.status NOT IN \('published', 'sold_out'\)/);
  assert.match(migration, /status = 'checked_in'/);
  assert.match(migration, /'already_checked_in'/);
});

test('browser roles cannot execute ticket mutation RPCs or mutate ticket rows', () => {
  assert.match(migration, /REVOKE ALL PRIVILEGES ON FUNCTION %s FROM PUBLIC/);
  assert.match(migration, /REVOKE ALL PRIVILEGES ON FUNCTION %s FROM anon/);
  assert.match(migration, /REVOKE ALL PRIVILEGES ON FUNCTION %s FROM authenticated/);
  assert.match(migration, /v_function\.proname = 'claim_ticket_atomic'/);
  assert.match(migration, /REVOKE INSERT, UPDATE, DELETE ON public\.tickets/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.claim_tickets_batch_atomic/);
});

test('public profiles and staff ticket access expose only minimum data', () => {
  assert.match(migration, /DROP POLICY IF EXISTS "profiles_public_read"/);
  assert.doesNotMatch(migration, /CREATE POLICY "profiles_public_read"/);
  assert.match(migration, /CREATE OR REPLACE VIEW public\.public_profile_cards/);
  assert.match(migration, /REVOKE SELECT ON public\.profiles FROM PUBLIC, anon, authenticated/);
  assert.match(eventChat, /\.from\('public_profile_cards'\)/);

  assert.match(migration, /DROP POLICY IF EXISTS "tickets_host_read"/);
  assert.doesNotMatch(migration, /CREATE POLICY "tickets_host_read"/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_checkin_stats/);
  assert.match(checkinPage, /\.rpc\('get_checkin_stats'/);

  const eventStaffPolicy = migration.slice(
    migration.indexOf('CREATE POLICY "event_staff_own_read"'),
    migration.indexOf('DROP POLICY IF EXISTS "ticket_scans_host_read"'),
  );
  assert.doesNotMatch(eventStaffPolicy, /ticket_scans\./);
  assert.match(migration, /WHERE es\.event_id = ticket_scans\.event_id/);
});

test('push endpoints bind users and reject unauthorized sends', () => {
  assert.match(pushSubscribeRoute, /auth\.getUser/);
  assert.match(pushSubscribeRoute, /parsed\.data\.userId !== user\.id/);
  assert.match(pushSubscribeRoute, /user_id: user\.id/);
  assert.match(pushSubscribeRoute, /SubscriptionSchema\.safeParse/);

  assert.match(pushSendRoute, /PUSH_INTERNAL_SECRET/);
  assert.match(pushSendRoute, /timingSafeEqual/);
  assert.match(pushSendRoute, /\['admin', 'super_admin'\]\.includes/);
  assert.match(pushSendRoute, /profile\.account_status !== 'active'/);
  assert.match(pushSendRoute, /SendSchema\.safeParse/);
});

test('wallet joins use the canonical ticket-type relationship', () => {
  const relationshipHint = /ticket_types!tickets_ticket_type_id_fkey/;
  assert.match(walletHook, relationshipHint);
  assert.match(viewRoute, relationshipHint);
  assert.match(migration, /DROP CONSTRAINT IF EXISTS tickets_tier_id_fkey/);
  assert.match(migration, /ADD CONSTRAINT tickets_ticket_type_id_fkey/);
});

test('raw credentials stay in session storage and never enter ticket URLs', () => {
  assert.match(claimForm, /fte:ticket:qr:\$\{ticket\.ticketId\}/);
  assert.match(claimForm, /sessionStorage\.setItem/);
  assert.doesNotMatch(claimForm, /[?&](?:t|token)=/);
  assert.match(viewRoute, /timingSafeEqual/);
  assert.match(viewRoute, /qrTokenValid:\s*hasValidToken/);
});

test('Liquid Lounge setup grants scoped management and multi-ticket capacity', () => {
  assert.match(liquidSetup, /lower\(auth_user\.email\) = 'liquidlounge216@gmail\.com'/);
  assert.match(liquidSetup, /SET role = 'event_manager'/);
  assert.match(liquidSetup, /'event_manager',\s+'Main Gate'/);
  assert.match(liquidSetup, /claim_limit_per_contact = 10/);
  assert.doesNotMatch(liquidSetup, /DROP TABLE|TRUNCATE|DELETE FROM/);
});

test('scan API requires an active server-verified staff profile', () => {
  assert.match(scanRoute, /\.select\('role, account_status'\)/);
  assert.match(scanRoute, /profile\.account_status !== 'active'/);
  assert.match(scanRoute, /\.eq\('is_active', true\)/);
  assert.match(scanRoute, /hashToken\(qrToken\)/);
  assert.match(scanRoute, /adminClient\.rpc\('verify_and_checkin'/);
});

test('Supabase clients have no silent live-production fallback', () => {
  const configFiles = [
    read('lib/supabase/config.ts'),
    read('lib/supabase/browser.ts'),
    read('lib/supabase/server.ts'),
    read('proxy.ts'),
    read('app/auth/callback/route.ts'),
  ].join('\n');

  assert.doesNotMatch(configFiles, /ecbbmcqwluivbzlaqdsd\.supabase\.co/);
  assert.match(configFiles, /requirePublicEnv\('NEXT_PUBLIC_SUPABASE_URL'\)/);
  assert.match(configFiles, /\$\{name\} is required/);
});

test('event publication is restricted to the server-verified super-admin review route', () => {
  const reviewRoute = read('app/api/admin/events/review/route.ts');
  const submitRoute = read('app/api/events/submit/route.ts');
  const migration = read('supabase/migrations/010_event_review_workflow.sql');
  assert.match(reviewRoute, /profile\.role !== 'super_admin'/);
  assert.match(reviewRoute, /eq\('status', 'pending_review'\)/);
  assert.match(submitRoute, /server\.auth\.getUser\(\)/);
  assert.match(migration, /protect_event_review_fields/);
  assert.match(migration, /organizer_id = auth\.uid\(\)/);
});

test('event review notifications are idempotently queued without browser credentials', () => {
  const outbox = read('lib/events/review.ts');
  assert.match(outbox, /notification_jobs/);
  assert.match(outbox, /ignoreDuplicates: true/);
  assert.doesNotMatch(outbox, /NEXT_PUBLIC_(?:WHATSAPP|EMAIL|TWILIO)/);
  assert.match(outbox, /\+263778595480/);
  assert.match(outbox, /rodelldenga@icloud\.com/);
});

test('public attendance is explicit opt-in and returns only safe profile fields', () => {
  const route = read('app/api/events/[id]/attendance/route.ts');
  const migration = read('supabase/migrations/011_social_attendance_and_avatar_security.sql');
  assert.match(route, /eq\('is_public', true\)/);
  assert.match(route, /select\('id,display_name,avatar_url,avatar_color,initials'\)/);
  assert.doesNotMatch(route, /select\([^)]*(?:email|phone|ticket|qr)/);
  assert.match(route, /user_id: user\.id/);
  assert.match(migration, /DEFAULT FALSE/);
  assert.match(migration, /REVOKE ALL ON public\.rsvps FROM anon/);
});

test('avatar uploads are constrained to the authenticated user folder', () => {
  const profile = read('app/profile/page.tsx');
  const migration = read('supabase/migrations/011_social_attendance_and_avatar_security.sql');
  assert.match(profile, /`\$\{user\.id\}\/\$\{crypto\.randomUUID\(\)\}/);
  assert.match(profile, /image\/jpeg/);
  assert.match(migration, /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::TEXT/);
  assert.match(migration, /file_size_limit = EXCLUDED\.file_size_limit/);
});
