'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  LockKeyhole,
  MapPin,
  QrCode,
  RefreshCw,
  Share2,
  ShieldCheck,
  Ticket as TicketIcon,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import QRDisplay from '@/components/tickets/QRDisplay';
import { downloadTicketPng } from '@/lib/tickets/downloadTicket';
import type { WalletTicket } from '@/types';

const GRADIENTS: Record<string, string> = {
  music: 'var(--grad-primary)',
  tech: 'var(--grad-electric)',
  art: 'var(--grad-cosmic)',
  food: 'var(--grad-fire)',
  wellness: 'var(--grad-emerald)',
  sports: 'var(--grad-ocean)',
  lounge: 'var(--grad-primary)',
};

function storageKey(ticketId: string) {
  return `fte:ticket:qr:${ticketId}`;
}

function validDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function TicketViewPage() {
  const params = useParams<{ ticketId: string }>();
  const ticketId = params?.ticketId ?? '';
  const [ticket, setTicket] = useState<WalletTicket | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;

    const storedToken = sessionStorage.getItem(storageKey(ticketId));
    try {
      const response = await fetch(`/api/tickets/${ticketId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storedToken ? { qrToken: storedToken } : {}),
        cache: 'no-store',
      });
      const result = await response.json() as {
        ticket?: WalletTicket;
        qrTokenValid?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ticket) {
        throw new Error(result.error ?? 'Ticket not found.');
      }

      setTicket(result.ticket);
      setError(null);

      if (result.ticket.status === 'issued' && storedToken && result.qrTokenValid === true) {
        setQrToken(storedToken);
      } else {
        sessionStorage.removeItem(storageKey(ticketId));
        setQrToken(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load this ticket.');
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void loadTicket();
    }, 0);
    return () => window.clearTimeout(task);
  }, [loadTicket]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadTicket();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => document.removeEventListener('visibilitychange', refreshWhenVisible);
  }, [loadTicket]);

  const recoverQr = async () => {
    if (!ticket || ticket.status !== 'issued') return;
    const confirmed = window.confirm(
      'Create a new secure QR code? Any older downloaded copy of this ticket will stop working.',
    );
    if (!confirmed) return;

    setRecovering(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/qr/reissue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json() as { qrToken?: string; error?: string };

      if (!response.ok || !result.qrToken) {
        throw new Error(result.error ?? 'Could not recover this QR code.');
      }

      sessionStorage.setItem(storageKey(ticket.id), result.qrToken);
      setQrToken(result.qrToken);
      toast.success('New secure QR created. Older copies are now invalid.');
    } catch (reissueError) {
      toast.error(reissueError instanceof Error ? reissueError.message : 'QR recovery failed.');
    } finally {
      setRecovering(false);
    }
  };

  const downloadTicket = async () => {
    if (!ticket) return;
    try {
      let token = qrToken;
      if (!token) {
        await recoverQr();
        token = sessionStorage.getItem(storageKey(ticket.id));
      }
      if (!token) return;
      await downloadTicketPng(ticket, token);
      toast.success(`${ticket.ticketNumber} downloaded.`);
    } catch (downloadError) {
      toast.error(downloadError instanceof Error ? downloadError.message : 'Download failed.');
    }
  };

  const shareEvent = async () => {
    if (!ticket) return;
    const url = `${window.location.origin}/events/${ticket.event.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: ticket.event.title,
          text: `I am going to ${ticket.event.title} at ${ticket.event.venue}.`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Event link copied.');
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      toast.error('Could not share the event.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen page-offset flex items-center justify-center">
        <Loader2 size={34} className="animate-spin text-[var(--accent)]" aria-label="Loading ticket" />
      </div>
    );
  }

  if (error || !ticket) {
    const needsLogin = error?.toLowerCase().includes('access required');
    return (
      <div className="min-h-screen page-offset flex items-center justify-center px-4">
        <div className="card rounded-3xl p-8 text-center max-w-md w-full">
          <LockKeyhole size={44} className="mx-auto mb-4 text-[var(--accent)]" aria-hidden />
          <h1 className="text-xl font-bold text-[var(--text)] mb-2">
            {needsLogin ? 'Sign in to open this ticket' : 'Ticket unavailable'}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {error ?? 'Ticket not found.'}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            {needsLogin && (
              <Link href={`/login?next=/ticket/${ticketId}`} className="btn btn-md btn-primary">
                Sign in
              </Link>
            )}
            <Link href="/tickets" className="btn btn-md btn-outline">
              My tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const gradient = GRADIENTS[ticket.event.category] ?? GRADIENTS.lounge;
  const startsAt = validDate(ticket.event.startsAt);
  const isIssued = ticket.status === 'issued';
  const isCheckedIn = ticket.status === 'checked_in';
  const isInactive = ticket.status === 'cancelled' || ticket.status === 'revoked';

  return (
    <div
      className="min-h-screen page-offset bg-[var(--bg-secondary)] box-border w-full max-w-full min-w-0"
      style={{ paddingBottom: 'var(--sp-7)' }}
    >
      <div
        className="container box-border w-full max-w-full min-w-0"
        style={{ paddingBlock: 'var(--sp-5)' }}
      >
        <div className="max-w-lg w-full min-w-0" style={{ marginInline: 'auto' }}>
          <Link
            href="/tickets"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
            style={{ marginBottom: 'var(--sp-3)' }}
          >
            <ArrowLeft size={15} aria-hidden />
            Back to wallet
          </Link>

          <article className="overflow-hidden rounded-[32px] border border-[var(--border)] shadow-2xl box-border w-full max-w-full min-w-0">
            <header
              className="text-white relative overflow-hidden"
              style={{
                background: gradient,
                padding: 'clamp(1.25rem, 4vw, 2rem)',
                boxSizing: 'border-box',
              }}
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
                aria-hidden
              />
              <div className="relative flex min-w-0 flex-col" style={{ gap: 'var(--sp-2)' }}>
                <p className="text-white/75 text-xs font-bold uppercase tracking-[0.2em]">
                  Future Times Events
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-black leading-tight break-words">
                  {ticket.event.title}
                </h1>
                <p className="text-white/85 font-semibold break-words">{ticket.ticketType.name}</p>
                <div style={{ paddingTop: 'var(--sp-2)' }}>
                  {isIssued && (
                    <span
                      className="inline-flex items-center gap-2 rounded-full bg-white/20 text-xs font-bold backdrop-blur"
                      style={{ padding: 'var(--sp-2) var(--sp-3)' }}
                    >
                      <ShieldCheck size={14} aria-hidden />
                      ACTIVE TICKET
                    </span>
                  )}
                  {isCheckedIn && (
                    <span
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-950/25 text-xs font-bold backdrop-blur"
                      style={{ padding: 'var(--sp-2) var(--sp-3)' }}
                    >
                      <CheckCircle2 size={14} aria-hidden />
                      CHECKED IN · NO LONGER VALID
                    </span>
                  )}
                  {isInactive && (
                    <span
                      className="inline-flex items-center gap-2 rounded-full bg-red-950/30 text-xs font-bold backdrop-blur"
                      style={{ padding: 'var(--sp-2) var(--sp-3)' }}
                    >
                      <XCircle size={14} aria-hidden />
                      {ticket.status.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </header>

            <div className="relative flex items-center bg-[var(--bg-card)]" aria-hidden>
              <div className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] -ml-3" />
              <div className="flex-1 border-t-2 border-dashed border-[var(--border)]" />
              <div className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] -mr-3" />
            </div>

            <div
              className="bg-[var(--bg-card)]"
              style={{
                padding: 'clamp(1.25rem, 4vw, 2rem)',
                boxSizing: 'border-box',
              }}
            >
              <div
                className="flex flex-col items-center min-h-64 justify-center w-full min-w-0"
                style={{ gap: 'var(--sp-3)' }}
              >
                {isIssued && qrToken ? (
                  <>
                    <QRDisplay
                      token={qrToken}
                      size={220}
                      label={`Entry QR for ${ticket.ticketNumber}`}
                    />
                    <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
                      Present this QR at the entrance. It can be checked in once.
                    </p>
                  </>
                ) : isIssued ? (
                  <div
                    className="rounded-3xl bg-[var(--bg-secondary)] text-center w-full flex flex-col items-center"
                    style={{ padding: 'var(--sp-4)', gap: 'var(--sp-2)', boxSizing: 'border-box' }}
                  >
                    <QrCode size={44} className="mx-auto text-[var(--accent)]" aria-hidden />
                    <h2 className="font-bold text-[var(--text)]">Secure QR hidden</h2>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                      Recover a new code on this trusted device. Older QR copies will be invalidated.
                    </p>
                    <button
                      type="button"
                      onClick={() => void recoverQr()}
                      disabled={recovering}
                      className="btn btn-md btn-primary"
                      style={{ marginTop: 'var(--sp-2)' }}
                    >
                      {recovering
                        ? <RefreshCw size={16} className="animate-spin" aria-hidden />
                        : <ShieldCheck size={16} aria-hidden />}
                      {recovering ? 'Recovering…' : 'Recover QR'}
                    </button>
                  </div>
                ) : isCheckedIn ? (
                  <div
                    className="text-center flex flex-col items-center"
                    style={{ paddingBlock: 'var(--sp-4)', gap: 'var(--sp-2)' }}
                  >
                    <CheckCircle2 size={64} className="mx-auto text-emerald-500" aria-hidden />
                    <h2 className="font-black text-xl text-emerald-600 dark:text-emerald-300">
                      Already checked in
                    </h2>
                    {ticket.checkedInAt && (
                      <p className="text-sm text-[var(--text-muted)]">
                        {new Date(ticket.checkedInAt).toLocaleString('en-ZW')}
                        {ticket.gate ? ` · ${ticket.gate}` : ''}
                      </p>
                    )}
                    <p className="text-xs text-[var(--text-muted)]">
                      This QR is no longer valid for entry.
                    </p>
                  </div>
                ) : (
                  <div
                    className="text-center flex flex-col items-center"
                    style={{ paddingBlock: 'var(--sp-4)', gap: 'var(--sp-2)' }}
                  >
                    <XCircle size={64} className="mx-auto text-red-500" aria-hidden />
                    <h2 className="font-black text-xl text-red-500 capitalize">
                      Ticket {ticket.status}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      Entry is not permitted with this ticket.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-[var(--border)]" style={{ marginBlock: 'var(--sp-4)' }} />

              <dl className="flex flex-col" style={{ gap: 'var(--sp-2)' }}>
                <div className="flex items-start gap-3 min-w-0" style={{ padding: 'var(--sp-3)' }}>
                  <Calendar size={17} className="text-[var(--text-muted)] mt-0.5 shrink-0" aria-hidden />
                  <div className="min-w-0 flex flex-col" style={{ gap: 'var(--sp-1)' }}>
                    <dt className="text-xs text-[var(--text-muted)]">Date</dt>
                    <dd className="font-semibold text-[var(--text)] text-sm break-words">
                      {startsAt
                        ? startsAt.toLocaleDateString('en-ZW', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            timeZone: 'Africa/Harare',
                          })
                        : 'To be announced'}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3 min-w-0" style={{ padding: 'var(--sp-3)' }}>
                  <Clock size={17} className="text-[var(--text-muted)] mt-0.5 shrink-0" aria-hidden />
                  <div className="min-w-0 flex flex-col" style={{ gap: 'var(--sp-1)' }}>
                    <dt className="text-xs text-[var(--text-muted)]">Time</dt>
                    <dd className="font-semibold text-[var(--text)] text-sm">
                      {startsAt
                        ? startsAt.toLocaleTimeString('en-ZW', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Africa/Harare',
                          })
                        : 'To be announced'}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3 min-w-0" style={{ padding: 'var(--sp-3)' }}>
                  <MapPin size={17} className="text-[var(--text-muted)] mt-0.5 shrink-0" aria-hidden />
                  <div className="min-w-0 flex flex-col" style={{ gap: 'var(--sp-1)' }}>
                    <dt className="text-xs text-[var(--text-muted)]">Venue</dt>
                    <dd className="font-semibold text-[var(--text)] text-sm">
                      {ticket.event.venue || 'To be announced'}
                    </dd>
                    {ticket.event.address && (
                      <dd className="text-xs text-[var(--text-muted)] break-words">{ticket.event.address}</dd>
                    )}
                  </div>
                </div>
              </dl>

              <div className="border-t border-dashed border-[var(--border)]" style={{ marginBlock: 'var(--sp-4)' }} />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 flex flex-col" style={{ padding: 'var(--sp-3)', gap: 'var(--sp-1)' }}>
                  <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Ticket holder</p>
                  <p className="font-bold text-[var(--text)] break-words">{ticket.holderName}</p>
                  <p className="text-xs text-[var(--text-muted)] break-all">{ticket.holderEmail}</p>
                </div>
                <div className="min-w-0 flex flex-col" style={{ padding: 'var(--sp-3)', gap: 'var(--sp-1)' }}>
                  <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Ticket number</p>
                  <p className="font-mono font-bold text-[var(--text)] break-all">{ticket.ticketNumber}</p>
                  <p className="text-xs text-[var(--text-muted)]">One admission</p>
                </div>
              </div>
            </div>
          </article>

          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 w-full min-w-0"
            style={{ marginTop: 'var(--sp-4)' }}
          >
            <button
              type="button"
              onClick={() => void shareEvent()}
              className="btn btn-md btn-outline"
            >
              <Share2 size={16} aria-hidden />
              Share event
            </button>
            {isIssued ? (
              <button
                type="button"
                onClick={() => void downloadTicket()}
                disabled={recovering}
                className="btn btn-md btn-primary"
              >
                <Download size={16} aria-hidden />
                Download PNG
              </button>
            ) : (
              <Link href={`/events/${ticket.event.slug}`} className="btn btn-md btn-primary">
                <TicketIcon size={16} aria-hidden />
                Event details
              </Link>
            )}
          </div>

          <p
            className="text-center text-xs text-[var(--text-muted)] leading-relaxed"
            style={{ marginTop: 'var(--sp-3)', paddingInline: 'var(--sp-2)' }}
          >
            QR verification happens online at the entrance. Never share your ticket QR.
          </p>
        </div>
      </div>
    </div>
  );
}
