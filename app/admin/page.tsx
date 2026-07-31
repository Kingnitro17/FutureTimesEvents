'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Clock3, RefreshCw, Send, ShieldCheck, Ticket, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

type ReviewEvent = {
  id: string; title: string; slug: string; status: string; organizer_name: string;
  date: string; time: string; venue_name: string; city: string; description: string;
  image_url: string | null; capacity: number; submitted_at: string | null;
  organizer_notes: string | null;
  ticket_types: Array<{ id: string; name: string; price: number; quantity_total: number; quantity_available: number; claim_limit_per_contact: number }>;
};

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const [events, setEvents] = useState<ReviewEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const loadQueue = useCallback(async () => {
    if (user?.role !== 'super_admin') { setLoading(false); return; }
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.from('events').select(`
      id,title,slug,status,organizer_name,date,time,venue_name,city,description,image_url,
      capacity,submitted_at,organizer_notes,
      ticket_types(id,name,price,quantity_total,quantity_available,claim_limit_per_contact)
    `).in('status', ['pending_review', 'changes_requested']).order('submitted_at', { ascending: false });
    if (error) toast.error('Could not load the review queue.');
    setEvents((data ?? []) as unknown as ReviewEvent[]);
    setLoading(false);
  }, [user?.role]);

  useEffect(() => {
    const task = window.setTimeout(() => void loadQueue(), 0);
    return () => window.clearTimeout(task);
  }, [loadQueue]);

  const review = async (eventId: string, action: 'approve_publish' | 'request_changes' | 'reject') => {
    setActing(eventId);
    try {
      const response = await fetch('/api/admin/events/review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, action, reason: reasons[eventId] || undefined }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Review action failed.');
      toast.success(action === 'approve_publish' ? 'Event approved and published.' : 'Review decision saved.');
      await loadQueue();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Review action failed.'); }
    finally { setActing(null); }
  };

  if (isLoading) return <div className="min-h-screen grid place-items-center"><RefreshCw className="animate-spin text-[var(--accent)]" /></div>;
  if (!user) return <div className="page-offset min-h-screen grid place-items-center p-6 text-center"><div><ShieldCheck className="mx-auto mb-4" /><h1 className="type-h2">Admin sign-in required</h1><Link className="btn btn-grad text-white mt-5" href="/login">Sign in</Link></div></div>;
  if (user.role !== 'super_admin') return <div className="page-offset min-h-screen grid place-items-center p-6 text-center"><div><ShieldCheck className="mx-auto mb-4 text-[var(--text-muted)]" /><h1 className="type-h2">Super-admin access required</h1><p className="mt-2 text-[var(--text-muted)]">This review queue is restricted.</p></div></div>;

  return (
    <main className="page-offset min-h-screen pb-nav bg-[var(--bg-secondary)]">
      <div className="container py-8 sm:py-12">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div><span className="type-overline text-[var(--accent)] flex items-center gap-2"><ShieldCheck size={14} /> Super admin</span><h1 className="type-h1 mt-2">Event review queue</h1><p className="text-[var(--text-muted)] mt-2">Review details and inventory before publishing.</p></div>
          <button className="btn btn-ghost" onClick={() => void loadQueue()} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</button>
        </header>

        {loading ? <div className="card rounded-[var(--r-2xl)] p-8 text-center">Loading submissions…</div> : events.length === 0 ? (
          <div className="card rounded-[var(--r-2xl)] p-10 text-center"><CheckCircle2 className="mx-auto text-emerald-500 mb-3" /><h2 className="type-h3">Queue is clear</h2><p className="text-[var(--text-muted)] mt-2">New organizer submissions will appear here.</p></div>
        ) : <div className="space-y-6">{events.map(event => (
          <article key={event.id} className="card rounded-[var(--r-2xl)] p-5 sm:p-7 overflow-hidden">
            <div className="grid md:grid-cols-[180px_1fr] gap-5">
              {event.image_url ? <div className="relative w-full h-40 md:h-full min-h-40"><Image src={event.image_url} alt="" fill sizes="(max-width: 768px) 100vw, 180px" className="rounded-[var(--r-xl)] object-cover" /></div> : <div className="h-40 rounded-[var(--r-xl)] bg-[var(--bg-tertiary)] grid place-items-center"><Clock3 /></div>}
              <div className="min-w-0"><div className="flex flex-wrap gap-2 items-center"><span className="badge badge-warn">Pending review</span><span className="text-xs text-[var(--text-muted)]">{event.submitted_at ? new Date(event.submitted_at).toLocaleString() : 'Not timestamped'}</span></div>
                <h2 className="type-h2 mt-3 break-words">{event.title}</h2><p className="text-sm text-[var(--text-muted)] mt-1">{event.organizer_name} · {event.date} {event.time} · {event.venue_name}, {event.city}</p>
                <p className="mt-4 text-sm leading-relaxed">{event.description}</p>{event.organizer_notes && <p className="mt-3 rounded-[var(--r-lg)] bg-[var(--bg-secondary)] p-3 text-sm"><strong>Organizer note:</strong> {event.organizer_notes}</p>}
                <div className="mt-5"><h3 className="font-bold flex items-center gap-2"><Ticket size={16} /> Ticket inventory</h3>{event.ticket_types.length ? <div className="mt-2 grid sm:grid-cols-2 gap-2">{event.ticket_types.map(t => <div key={t.id} className="rounded-[var(--r-lg)] border border-[var(--border)] p-3 text-sm"><strong>{t.name}</strong><div className="text-[var(--text-muted)]">${Number(t.price).toFixed(2)} · {t.quantity_total} total · max {t.claim_limit_per_contact}</div></div>)}</div> : <p className="text-sm text-red-600 mt-2">No ticket inventory configured. Do not publish yet.</p>}</div>
                <label className="block mt-5 text-sm font-semibold">Review reason<textarea className="input mt-2 min-h-20 w-full" value={reasons[event.id] ?? ''} onChange={e => setReasons(v => ({ ...v, [event.id]: e.target.value }))} placeholder="Required for changes or rejection" /></label>
                <div className="mt-4 flex flex-wrap gap-2"><button className="btn btn-grad text-white" disabled={acting === event.id || event.ticket_types.length === 0} onClick={() => void review(event.id, 'approve_publish')}><CheckCircle2 size={16} /> Approve & publish</button><button className="btn btn-ghost" disabled={acting === event.id} onClick={() => void review(event.id, 'request_changes')}><Send size={16} /> Request changes</button><button className="btn btn-ghost text-red-600" disabled={acting === event.id} onClick={() => void review(event.id, 'reject')}><XCircle size={16} /> Reject</button><Link className="btn btn-ghost" href={`/events/${event.slug}`}>Preview</Link></div>
              </div>
            </div>
          </article>
        ))}</div>}
      </div>
    </main>
  );
}
