import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

const EMAIL_RECIPIENTS = ['nigelmarara0@gmail.com', 'rodelldenga@icloud.com'] as const;
const WHATSAPP_RECIPIENTS = ['+263778595480', '+263787550853'] as const;

export async function queueEventReviewNotifications(input: {
  eventId: string;
  action: 'submitted' | 'resubmitted' | 'meaningfully_updated';
  event: Record<string, Json | undefined>;
}) {
  const admin = getSupabaseAdminClient();
  const revision = String(input.event.updated_at ?? input.event.submitted_at ?? 'unknown');
  const payload = {
    event_id: input.eventId,
    action: input.action,
    title: input.event.title ?? '',
    organizer: input.event.organizer_name ?? '',
    date: input.event.date ?? '',
    time: input.event.time ?? '',
    venue: input.event.venue_name ?? input.event.venue ?? '',
    city: input.event.city ?? '',
    capacity: input.event.capacity ?? 0,
    review_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/admin?event=${input.eventId}`,
  } satisfies Json;

  const jobs = [
    ...EMAIL_RECIPIENTS.map(recipient => ({
      type: 'event_review', channel: 'email' as const, recipient, recipient_email: recipient,
      payload, idempotency_key: `event:${input.eventId}:${input.action}:${revision}:email:${recipient}`,
    })),
    ...WHATSAPP_RECIPIENTS.map(recipient => ({
      type: 'event_review', channel: 'whatsapp' as const, recipient, recipient_email: '',
      payload, idempotency_key: `event:${input.eventId}:${input.action}:${revision}:whatsapp:${recipient}`,
    })),
  ];

  const { error } = await admin.from('notification_jobs').upsert(jobs, {
    onConflict: 'idempotency_key', ignoreDuplicates: true,
  });
  return error?.message ?? null;
}
