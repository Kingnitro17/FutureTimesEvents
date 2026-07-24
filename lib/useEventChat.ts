'use client';
// lib/useEventChat.ts
// Supabase Realtime hook for event-level chat (public messages per event).
// New messages appear instantly for all viewers via postgres_changes subscription.
//
// Usage:
//   const { messages, sendMessage, loading } = useEventChat(eventId);

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  id: string;
  event_id: string;
  from_user_id: string;
  body: string;
  created_at: string;
  // joined from profiles
  profiles: {
    display_name: string;
    avatar_url: string;
    avatar_color: string;
    initials: string;
  } | null;
}

type ChatMessageRow = Omit<ChatMessage, 'profiles'>;

interface PublicProfileCard {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_color: string | null;
  initials: string | null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not load event chat.';
}

async function attachPublicProfiles(rows: ChatMessageRow[]): Promise<ChatMessage[]> {
  const userIds = [...new Set(rows.map(row => row.from_user_id))];
  if (userIds.length === 0) return [];

  const { data } = await supabase
    .from('public_profile_cards')
    .select('id, display_name, avatar_url, avatar_color, initials')
    .in('id', userIds);

  const cards = new Map(
    ((data ?? []) as PublicProfileCard[]).map(card => [card.id, card]),
  );

  return rows.map(row => {
    const card = cards.get(row.from_user_id);
    return {
      ...row,
      profiles: card
        ? {
            display_name: card.display_name ?? 'Guest',
            avatar_url: card.avatar_url ?? '',
            avatar_color: card.avatar_color ?? '#7222E3',
            initials: card.initials ?? '',
          }
        : null,
    };
  });
}

export function useEventChat(eventId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading,  setLoading]  = useState(Boolean(eventId));
  const [error,    setError]    = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ── Initial history fetch ─────────────────────────────────────
  useEffect(() => {
    let active = true;
    const task = window.setTimeout(() => {
      if (!active) return;

      if (!eventId) {
        setMessages([]);
        setError(null);
        setLoading(false);
        return;
      }

      setMessages([]);
      setError(null);
      setLoading(true);

      void (async () => {
        try {
          const { data, error: queryError } = await supabase
            .from('messages')
            .select(`
              id,
              event_id,
              from_user_id,
              body,
              created_at
            `)
            .eq('event_id', eventId)
            .order('created_at', { ascending: true })
            .limit(100);

          if (!active) return;
          if (queryError) {
            setError(queryError.message);
            return;
          }
          const hydrated = await attachPublicProfiles(
            (data as unknown as ChatMessageRow[]) ?? [],
          );
          if (active) setMessages(hydrated);
        } catch (loadError: unknown) {
          if (active) setError(getErrorMessage(loadError));
        } finally {
          if (active) setLoading(false);
        }
      })();
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(task);
    };
  }, [eventId]);

  // ── Realtime subscription ─────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`chat:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `event_id=eq.${eventId}`,
        },
        async (payload: { new: { id: string } }) => {
          // Fetch with profile join — raw payload won't include joined rows
          const { data } = await supabase
            .from('messages')
            .select(`
              id,
              event_id,
              from_user_id,
              body,
              created_at
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const [message] = await attachPublicProfiles([
              data as unknown as ChatMessageRow,
            ]);
            if (!message) return;
            setMessages(prev => [...prev, message]);
            // Auto-scroll to bottom
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  // ── Send a message ────────────────────────────────────────────
  const sendMessage = useCallback(
    async (body: string): Promise<void> => {
      if (!eventId || !body.trim()) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in to chat');
        return;
      }

      const { error: err } = await supabase.from('messages').insert({
        event_id:     eventId,
        from_user_id: session.user.id,
        body:         body.trim(),
      });

      if (err) setError(err.message);
    },
    [eventId]
  );

  return { messages, sendMessage, loading, error, bottomRef };
}
