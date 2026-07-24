import { redirect } from 'next/navigation';

/**
 * Legacy checkout URLs now use the production event claim flow.
 *
 * The previous page generated localStorage-only demo tickets and decorative
 * QR values. Keeping a single server-backed claim path prevents fake tickets
 * from entering the production UI.
 */
export default async function LegacyCheckoutRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/events/${encodeURIComponent(id)}`);
}
