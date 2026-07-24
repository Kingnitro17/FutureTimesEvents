'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AnalyticsData } from '@/types';

export interface DashboardAnalytics {
  totalRevenue:   number;
  totalTickets:   number;
  totalAttendees: number;
  totalEvents:    number;
  revenueByDay:   { date: string; revenue: number; tickets: number; attendance: number }[];
  tierBreakdown:  { name: string; value: number; color: string }[];
  topEvents:      { id: string; title: string; revenue: number; tickets: number; attendees: number }[];
  recentActivity: { date: string; description: string; amount: number }[];
}

const TIER_COLORS = ['#FF55C2', '#7222E3', '#2CC4EA', '#46FFAB', '#FFBC73'];

export function useAnalytics(organizerId?: string) {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch events (filter by organizer if provided)
      let eventsQuery = supabase.from('events').select('id,title,attendees,price,capacity,created_at');
      if (organizerId) eventsQuery = eventsQuery.eq('organizer_id', organizerId);
      const { data: eventsData, error: evErr } = await eventsQuery;
      if (evErr) throw evErr;

      const events = (eventsData ?? []) as Array<{ id: string; title: string; attendees: number | null; price: number | string | null; capacity: number | null; created_at: string | null }>;
      const eventIds = events.map((e: { id: string }) => e.id);

      // 2. Fetch tickets for those events
      let ticketsData: Array<{ total_amount: number; quantity: number; purchased_at: string; tier_id: string }> = [];
      if (eventIds.length > 0) {
        const { data: td } = await supabase
          .from('tickets')
          .select('total_amount, quantity, purchased_at, tier_id')
          .in('event_id', eventIds)
          .neq('status', 'cancelled');
        ticketsData = td ?? [];
      }

      // 3. Fetch ticket tiers for breakdown
      let tiersData: Array<{ id: string; name: string }> = [];
      if (eventIds.length > 0) {
        const { data: td } = await supabase
          .from('ticket_tiers')
          .select('id, name')
          .in('event_id', eventIds);
        tiersData = td ?? [];
      }

      // 4. Aggregate analytics
      const totalRevenue   = ticketsData.reduce((s, t) => s + Number(t.total_amount), 0);
      const totalTickets   = ticketsData.reduce((s, t) => s + Number(t.quantity), 0);
      const totalAttendees = events.reduce((s, e) => s + Number(e.attendees || 0), 0);

      // Revenue by day (last 30 days)
      const last30 = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
      });

      const revenueByDay = last30.map(date => {
        const dayTickets = ticketsData.filter(t => t.purchased_at?.startsWith(date));
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dayTickets.reduce((s, t) => s + Number(t.total_amount), 0),
          tickets: dayTickets.reduce((s, t) => s + Number(t.quantity), 0),
          attendance: 0,
        };
      });

      // Tier breakdown
      const tierMap = new Map<string, number>();
      ticketsData.forEach(t => {
        tierMap.set(t.tier_id, (tierMap.get(t.tier_id) || 0) + Number(t.quantity));
      });
      const tierBreakdown = [...tierMap.entries()].map(([id, value], i) => {
        const tier = tiersData.find(t => t.id === id);
        return {
          name: tier?.name ?? `Tier ${i + 1}`,
          value,
          color: TIER_COLORS[i % TIER_COLORS.length],
        };
      });

      // Top events by computed revenue
      const topEvents = events
        .map(e => ({
          id:        e.id,
          title:     e.title,
          attendees: Number(e.attendees || 0),
          revenue:   Number(e.attendees || 0) * Number(e.price || 0),
          tickets:   Number(e.attendees || 0),
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setAnalytics({
        totalRevenue,
        totalTickets,
        totalAttendees,
        totalEvents: events.length,
        revenueByDay,
        tierBreakdown: tierBreakdown.length > 0
          ? tierBreakdown
          : [
              { name: 'General Admission', value: 65, color: '#FF55C2' },
              { name: 'VIP',               value: 25, color: '#7222E3' },
              { name: 'Early Bird',         value: 10, color: '#2CC4EA' },
            ],
        topEvents,
        recentActivity: ticketsData.slice(-5).map((t, i) => ({
          date: new Date(t.purchased_at).toLocaleDateString(),
          description: `Ticket sale`,
          amount: Number(t.total_amount),
        })),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load analytics';
      setError(msg);
    }
    setLoading(false);
  }, [organizerId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetch(), 0);
    return () => window.clearTimeout(timer);
  }, [fetch]);

  return { analytics, loading, error, refetch: fetch };
}
