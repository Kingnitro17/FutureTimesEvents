import { Ticket, TicketTier, Event } from '@/types';

export function generateTicketId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VYB-${timestamp}-${random}`;
}

export function generateTicket(
  event: Event,
  tier: TicketTier,
  quantity: number,
  holderName: string,
  holderEmail: string
): Ticket {
  const ticketId = generateTicketId();
  return {
    id: `tk_${Date.now()}`,
    ticketId,
    eventId: event.id,
    event,
    tier,
    quantity,
    totalAmount: tier.price * quantity,
    purchasedAt: new Date().toISOString(),
    status: 'upcoming',
    qrCode: ticketId,
    holderName,
    holderEmail,
  };
}

export function getLoyaltyPoints(amount: number): number {
  return Math.floor(amount * 2);
}

export function formatCurrency(amount: number): string {
  if (amount === 0) return 'Free';
  return `$${amount.toLocaleString()}`;
}
