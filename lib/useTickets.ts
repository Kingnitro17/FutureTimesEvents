'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DbTicket, Ticket } from '@/types';

function mapDbTicket(row: DbTicket): Ticket {
  const ev = row.events;
  const tier = row.ticket_tiers;
  return {
    id:           row.id,
    ticketId:     row.ticket_id,
    eventId:      row.event_id,
    event: {
      id:    ev?.id    || row.event_id,
      title: ev?.title || 'Event',
      date:  ev?.date  || '',
      time:  ev?.time  || '',
      venue: ev?.venue || '',
      image: ev?.image_url || '',
      slug:  ev?.slug  || row.event_id,
    },
    tier: {
      id:    tier?.id    || row.tier_id,
      name:  tier?.name  || 'Standard',
      price: Number(tier?.price) || 0,
    },
    quantity:     row.quantity,
    totalAmount:  Number(row.total_amount),
    purchasedAt:  row.purchased_at,
    status:       row.status,
    qrCode:       row.qr_code,
    holderName:   row.holder_name,
    holderEmail:  row.holder_email,
  };
}

export function useTickets(userId: string | undefined) {
  const [tickets,  setTickets]  = useState<Ticket[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!userId) { setTickets([]); setLoading(false); return; }
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('tickets')
      .select(`
        *,
        events ( id, title, date, time, venue, image_url, slug ),
        ticket_tiers ( id, name, price )
      `)
      .eq('user_id', userId)
      .order('purchased_at', { ascending: false });

    if (err) {
      setError(err.message);
      setTickets([]);
    } else {
      setTickets((data as DbTicket[]).map(mapDbTicket));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  return { tickets, loading, error, refetch: fetchTickets };
}
