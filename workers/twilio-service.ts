// workers/twilio-service.ts
// Twilio WhatsApp + SMS sending functions.
// WhatsApp is attempted first (free in Zimbabwe vs. SMS rates).
//
// Required env vars (server-only):
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_WHATSAPP_FROM            — approved WhatsApp sender, e.g. whatsapp:+14155238886
//   TWILIO_PHONE_NUMBER             — Twilio phone number for SMS fallback
//   TWILIO_WA_TEMPLATE_CONFIRMATION_SID
//   TWILIO_WA_TEMPLATE_REMINDER_SID
//   TWILIO_VERIFY_SERVICE_SID       — for OTP phone verification
//   APP_BASE_URL                    — e.g. https://futuretimesevents.com
//
// Zimbabwe compliance notes:
//   - POTRAZ does not currently mandate prior consent for transactional SMS,
//     but WhatsApp Business requires a pre-approved message template.
//   - Users must opt-in (phone_verified = true) before any message is sent.
//   - Provide easy OPT-OUT instruction in every message ("Reply STOP").

import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

interface EventSummary {
  title: string;
  date:  string;
  time:  string;
  venue: string;
}

interface NotifParams {
  phone: string;          // E.164 format, e.g. +263712345678
  event: EventSummary;
  type:  'confirmation' | 'reminder';
}

// ---------------------------------------------------------------
// WhatsApp — uses approved Content Template SIDs
// Register at: https://www.twilio.com/console/sms/whatsapp/senders
//
// Template: "fte_rsvp_confirmation"
//   Body: "Hi! You're going to {{1}} on {{2}} at {{3}}. 🎉
//          See you at {{4}}. Reply STOP to unsubscribe."
//
// Template: "fte_rsvp_reminder"
//   Body: "Reminder: {{1}} is tomorrow at {{2}}, {{3}}. See you there! 🎶
//          Reply STOP to unsubscribe."
// ---------------------------------------------------------------
export async function sendWhatsAppConfirmation(params: NotifParams): Promise<void> {
  const { phone, event, type } = params;

  const contentSid = type === 'confirmation'
    ? process.env.TWILIO_WA_TEMPLATE_CONFIRMATION_SID!
    : process.env.TWILIO_WA_TEMPLATE_REMINDER_SID!;

  const contentVariables = type === 'confirmation'
    ? JSON.stringify({ '1': event.title, '2': event.date, '3': event.time, '4': event.venue })
    : JSON.stringify({ '1': event.title, '2': event.time, '3': event.venue });

  await client.messages.create({
    from:             process.env.TWILIO_WHATSAPP_FROM!,
    to:               `whatsapp:${phone}`,
    contentSid,
    contentVariables,
  });
}

// ---------------------------------------------------------------
// SMS fallback — plain text (no template required)
// ---------------------------------------------------------------
export async function sendSmsConfirmation(params: NotifParams): Promise<void> {
  const { phone, event, type } = params;
  const appUrl = process.env.APP_BASE_URL ?? 'https://futuretimesevents.com';

  const body = type === 'confirmation'
    ? `You're going to ${event.title} on ${event.date} at ${event.venue}! 🎉 ` +
      `Details: ${appUrl}/events  Reply STOP to unsubscribe.`
    : `Reminder: ${event.title} is tomorrow at ${event.time}, ${event.venue}. See you there! 🎶 ` +
      `Reply STOP to unsubscribe.`;

  await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER!,
    to:   phone,
    body,
  });
}

// ---------------------------------------------------------------
// Phone OTP verification (Twilio Verify service)
// ---------------------------------------------------------------
export async function sendOtp(phone: string): Promise<void> {
  await client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
    .verifications.create({ to: phone, channel: 'sms' });
}

export async function checkOtp(phone: string, code: string): Promise<boolean> {
  const result = await client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
    .verificationChecks.create({ to: phone, code });
  return result.status === 'approved';
}
