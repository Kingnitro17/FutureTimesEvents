// workers/snapshot-worker.ts
// BullMQ worker: consumes 'snapshot' and 'notifications' queues.
// Run as a standalone Node process:
//   npx ts-node workers/snapshot-worker.ts
// Or via PM2:
//   pm2 start workers/snapshot-worker.ts --interpreter ts-node
//
// Required env vars:
//   REDIS_URL                          — Redis connection
//   NEXT_PUBLIC_SUPABASE_URL           — Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY          — Server-side only (never expose to browser)
//   TWILIO_ACCOUNT_SID                 — Twilio credentials
//   TWILIO_AUTH_TOKEN
//   TWILIO_WHATSAPP_FROM               — e.g. whatsapp:+14155238886
//   TWILIO_PHONE_NUMBER                — e.g. +14155238886

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // load .env.local in dev
import { Worker, type Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppConfirmation, sendSmsConfirmation } from './twilio-service.ts';

// ---------------------------------------------------------------
// Supabase admin client (service role — full DB access)
// ---------------------------------------------------------------
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ---------------------------------------------------------------
// Redis connection config
// ---------------------------------------------------------------
const redisConnection = { url: process.env.REDIS_URL! };

interface SnapshotJobData {
  eventId: string;
  userId: string;
  status: string;
}

interface NotificationJobData {
  eventId: string;
  userId: string;
  phone: string;
  type: 'confirmation' | 'reminder';
}

// ---------------------------------------------------------------
// Worker 1: Snapshot recompute
// ---------------------------------------------------------------
const snapshotWorker = new Worker<SnapshotJobData>(
  'snapshot',
  async (job: Job<SnapshotJobData>) => {
    const { eventId, userId, status } = job.data;
    console.log(`[snapshot-worker] Recomputing snapshot for event ${eventId}`);

    // Idempotent RPC — safe to call multiple times
    const { error } = await supabaseAdmin.rpc('recompute_attendee_snapshot', {
      p_event_id: eventId,
    });

    if (error) {
      console.error(`[snapshot-worker] RPC error for event ${eventId}:`, error);
      throw new Error(error.message); // triggers BullMQ retry
    }

    // Invalidate Redis cache so next read gets fresh data
    const { invalidateEventCache } = await import('../lib/cache.ts');
    await invalidateEventCache(eventId);

    // If user RSVP'd as 'going' and has a verified phone, enqueue notification
    if (status === 'going') {
      const { data: rsvp } = await supabaseAdmin
        .from('rsvps')
        .select('phone, phone_verified')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      if (rsvp?.phone && rsvp.phone_verified) {
        const { enqueueNotificationJob } = await import('../lib/worker-queue.ts');
        await enqueueNotificationJob({
          eventId,
          userId,
          phone: rsvp.phone,
          type: 'confirmation',
        });
      }
    }

    console.log(`[snapshot-worker] Done for event ${eventId}`);
  },
  {
    connection: redisConnection,
    concurrency: 5,    // process up to 5 events in parallel
  }
);

// ---------------------------------------------------------------
// Worker 2: Notification sender (WhatsApp / SMS)
// ---------------------------------------------------------------
const notificationWorker = new Worker<NotificationJobData>(
  'notifications',
  async (job: Job<NotificationJobData>) => {
    const { eventId, phone, type } = job.data;

    // Fetch event details for message content
    const { data: event, error: evtErr } = await supabaseAdmin
      .from('events')
      .select('title, date, time, venue')
      .eq('id', eventId)
      .single();

    if (evtErr || !event) {
      throw new Error(`Event ${eventId} not found — aborting notification`);
    }

    // Attempt WhatsApp first; fall back to SMS
    try {
      await sendWhatsAppConfirmation({ phone, event, type });
      console.log(`[notification-worker] WhatsApp sent to ${phone} (${type})`);
    } catch (whatsAppError: unknown) {
      const message = whatsAppError instanceof Error
        ? whatsAppError.message
        : String(whatsAppError);
      console.warn(`[notification-worker] WhatsApp failed, falling back to SMS: ${message}`);
      await sendSmsConfirmation({ phone, event, type });
      console.log(`[notification-worker] SMS sent to ${phone} (${type})`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 10,
    limiter: {
      max: 50,          // max 50 messages per
      duration: 1000,   // second —  rate limit buffer
    },
  }
);

// ---------------------------------------------------------------
// Error handlers
// ---------------------------------------------------------------
snapshotWorker.on('failed', (job, err) => {
  console.error(`[snapshot-worker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[notification-worker] Job ${job?.id} failed:`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await snapshotWorker.close();
  await notificationWorker.close();
  process.exit(0);
});

console.log('[workers] Snapshot + Notification workers started.');
