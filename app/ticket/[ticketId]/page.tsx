'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, MapPin, Clock, Download, Share2, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import QRDisplay from '@/components/tickets/QRDisplay';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

interface TicketData {
  id: string;
  ticket_number: string;
  attendee_name: string;
  attendee_email: string;
  status: 'issued' | 'checked_in' | 'cancelled' | 'revoked';
  quantity: number;
  issued_at: string;
  checked_in_at: string | null;
  gate: string | null;
  ticket_type_name: string;
  event_title: string;
  event_slug: string;
  event_starts_at: string;
  event_venue_name: string;
  event_address: string;
  event_cover_image_url: string | null;
  event_category: string;
}

const GRAD_MAP: Record<string, string> = {
  music:    'linear-gradient(135deg,#FF55C2,#7222E3)',
  tech:     'linear-gradient(135deg,#1D5BFF,#C7FE17)',
  art:      'linear-gradient(135deg,#DD1FFF,#24D8FB)',
  food:     'linear-gradient(135deg,#FFBC73,#FF00B9)',
  wellness: 'linear-gradient(135deg,#46FFAB,#A02EFF)',
  sports:   'linear-gradient(135deg,#2CC4EA,#533885)',
  lounge:   'linear-gradient(135deg,#FF55C2,#7222E3)',
};

export default function TicketViewPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params?.ticketId as string;
  const supabase = getSupabaseBrowserClient();

  const [ticket,   setTicket]   = useState<TicketData | null>(null);
  const [qrToken,  setQrToken]  = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();

      // Try to get token from sessionStorage (set after claim — only valid for current session)
      const storedToken = sessionStorage.getItem(`qr-token-${ticketId}`);
      if (storedToken) setQrToken(storedToken);

      if (user) {
        setAuthUser({ id: user.id, email: user.email ?? '' });
      } else if (!storedToken) {
        // Not authenticated and no stored token — redirect to login
        router.push(`/auth/login?next=/ticket/${ticketId}`);
        return;
      }

      // Fetch ticket data (no QR hash — that never leaves server)
      const { data, error: fetchErr } = await supabase
        .from('tickets')
        .select(`
          id,
          ticket_number,
          attendee_name,
          attendee_email,
          status,
          quantity,
          issued_at,
          checked_in_at,
          gate,
          ticket_types(name),
          events(title, slug, starts_at, venue_name, address, cover_image_url, category)
        `)
        .eq('id', ticketId)
        .single();

      if (fetchErr || !data) {
        setError('Ticket not found or you do not have permission to view it.');
        setLoading(false);
        return;
      }

      // Verify ownership: email must match or user must be authenticated owner
      const ev = data.events as unknown as { title: string; slug: string; starts_at: string; venue_name: string; address: string; cover_image_url: string | null; category: string };
      const tt = data.ticket_types as unknown as { name: string };

      if (user && data.attendee_email !== user.email?.toLowerCase()) {
        const isAdmin = await supabase.from('profiles').select('role').eq('id', user.id).single()
          .then((r: any) => ['admin', 'super_admin'].includes(r.data?.role ?? ''));
        if (!isAdmin) {
          setError('You do not have permission to view this ticket.');
          setLoading(false);
          return;
        }
      }

      setTicket({
        id:                   data.id,
        ticket_number:        data.ticket_number,
        attendee_name:        data.attendee_name,
        attendee_email:       data.attendee_email,
        status:               data.status as TicketData['status'],
        quantity:             data.quantity,
        issued_at:            data.issued_at,
        checked_in_at:        data.checked_in_at,
        gate:                 data.gate,
        ticket_type_name:     tt?.name ?? 'General Admission',
        event_title:          ev?.title ?? '',
        event_slug:           ev?.slug ?? '',
        event_starts_at:      ev?.starts_at ?? '',
        event_venue_name:     ev?.venue_name ?? '',
        event_address:        ev?.address ?? '',
        event_cover_image_url: ev?.cover_image_url ?? null,
        event_category:       ev?.category ?? 'lounge',
      });
      setLoading(false);
    };
    load();
  }, [ticketId]);

  // Store QR token in sessionStorage after claim (called from claim success callback)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('t');
    if (tokenParam) {
      sessionStorage.setItem(`qr-token-${ticketId}`, tokenParam);
      setQrToken(tokenParam);
      // Clean URL
      window.history.replaceState({}, '', `/ticket/${ticketId}`);
    }
  }, [ticketId]);

  const handleShare = async () => {
    if (!ticket) return;
    const shareData = {
      title: ticket.event_title,
      text:  `I'm going to ${ticket.event_title} at ${ticket.event_venue_name}!`,
      url:   `${window.location.origin}/events/${ticket.event_slug}`,
    };
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      alert('Event link copied!');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center page-offset">
      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  );

  if (error || !ticket) return (
    <div className="min-h-screen flex items-center justify-center page-offset px-4">
      <div className="text-center max-w-sm">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
        <h2 className="font-bold text-xl text-[var(--text)] mb-2">{error ?? 'Ticket not found'}</h2>
        <Link href="/" className="btn btn-md btn-outline mt-4">Go home</Link>
      </div>
    </div>
  );

  const grad = GRAD_MAP[ticket.event_category] ?? GRAD_MAP.lounge;
  const startsAt = new Date(ticket.event_starts_at);
  const isCheckedIn = ticket.status === 'checked_in';
  const isCancelled = ticket.status === 'cancelled' || ticket.status === 'revoked';

  return (
    <div className="min-h-screen page-offset pb-10 bg-[var(--bg-secondary)]">
      <div className="max-w-sm mx-auto px-4 pt-6 space-y-4">

        {/* Back */}
        <Link href={`/events/${ticket.event_slug}`}
          className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
          <ArrowLeft size={14} />
          Back to event
        </Link>

        {/* Ticket card */}
        <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ border: '1px solid var(--border)' }}>

          {/* Ticket header */}
          <div className="p-6 relative overflow-hidden" style={{ background: grad }}>
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-2">Future Times Events</p>
            <h1 className="font-display text-2xl font-black text-white leading-tight">{ticket.event_title}</h1>
            <p className="text-white/80 font-medium mt-1">{ticket.ticket_type_name}</p>

            {/* Status badge */}
            {isCheckedIn && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-green-300" />
                <span className="text-white text-xs font-bold">CHECKED IN</span>
              </div>
            )}
            {isCancelled && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/30 backdrop-blur-sm">
                <span className="text-white text-xs font-bold">
                  {ticket.status === 'revoked' ? 'REVOKED' : 'CANCELLED'}
                </span>
              </div>
            )}
          </div>

          {/* Tear line */}
          <div className="relative flex items-center bg-[var(--bg-card)]">
            <div className="w-5 h-5 rounded-full bg-[var(--bg-secondary)] -ml-2.5" />
            <div className="flex-1 border-t-2 border-dashed border-[var(--border)]" />
            <div className="w-5 h-5 rounded-full bg-[var(--bg-secondary)] -mr-2.5" />
          </div>

          {/* Ticket body */}
          <div className="bg-[var(--bg-card)] p-6 space-y-5">

            {/* QR Code or status */}
            <div className="flex flex-col items-center">
              {qrToken && !isCancelled && !isCheckedIn ? (
                <>
                  <QRDisplay token={qrToken} size={200} label={`QR code for ${ticket.ticket_number}`} />
                  <p className="text-xs text-[var(--text-muted)] mt-2 text-center">
                    Show this at the entrance
                  </p>
                </>
              ) : isCheckedIn ? (
                <div className="text-center py-6">
                  <div className="text-6xl mb-2">✅</div>
                  <p className="font-bold text-green-600 dark:text-green-400">Checked In</p>
                  {ticket.checked_in_at && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {new Date(ticket.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      {ticket.gate ? ` at ${ticket.gate}` : ''}
                    </p>
                  )}
                </div>
              ) : isCancelled ? (
                <div className="text-center py-6">
                  <div className="text-6xl mb-2">❌</div>
                  <p className="font-bold text-red-500 capitalize">{ticket.status}</p>
                </div>
              ) : (
                <div className="text-center py-6 space-y-2">
                  <div className="text-4xl">🔒</div>
                  <p className="text-sm text-[var(--text-muted)]">QR code available after signing in</p>
                  <Link href={`/auth/login?next=/ticket/${ticketId}`}
                    className="block px-4 py-2 rounded-xl text-sm font-bold text-white"
                    style={{ background: grad }}>
                    Sign in to view QR
                  </Link>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-[var(--border)]" />

            {/* Ticket details */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Date</p>
                  <p className="font-semibold text-[var(--text)] text-sm">
                    {startsAt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={16} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Time</p>
                  <p className="font-semibold text-[var(--text)] text-sm">
                    {startsAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Venue</p>
                  <p className="font-semibold text-[var(--text)] text-sm">{ticket.event_venue_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{ticket.event_address}</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-[var(--border)]" />

            {/* Holder info */}
            <div className="space-y-1">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">Ticket holder</p>
              <p className="font-bold text-[var(--text)]">{ticket.attendee_name}</p>
              <p className="text-sm text-[var(--text-muted)]">{ticket.attendee_email}</p>
            </div>

            {/* Ticket number */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)]">
              <p className="text-xs text-[var(--text-muted)]">Ticket #</p>
              <p className="font-mono font-bold text-sm text-[var(--text)]">{ticket.ticket_number}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {!isCancelled && (
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className="flex-1 py-3 rounded-2xl border border-[var(--border)] font-semibold text-[var(--text)] text-sm hover:bg-[var(--bg-card)] transition-colors flex items-center justify-center gap-2"
              aria-label="Share event"
            >
              <Share2 size={15} />
              Share Event
            </button>
            {authUser && (
              <Link
                href="/tickets"
                className="flex-1 py-3 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2"
                style={{ background: grad }}
              >
                My Tickets
              </Link>
            )}
          </div>
        )}

        <p className="text-center text-xs text-[var(--text-muted)] leading-relaxed">
          This ticket is non-transferable and verified server-side at the entrance.
          <br />Do not share your QR code with anyone.
        </p>
      </div>
    </div>
  );
}
