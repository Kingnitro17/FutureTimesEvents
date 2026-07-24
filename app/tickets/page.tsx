'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  MapPin,
  Plus,
  QrCode,
  RefreshCw,
  Share2,
  Ticket as TicketIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { useTickets } from '@/lib/useTickets';
import { downloadTicketPng } from '@/lib/tickets/downloadTicket';
import QRDisplay from '@/components/tickets/QRDisplay';
import type { WalletTicket } from '@/types';

const STATUS = {
  issued: {
    label: 'Active',
    badgeClass: 'badge-success',
    Icon: TicketIcon,
  },
  checked_in: {
    label: 'Checked in',
    badgeClass: 'badge-info',
    Icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'badge-error',
    Icon: AlertCircle,
  },
  revoked: {
    label: 'Revoked',
    badgeClass: 'badge-error',
    Icon: AlertCircle,
  },
} as const;

type WalletFilter = 'all' | 'active' | 'used';

function storageKey(ticketId: string) {
  return `fte:ticket:qr:${ticketId}`;
}

function formatEventDate(ticket: WalletTicket) {
  const value = ticket.event.startsAt ? new Date(ticket.event.startsAt) : null;
  if (!value || Number.isNaN(value.getTime())) return 'Date to be announced';
  return value.toLocaleString('en-ZW', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Harare',
  });
}

export default function TicketsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { tickets, loading, error, refetch } = useTickets(user);
  const [filter, setFilter] = useState<WalletFilter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [qrTokens, setQrTokens] = useState<Record<string, string>>({});
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  const readSessionToken = (ticket: WalletTicket) => {
    if (ticket.status !== 'issued') {
      sessionStorage.removeItem(storageKey(ticket.id));
      return null;
    }
    return sessionStorage.getItem(storageKey(ticket.id));
  };

  const clearSessionToken = (ticketId: string) => {
    sessionStorage.removeItem(storageKey(ticketId));
    setQrTokens(current => {
      const next = { ...current };
      delete next[ticketId];
      return next;
    });
  };

  const validateSessionToken = async (ticket: WalletTicket, token: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken: token }),
        cache: 'no-store',
      });
      const result = await response.json() as {
        qrTokenValid?: boolean;
        ticket?: { status?: string };
      };

      if (response.ok && result.ticket?.status && result.ticket.status !== ticket.status) {
        void refetch();
      }

      if (
        response.ok
        && result.qrTokenValid === true
        && result.ticket?.status === 'issued'
      ) {
        return token;
      }
    } catch {
      // Keep the credential hidden when its validity cannot be confirmed.
    }

    clearSessionToken(ticket.id);
    return null;
  };

  const openTicket = async (ticket: WalletTicket) => {
    const isOpen = expanded === ticket.id;
    setExpanded(isOpen ? null : ticket.id);
    if (isOpen) return;

    const token = readSessionToken(ticket);
    if (!token) return;

    const validated = await validateSessionToken(ticket, token);
    if (validated) {
      setQrTokens(current => ({ ...current, [ticket.id]: validated }));
    }
  };

  const recoverQr = async (ticket: WalletTicket) => {
    const existing = readSessionToken(ticket);
    if (existing) {
      const validated = await validateSessionToken(ticket, existing);
      if (validated) {
        setQrTokens(current => ({ ...current, [ticket.id]: validated }));
        return validated;
      }
    }

    const confirmed = window.confirm(
      'Recovering this QR creates a new secure code and invalidates any older downloaded copy. Continue?',
    );
    if (!confirmed) return null;

    setRecoveringId(ticket.id);
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
      setQrTokens(current => ({ ...current, [ticket.id]: result.qrToken as string }));
      toast.success('A new secure QR code is ready.');
      return result.qrToken;
    } catch (reissueError) {
      toast.error(reissueError instanceof Error ? reissueError.message : 'Could not recover this QR.');
      return null;
    } finally {
      setRecoveringId(null);
    }
  };

  const downloadTicket = async (ticket: WalletTicket) => {
    try {
      const stored = readSessionToken(ticket);
      const token = stored
        ? await validateSessionToken(ticket, stored) ?? await recoverQr(ticket)
        : await recoverQr(ticket);
      if (!token) return;
      await downloadTicketPng(ticket, token);
      toast.success(`${ticket.ticketNumber} downloaded.`);
    } catch (downloadError) {
      toast.error(downloadError instanceof Error ? downloadError.message : 'Download failed.');
    }
  };

  const shareEvent = async (ticket: WalletTicket) => {
    const url = `${window.location.origin}/events/${ticket.event.slug}`;
    const data = {
      title: ticket.event.title,
      text: `I have a ticket for ${ticket.event.title} at ${ticket.event.venue}.`,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Event link copied.');
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      toast.error('Could not share this event.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-10 h-10 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin"
          role="status"
          aria-label="Loading tickets"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-nav px-4">
        <div className="card rounded-3xl p-8 text-center space-y-4 max-w-md">
          <TicketIcon className="mx-auto text-[var(--accent)]" size={44} aria-hidden />
          <h1 className="type-h2 text-[var(--text)]">Sign in to view your tickets</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Your secure ticket wallet is linked to your account email.
          </p>
          <Link href="/login?next=/tickets" className="btn btn-lg btn-grad text-white">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const filtered = tickets.filter(ticket => {
    if (filter === 'active') return ticket.status === 'issued';
    if (filter === 'used') return ticket.status === 'checked_in';
    return true;
  });

  return (
    <div className="min-h-screen page-offset pb-nav bg-[var(--bg-secondary)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="container py-7 sm:py-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <p className="section-label">My account</p>
            <h1 className="text-3xl sm:text-4xl font-black text-[var(--text)] mb-2">
              My Tickets
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {tickets.length} individual admission{tickets.length === 1 ? '' : 's'} in your wallet
            </p>
          </motion.div>
        </div>
      </header>

      <div className="container py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex gap-2" role="group" aria-label="Filter tickets">
            {(['all', 'active', 'used'] as const).map(value => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`btn btn-sm capitalize ${
                  filter === value ? 'btn-grad text-white' : 'btn-ghost'
                }`}
                aria-pressed={filter === value}
              >
                {value}
              </button>
            ))}
          </div>
          <Link href="/events" className="btn btn-sm btn-grad text-white w-fit">
            <Plus size={15} aria-hidden />
            Get tickets
          </Link>
        </div>

        {error && (
          <div className="card rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <AlertCircle className="text-red-500 shrink-0" aria-hidden />
            <div className="flex-1">
              <p className="font-semibold text-[var(--text)]">Could not load your wallet</p>
              <p className="text-sm text-[var(--text-muted)]">{error}</p>
            </div>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => void refetch()}>
              <RefreshCw size={14} aria-hidden />
              Retry
            </button>
          </div>
        )}

        {!error && filtered.length === 0 ? (
          <div className="card rounded-3xl p-10 sm:p-14 text-center max-w-2xl mx-auto">
            <TicketIcon className="mx-auto mb-5 text-[var(--accent)]" size={48} aria-hidden />
            <h2 className="type-h3 text-[var(--text)] mb-2">No tickets here yet</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Reserve an event ticket and it will appear here as a real, scannable admission.
            </p>
            <Link href="/events" className="btn btn-md btn-grad text-white">
              Browse events
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((ticket, index) => {
              const status = STATUS[ticket.status];
              const StatusIcon = status.Icon;
              const isOpen = expanded === ticket.id;
              const qrToken = qrTokens[ticket.id];
              const isRecovering = recoveringId === ticket.id;

              return (
                <motion.article
                  key={ticket.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.2) }}
                  className="card rounded-2xl sm:rounded-3xl p-0 overflow-hidden"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white"
                        style={{ background: 'var(--grad-primary)' }}
                      >
                        <StatusIcon size={22} aria-hidden />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`badge ${status.badgeClass}`}>{status.label}</span>
                          <span className="font-mono text-xs text-[var(--text-muted)]">
                            {ticket.ticketNumber}
                          </span>
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-[var(--text)] leading-tight">
                          {ticket.event.title}
                        </h2>
                        <div className="mt-3 grid gap-2 text-sm text-[var(--text-muted)] sm:grid-cols-2">
                          <span className="flex items-start gap-2">
                            <Calendar size={15} className="mt-0.5 shrink-0" aria-hidden />
                            {formatEventDate(ticket)}
                          </span>
                          <span className="flex items-start gap-2">
                            <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden />
                            {ticket.event.venue || 'Venue to be announced'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void openTicket(ticket)}
                        className="w-11 h-11 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text)] hover:bg-[var(--bg-secondary)] shrink-0"
                        aria-expanded={isOpen}
                        aria-controls={`ticket-${ticket.id}-details`}
                        aria-label={isOpen ? 'Hide ticket details' : 'Show ticket details'}
                      >
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>

                    {isOpen && (
                      <div
                        id={`ticket-${ticket.id}-details`}
                        className="mt-5 pt-5 border-t border-[var(--border)] grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]"
                      >
                        <div className="space-y-4">
                          <dl className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-[var(--bg-secondary)] p-4">
                              <dt className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                                Ticket holder
                              </dt>
                              <dd className="font-semibold text-[var(--text)] mt-1">
                                {ticket.holderName}
                              </dd>
                              <dd className="text-sm text-[var(--text-muted)] break-all">
                                {ticket.holderEmail}
                              </dd>
                            </div>
                            <div className="rounded-2xl bg-[var(--bg-secondary)] p-4">
                              <dt className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                                Admission
                              </dt>
                              <dd className="font-semibold text-[var(--text)] mt-1">
                                {ticket.ticketType.name}
                              </dd>
                              <dd className="text-sm text-[var(--text-muted)]">
                                Issued {new Date(ticket.issuedAt).toLocaleDateString('en-ZW')}
                              </dd>
                            </div>
                          </dl>

                          {ticket.status === 'checked_in' && (
                            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                              <p className="font-semibold text-emerald-600 dark:text-emerald-300">
                                This ticket has been checked in and is no longer valid for entry.
                              </p>
                              {ticket.checkedInAt && (
                                <p className="text-sm text-[var(--text-muted)] mt-1">
                                  Checked in {new Date(ticket.checkedInAt).toLocaleString('en-ZW')}
                                  {ticket.gate ? ` at ${ticket.gate}` : ''}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                            <Link
                              href={`/ticket/${ticket.id}`}
                              className="btn btn-sm btn-primary w-full justify-center sm:w-auto"
                            >
                              <Eye size={14} aria-hidden />
                              Full ticket
                            </Link>
                            {ticket.status === 'issued' && (
                              <button
                                type="button"
                                onClick={() => void downloadTicket(ticket)}
                                disabled={isRecovering}
                                className="btn btn-sm btn-outline w-full justify-center sm:w-auto"
                              >
                                {isRecovering
                                  ? <RefreshCw size={14} className="animate-spin" aria-hidden />
                                  : <Download size={14} aria-hidden />}
                                Download PNG
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void shareEvent(ticket)}
                              className="btn btn-sm btn-ghost w-full justify-center sm:w-auto"
                            >
                              <Share2 size={14} aria-hidden />
                              Share event
                            </button>
                            <Link
                              href={`/events/${ticket.event.slug}`}
                              className="btn btn-sm btn-ghost w-full justify-center sm:w-auto"
                            >
                              View event
                            </Link>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-[var(--bg-secondary)] p-4 flex flex-col items-center justify-center min-h-56">
                          {ticket.status !== 'issued' ? (
                            <div className="text-center">
                              <StatusIcon className="mx-auto text-[var(--text-muted)]" size={36} aria-hidden />
                              <p className="mt-2 font-semibold text-[var(--text)]">
                                QR no longer active
                              </p>
                            </div>
                          ) : qrToken ? (
                            <>
                              <QRDisplay
                                token={qrToken}
                                size={180}
                                label={`Entry QR for ${ticket.ticketNumber}`}
                              />
                              <p className="text-xs text-[var(--text-muted)] text-center mt-2">
                                Present this code at the entrance.
                              </p>
                            </>
                          ) : (
                            <div className="text-center">
                              <QrCode className="mx-auto text-[var(--accent)]" size={36} aria-hidden />
                              <p className="mt-2 text-sm font-semibold text-[var(--text)]">
                                Secure QR hidden
                              </p>
                              <p className="mt-1 text-xs text-[var(--text-muted)]">
                                Recover it only on a device you trust.
                              </p>
                              <button
                                type="button"
                                onClick={() => void recoverQr(ticket)}
                                disabled={isRecovering}
                                className="btn btn-sm btn-primary mt-3"
                              >
                                {isRecovering
                                  ? <RefreshCw size={14} className="animate-spin" aria-hidden />
                                  : <QrCode size={14} aria-hidden />}
                                {isRecovering ? 'Recovering…' : 'Show QR'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
