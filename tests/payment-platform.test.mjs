import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const migration=readFileSync('supabase/migrations/013_payment_referral_foundation.sql','utf8');
const paynow=readFileSync('supabase/functions/_shared/paynow.ts','utf8');
const callback=readFileSync('supabase/functions/paynow-result/index.ts','utf8');
const createPayment=readFileSync('supabase/functions/create-payment/index.ts','utf8');

test('browser cannot mutate financial truth tables',()=>{assert.match(migration,/REVOKE INSERT, UPDATE, DELETE ON public\.ticket_orders/);assert.doesNotMatch(migration,/CREATE POLICY .* FOR (INSERT|UPDATE|DELETE).*financial_ledger/i)});
test('order pricing comes from locked ticket types',()=>{assert.match(migration,/FROM public\.ticket_types.*FOR UPDATE/s);assert.match(migration,/v_type\.price\*v_qty/);assert.doesNotMatch(createPayment,/body\.(amount|price|total)/)});
test('reservations include active unexpired holds and serialize inventory',()=>{assert.match(migration,/status='active' AND expires_at>now\(\)/);assert.match(migration,/SELECT \* INTO v_event.*FOR UPDATE/s);assert.match(migration,/reservation_expired/)});
test('Paynow messages use SHA-512 and inbound hashes are mandatory',()=>{assert.match(paynow,/SHA-512/);assert.match(paynow,/if \(!supplied \|\| supplied\.toUpperCase\(\)!==expected\)/);assert.match(paynow,/remotetransaction/)});
test('callback is idempotent and amount mismatch blocks fulfillment',()=>{assert.match(migration,/UNIQUE \(provider, event_fingerprint\)/);assert.match(callback,/amount_mismatch/);assert.match(callback,/confirm_order_payment_and_issue_tickets/)});
test('paid fulfillment is locked and uniqueness-backed',()=>{assert.match(migration,/FROM public\.ticket_orders WHERE id=p_order_id FOR UPDATE/);assert.match(migration,/tickets_order_fulfillment_unique/);assert.match(migration,/already_fulfilled/)});
test('ticket payments do not reuse the legacy bottle-service orders table',()=>{assert.match(migration,/CREATE TABLE public\.ticket_orders/);assert.doesNotMatch(migration,/CREATE TABLE public\.orders/);assert.match(createPayment,/from\("ticket_orders"\)/)});
test('QR secrets are hashed and never persisted raw',()=>{assert.match(callback,/crypto\.subtle\.digest\("SHA-256",token\)/);assert.doesNotMatch(migration,/qr_token\s+TEXT/i);assert.doesNotMatch(callback,/\.from\("tickets"\).*token/s)});

