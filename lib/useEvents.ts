'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DbEvent, Event } from '@/types';

/** Format a DATE string 'YYYY-MM-DD' → 'Sat, May 9' */
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

/** Format a TIME string 'HH:MM:SS' → '7:00 PM' */
function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour   = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
  } catch { return timeStr; }
}

export function mapDbEvent(row: DbEvent): Event {
  const price = Number(row.price) || 0;
  return {
    id:              String(row.id),
    title:           row.title,
    slug:            row.slug || String(row.id),
    category:        row.category  || 'music',
    categoryLabel:   row.category_label || row.category || 'Event',
    date:            row.date ? formatDate(row.date) : '',
    dateISO:         row.date || '',
    time:            formatTime(row.time),
    endTime:         formatTime(row.end_time),
    venue:           row.venue || '',
    address:         row.address  || '',
    city:            row.city     || '',
    description:     row.description      || '',
    longDescription: row.long_description || row.description || '',
    price,
    priceLabel:      price === 0 ? 'Free' : `$${price}`,
    attendees:       Number(row.attendees) || 0,
    capacity:        Number(row.capacity)  || 0,
    image:           row.image_url || '',
    landscapeImage:  row.image_url || '', // Same image for now, can be separate field later
    images:          row.image_url ? [row.image_url] : [],
    mood:            row.mood   || 'social',
    tags:            row.tags   || [],
    featured:        row.featured || false,
    lineup:          row.lineup || [],
    organizer:       row.organizer_name || '',
    organizerAvatar: row.organizer_name
      ? row.organizer_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
      : 'FT',
    lat:             row.lat != null ? Number(row.lat) : undefined,
    lng:             row.lng != null ? Number(row.lng) : undefined,
    ticketTiers:     [],
    tables:          [],
    bottleService:   [],
  };
}

export function useEvents() {
  const [events,  setEvents]  = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('date', { ascending: true });

    if (err) {
      setError(err.message);
      setEvents([]);
    } else {
      setEvents((data as DbEvent[]).map(mapDbEvent));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchEvents(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}
