'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DbNotification, Notification } from '@/types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function mapDbNotif(row: DbNotification): Notification {
  return {
    id:      row.id,
    type:    row.type,
    title:   row.title,
    message: row.message,
    time:    timeAgo(row.created_at),
    read:    row.read,
    eventId: row.event_id,
  };
}

export function useNotifications(userId: string | undefined) {
  const [notifs,  setNotifs]  = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchNotifs = useCallback(async () => {
    if (!userId) { setNotifs([]); setLoading(false); return; }
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
      setNotifs([]);
    } else {
      setNotifs((data as DbNotification[]).map(mapDbNotif));
    }
    setLoading(false);
  }, [userId]);

  // Initial fetch
  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  // ── Realtime subscription — new notifications arrive instantly ──
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: DbNotification }) => {
          const newNotif = mapDbNotif(payload.new as DbNotification);
          setNotifs(prev => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markRead = async (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  const markAllRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    if (userId) await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
  };

  return { notifs, loading, error, markRead, markAllRead, refetch: fetchNotifs };
}
