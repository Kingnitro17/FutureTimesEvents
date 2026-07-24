'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { User, WalletTicket } from '@/types';

const supabase = getSupabaseBrowserClient();

interface TicketJoinRow {
  id: string;
  ticket_number: string;
  event_id: string;
  status: WalletTicket['status'];
  issued_at: string;
  checked_in_at: string | null;
  gate: string | null;
  attendee_name: string;
  attendee_email: string;
  events: {
    id: string;
    title: string;
    slug: string;
    starts_at: string | null;
    date: string | null;
    time: string | null;
    venue: string | null;
    venue_name: string | null;
    address: string | null;
    image_url: string | null;
    cover_image_url: string | null;
    category: string | null;
  } | null;
  ticket_type: {
    id: string;
    name: string;
    price: number | string;
  } | null;
}

const TICKET_SELECT = `
  id,
  ticket_number,
  event_id,
  status,
  issued_at,
  checked_in_at,
  gate,
  attendee_name,
  attendee_email,
  events (
    id,
    title,
    slug,
    starts_at,
    date,
    time,
    venue,
    venue_name,
    address,
    image_url,
    cover_image_url,
    category
  ),
  ticket_type:ticket_types!tickets_ticket_type_id_fkey (
    id,
    name,
    price
  )
`;

function mapTicket(row: TicketJoinRow): WalletTicket {
  const event = row.events;
  const ticketType = row.ticket_type;
  const date = event?.date ?? '';
  const time = event?.time ?? '';
  const startsAt = event?.starts_at
    ?? (date ? `${date}T${time || '00:00:00'}+02:00` : '');

  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    eventId: row.event_id,
    status: row.status,
    issuedAt: row.issued_at,
    checkedInAt: row.checked_in_at,
    gate: row.gate,
    holderName: row.attendee_name,
    holderEmail: row.attendee_email,
    event: {
      id: event?.id ?? row.event_id,
      title: event?.title ?? 'Event',
      slug: event?.slug ?? row.event_id,
      startsAt,
      date,
      time,
      venue: event?.venue_name ?? event?.venue ?? '',
      address: event?.address ?? '',
      image: event?.cover_image_url ?? event?.image_url ?? '',
      category: event?.category ?? 'lounge',
    },
    ticketType: {
      id: ticketType?.id ?? '',
      name: ticketType?.name ?? 'General Admission',
      price: Number(ticketType?.price) || 0,
    },
  };
}

async function fetchWalletRows(user: Pick<User, 'id' | 'email'>): Promise<WalletTicket[]> {
  const byUserId = supabase
    .from('tickets')
    .select(TICKET_SELECT)
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false });

  const byEmail = supabase
    .from('tickets')
    .select(TICKET_SELECT)
    .ilike('attendee_email', user.email)
    .order('issued_at', { ascending: false });

  const [userResult, emailResult] = await Promise.all([byUserId, byEmail]);
  const firstError = userResult.error ?? emailResult.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  const rows = [
    ...((userResult.data ?? []) as unknown as TicketJoinRow[]),
    ...((emailResult.data ?? []) as unknown as TicketJoinRow[]),
  ];
  const uniqueRows = Array.from(new Map(rows.map(row => [row.id, row])).values());

  return uniqueRows
    .map(mapTicket)
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
}

export function useTickets(user: Pick<User, 'id' | 'email'> | null | undefined) {
  const [tickets, setTickets] = useState<WalletTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!user) {
      setTickets([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setTickets(await fetchWalletRows(user));
    } catch (err) {
      setTickets([]);
      setError(err instanceof Error ? err.message : 'Could not load tickets.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void fetchTickets();
    }, 0);
    return () => window.clearTimeout(task);
  }, [fetchTickets]);

  useEffect(() => {
    if (!user) return;

    const refreshVisibleWallet = () => {
      if (document.visibilityState === 'visible') void fetchTickets();
    };
    window.addEventListener('focus', refreshVisibleWallet);
    document.addEventListener('visibilitychange', refreshVisibleWallet);

    return () => {
      window.removeEventListener('focus', refreshVisibleWallet);
      document.removeEventListener('visibilitychange', refreshVisibleWallet);
    };
  }, [fetchTickets, user]);

  return { tickets, loading, error, refetch: fetchTickets };
}
