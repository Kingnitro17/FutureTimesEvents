'use client';
// lib/useRsvpPresence.ts
// React hook: RSVP + Supabase Realtime presence for "Who's Going" widget.
//
// Returns:
//   snapshot       — { going_count, interested_count, preview_attendees }
//   onlineCount    — number of users currently viewing the event page
//   myStatus       — caller's own RSVP status (null if not RSVP'd)
//   submitRsvp     — async function to RSVP; optimistic update included
//   loading        — true during initial fetch
//   error          — last error message, or null
//
// Usage:
//   const { snapshot, onlineCount, myStatus, submitRsvp, loading } =
//     useRsvpPresence(eventId);

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
export type RsvpStatus = 'going' | 'interested' | 'not_going';

export interface AttendeePreview {
  user_id:      string;
  display_name: string;
  avatar_url:   string;
  avatar_color: string;
  initials:     string;
}

export interface AttendeeSnapshot {
  going_count:       number;
  interested_count:  number;
  preview_attendees: AttendeePreview[];
  cached_at:         string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function isRsvpStatus(value: unknown): value is RsvpStatus {
  return value === 'going' || value === 'interested' || value === 'not_going';
}

function readRsvpStatus(value: unknown): RsvpStatus | null {
  if (!value || typeof value !== 'object' || !('rsvp' in value)) return null;
  const rsvp = value.rsvp;
  if (!rsvp || typeof rsvp !== 'object' || !('status' in rsvp)) return null;
  return isRsvpStatus(rsvp.status) ? rsvp.status : null;
}

function readApiError(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('error' in value)) return null;
  return typeof value.error === 'string' ? value.error : null;
}

// ---------------------------------------------------------------
// Hook
// ---------------------------------------------------------------
export function useRsvpPresence(eventId: string | undefined) {
  const [snapshot,    setSnapshot]    = useState<AttendeeSnapshot | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [myStatus,    setMyStatus]    = useState<RsvpStatus | null>(null);
  const [loading,     setLoading]     = useState(Boolean(eventId));
  const [error,       setError]       = useState<string | null>(null);

  const rsvpChannelRef     = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  // ── 1. Initial fetch from API (cache-first) ─────────────────
  const fetchSnapshot = useCallback(async (signal?: AbortSignal) => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/events/${eventId}/attendees`, { signal });
      if (!res.ok) throw new Error(await res.text());
      const data: AttendeeSnapshot = await res.json();
      if (signal?.aborted) return;
      setSnapshot(data);
    } catch (fetchError: unknown) {
      if (signal?.aborted) return;
      setError(getErrorMessage(fetchError, 'Could not load attendee activity.'));
    }
  }, [eventId]);

  // ── 2. Fetch caller's own RSVP status ───────────────────────
  const fetchMyRsvp = useCallback(async (signal?: AbortSignal) => {
    if (!eventId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || signal?.aborted) return; // anonymous users have no RSVP

    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal,
      });
      if (res.ok && !signal?.aborted) {
        const payload: unknown = await res.json();
        if (!signal?.aborted) setMyStatus(readRsvpStatus(payload));
      }
    } catch { /* ignore */ }
  }, [eventId]);

  // ── 3. Initial load ─────────────────────────────────────────
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const task = window.setTimeout(() => {
      if (!active) return;
      if (!eventId) {
        setSnapshot(null);
        setMyStatus(null);
        setError(null);
        setLoading(false);
        return;
      }

      setSnapshot(null);
      setMyStatus(null);
      setError(null);
      setLoading(true);
      void Promise.all([
        fetchSnapshot(controller.signal),
        fetchMyRsvp(controller.signal),
      ]).finally(() => {
        if (active) setLoading(false);
      });
    }, 0);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(task);
    };
  }, [eventId, fetchSnapshot, fetchMyRsvp]);

  // ── 4. Subscribe to rsvps table changes (Realtime) ──────────
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`rsvps:event:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',           // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'rsvps',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          // Refetch snapshot on any RSVP change (debounce not needed — API is cached)
          void fetchSnapshot();
        }
      )
      .subscribe();

    rsvpChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [eventId, fetchSnapshot]);

  // ── 5. Presence channel — track online viewers ──────────────
  useEffect(() => {
    if (!eventId) return;

    const presenceKey = `event-page:${eventId}`;
    const channel = supabase.channel(presenceKey, {
      config: { presence: { key: presenceKey } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          // Track this viewer; payload is metadata only (no PII)
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    presenceChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  // ── 6. Optimistic RSVP submit ────────────────────────────────
  const submitRsvp = useCallback(
    async (status: RsvpStatus, phone?: string): Promise<void> => {
      if (!eventId) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in to RSVP');
        return;
      }

      // Optimistic update
      const previousStatus  = myStatus;
      const previousSnapshot = snapshot;
      setMyStatus(status);
      if (snapshot) {
        const delta = status === 'going' ? 1 : previousStatus === 'going' ? -1 : 0;
        setSnapshot({
          ...snapshot,
          going_count: Math.max(0, snapshot.going_count + delta),
        });
      }

      const idempotency_key = `${session.user.id}:${eventId}:${Date.now()}`;

      try {
        const res = await fetch(`/api/events/${eventId}/rsvp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ status, phone, idempotency_key }),
        });

        if (!res.ok) {
          const payload: unknown = await res.json();
          throw new Error(readApiError(payload) ?? `RSVP request failed (${res.status}).`);
        }

        // Refetch real snapshot to reconcile
        await fetchSnapshot();
      } catch (submitError: unknown) {
        // Rollback optimistic update
        setMyStatus(previousStatus);
        setSnapshot(previousSnapshot);
        setError(getErrorMessage(submitError, 'Could not update your RSVP.'));
      }
    },
    [eventId, myStatus, snapshot, fetchSnapshot]
  );

  return {
    snapshot,
    onlineCount,
    myStatus,
    submitRsvp,
    loading,
    error,
  };
}
