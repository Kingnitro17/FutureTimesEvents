'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RefreshCw, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

type Attendee = { id: string; display_name: string; avatar_url: string | null; avatar_color: string | null; initials: string | null };
type Attendance = { count: number; attendees: Attendee[]; joined: boolean };

export default function WhosGoing({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const [data, setData] = useState<Attendance | null>(null);
  const [error, setError] = useState(false);
  const [mutating, setMutating] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const response = await fetch(`/api/events/${eventId}/attendance`, { cache: 'no-store' });
      if (!response.ok) throw new Error();
      setData(await response.json());
    } catch { setError(true); }
  }, [eventId]);

  useEffect(() => { const task = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(task); }, [load]);

  const toggle = async () => {
    if (!data || mutating) return;
    const previous = data;
    const going = !data.joined;
    setData({ ...data, joined: going, count: Math.max(0, data.count + (going ? 1 : -1)) });
    setMutating(true);
    try {
      const response = await fetch(`/api/events/${eventId}/attendance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ going }),
      });
      if (!response.ok) throw new Error();
      await load();
    } catch { setData(previous); setError(true); }
    finally { setMutating(false); }
  };

  return (
    <section
      className="card rounded-[var(--r-2xl)]"
      style={{ padding: 'clamp(1.25rem, 4vw, 1.75rem)', boxSizing: 'border-box' }}
      aria-labelledby="whos-going-title"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div><p className="type-overline text-[var(--text-muted)]">Community</p><h2 id="whos-going-title" className="type-h3 mt-1 flex items-center gap-2"><Users size={20} className="text-[var(--accent)]" /> Who&apos;s Going</h2></div>
        {!user ? <Link href={`/login?next=${encodeURIComponent(`/events/${eventId}`)}`} className="btn btn-sm btn-ghost">Sign in to join</Link> : data && <button className={data.joined ? 'btn btn-sm btn-ghost' : 'btn btn-sm btn-grad text-white'} disabled={mutating} onClick={() => void toggle()}>{mutating ? 'Saving…' : data.joined ? 'Leave list' : 'I’m Going'}</button>}
      </div>

      {!data && !error && <div className="mt-5 flex items-center gap-3 text-sm text-[var(--text-muted)]"><RefreshCw size={16} className="animate-spin" /> Loading attendee list…</div>}
      {error && <div className="mt-5 flex items-center gap-3"><p className="text-sm text-[var(--text-muted)] flex-1">We could not load the public attendee list.</p><button className="btn btn-sm btn-ghost" onClick={() => void load()}>Retry</button></div>}
      {data && !error && (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <p className="text-sm text-[var(--text-muted)]">{data.count === 0 ? 'Be the first person to join the public attendee list.' : `${data.count} ${data.count === 1 ? 'person has' : 'people have'} opted in publicly.`}</p>
          {data.attendees.length > 0 && <div className="mt-4 flex flex-wrap gap-3">{data.attendees.map(attendee => (
            <div key={attendee.id} className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] py-1.5 pl-1.5 pr-3 max-w-full">
              <span className="relative grid place-items-center w-8 h-8 rounded-full overflow-hidden text-xs font-bold text-white shrink-0" style={{ background: attendee.avatar_color || 'var(--grad-primary)' }}>{attendee.avatar_url ? <Image src={attendee.avatar_url} alt="" fill sizes="32px" className="object-cover" /> : attendee.initials || attendee.display_name.slice(0, 2).toUpperCase()}</span>
              <span className="text-sm font-semibold truncate">{attendee.display_name}</span>
            </div>
          ))}</div>}
          {data.joined && <p className="mt-4 text-sm font-semibold text-[var(--accent)]">You&apos;re going — your public display name is visible here.</p>}
        </div>
      )}
    </section>
  );
}
