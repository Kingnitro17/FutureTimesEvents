// lib/worker-queue.ts
// Thin wrapper around BullMQ to enqueue background jobs.
// The actual worker process is in workers/snapshot-worker.ts.
//
// Required env vars (server-only):
//   REDIS_URL  — Redis connection string (e.g. redis://localhost:6379)

import { Queue } from 'bullmq';
import type { RsvpStatus } from '@/pages/api/events/[id]/rsvp';

export interface SnapshotJob {
  eventId: string;
  userId:  string;
  status:  RsvpStatus;
}

export interface NotificationJob {
  eventId: string;
  userId:  string;
  phone:   string;   // E.164
  type:    'confirmation' | 'reminder';
}

let snapshotQueue: Queue<SnapshotJob> | null = null;
let notificationQueue: Queue<NotificationJob> | null = null;

function getSnapshotQueue(): Queue<SnapshotJob> {
  if (!snapshotQueue) {
    snapshotQueue = new Queue<SnapshotJob>('snapshot', {
      connection: { url: process.env.REDIS_URL! },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      },
    });
  }
  return snapshotQueue;
}

function getNotificationQueue(): Queue<NotificationJob> {
  if (!notificationQueue) {
    notificationQueue = new Queue<NotificationJob>('notifications', {
      connection: { url: process.env.REDIS_URL! },
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 500,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    });
  }
  return notificationQueue;
}

export async function enqueueSnapshotJob(data: SnapshotJob): Promise<void> {
  try {
    // Deduplicate by event: only one pending snapshot job per event
    const q = getSnapshotQueue();
    await q.add('recompute', data, {
      jobId: `snapshot:${data.eventId}`, // stable ID = deduplication
      delay: 500, // small debounce — batch rapid RSVPs
    });
  } catch (e) {
    // Queue unavailable — snapshot will still be correct on next read (DB fallback)
    console.error('[worker-queue] Failed to enqueue snapshot job', e);
  }
}

export async function enqueueNotificationJob(data: NotificationJob): Promise<void> {
  try {
    const q = getNotificationQueue();
    await q.add('send', data, {
      jobId: `notif:${data.type}:${data.eventId}:${data.userId}`,
    });
  } catch (e) {
    console.error('[worker-queue] Failed to enqueue notification job', e);
  }
}
