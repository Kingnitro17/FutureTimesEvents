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

export function useEventChat(eventId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ── Initial history fetch ─────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;
    setLoading(true);

    supabase
      .from('messages')
      .select(`
        id,
        event_id,
        from_user_id,
        body,
        created_at,
        profiles:from_user_id (
          display_name,
          avatar_url,
          avatar_color,
          initials
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setMessages((data as unknown as ChatMessage[]) ?? []);
        setLoading(false);
      });
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
        async (payload) => {
          // Fetch with profile join — raw payload won't include joined rows
          const { data } = await supabase
            .from('messages')
            .select(`
              id,
              event_id,
              from_user_id,
              body,
              created_at,
              profiles:from_user_id (
                display_name,
                avatar_url,
                avatar_color,
                initials
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages(prev => [...prev, data as unknown as ChatMessage]);
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
