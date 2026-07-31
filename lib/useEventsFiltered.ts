'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { mapDbEvent } from '@/lib/useEvents';
import type { DbEvent, Event } from '@/types';

export type DateFilter = 'all' | 'today' | 'this_week' | 'this_month' | 'upcoming';
export type SortOption = 'Date' | 'Price: Low' | 'Price: High' | 'Popularity' | 'Nearest';

export interface EventFilters {
  category: string;    // 'all' or category slug
  dateFilter: DateFilter;
  priceMax: number;
  search: string;
  sort: SortOption;
  city: string;        // '' means any city
}

export const DEFAULT_FILTERS: EventFilters = {
  category:   'all',
  dateFilter: 'all',
  priceMax:   1000,
  search:     '',
  sort:       'Nearest',
  city:       '',
};

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Haversine distance in km between two lat/lng pairs */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useEventsFiltered(
  filters: EventFilters,
  userLocation?: [number, number] | null,
) {
  const [events,  setEvents]  = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  /** Map of event id → distance in km (only populated when userLocation exists) */
  const [distances, setDistances] = useState<Record<string, number>>({});

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('events')
      .select('id,title,slug,category,category_label,date,time,end_time,venue,address,city,description,long_description,price,attendees,capacity,image_url,mood,tags,featured,lineup,organizer_name,lat,lng')
      .eq('status', 'published')
      .lte('price', filters.priceMax);

    // Category filter (skip if 'all')
    if (filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    // City filter
    if (filters.city && filters.city !== '') {
      query = query.ilike('city', `%${filters.city}%`);
    }

    // Date filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (filters.dateFilter === 'today') {
      query = query.eq('date', toISODate(today));
    } else if (filters.dateFilter === 'this_week') {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      query = query.gte('date', toISODate(today)).lte('date', toISODate(weekEnd));
    } else if (filters.dateFilter === 'this_month') {
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      query = query.gte('date', toISODate(today)).lte('date', toISODate(monthEnd));
    } else if (filters.dateFilter === 'upcoming') {
      query = query.gte('date', toISODate(today));
    }

    // Server-side sorting (Nearest is handled client-side below)
    if (filters.sort === 'Price: Low')       query = query.order('price', { ascending: true });
    else if (filters.sort === 'Price: High') query = query.order('price', { ascending: false });
    else if (filters.sort === 'Popularity')  query = query.order('attendees', { ascending: false });
    else                                     query = query.order('date', { ascending: true });

    const { data, error: err } = await query;

    if (err) {
      // Translate raw Supabase/PostgreSQL errors into user-friendly messages
      const msg = err.message || '';
      const friendlyError =
        msg.includes('permission denied') || msg.includes('profiles')
          ? 'Events could not be loaded. Please refresh the page or try again shortly.'
          : msg.includes('JWT') || msg.includes('auth')
          ? 'Session expired. Please refresh the page.'
          : 'Could not load events. Please check your connection and try again.';
      setError(friendlyError);
      setEvents([]);
      setDistances({});
    } else {
      let mapped = (data as DbEvent[]).map(mapDbEvent);

      // Client-side search (Supabase free-tier doesn't have full-text search)
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        mapped = mapped.filter(e =>
          e.title.toLowerCase().includes(q) ||
          e.venue.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.tags.some(t => t.toLowerCase().includes(q))
        );
      }

      // Compute distances if user location is available
      const distMap: Record<string, number> = {};
      if (userLocation) {
        const [uLat, uLng] = userLocation;
        for (const ev of mapped) {
          if (ev.lat != null && ev.lng != null) {
            distMap[ev.id] = haversineKm(uLat, uLng, ev.lat, ev.lng);
          }
        }
      }
      setDistances(distMap);

      // Client-side sort by distance if "Nearest" selected
      if (filters.sort === 'Nearest' && userLocation) {
        mapped.sort((a, b) => {
          const da = distMap[a.id] ?? Infinity;
          const db = distMap[b.id] ?? Infinity;
          return da - db;
        });
      }

      setEvents(mapped);
    }
    setLoading(false);
  }, [
    filters.category, filters.dateFilter, filters.priceMax,
    filters.search, filters.sort, filters.city,
    userLocation,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchEvents(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchEvents]);

  return { events, loading, error, distances, refetch: fetchEvents };
}
