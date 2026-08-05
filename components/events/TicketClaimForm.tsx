'use client';

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  Ticket,
} from 'lucide-react';

export interface ClaimableTicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity_available: number;
  claim_limit_per_contact: number;
  claim_opens_at: string | null;
  claim_closes_at: string | null;
  is_active: boolean;
  is_visible?: boolean;
  sort_order?: number;
}

export interface IssuedTicketPayload {
  ticketId: string;
  ticketNumber: string;
  qrToken: string;
}

export interface TicketClaimReference {
  ticketId: string;
  ticketNumber: string;
}

interface TicketClaimFormProps {
  event: {
    id: string;
    title: string;
    starts_at: string;
    venue_name: string;
    status: string;
  };
  ticketTypes: ClaimableTicketType[];
  onSuccess: (
    tickets: TicketClaimReference[],
    options: { requiresQrReissue: boolean; ticketTypeId?: string },
  ) => void;
}

interface ClaimResponse {
  success?: boolean;
  result?: string;
  idempotent?: boolean;
  claimId?: string;
  quantity?: number;
  requiresQrReissue?: boolean;
  tickets?: unknown[];
  error?: string;
  details?: Record<string, string[]>;
  opensAt?: string;
  available?: number;
}

type Step = 'select' | 'details' | 'confirm' | 'success';

const API_MAX_QUANTITY = 10;

function formatPrice(value: number): string {
  if (value === 0) return 'Free';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getQuantityLimit(ticketType: ClaimableTicketType): number {
  return Math.max(
    1,
    Math.min(
      API_MAX_QUANTITY,
      ticketType.quantity_available,
      ticketType.claim_limit_per_contact,
    ),
  );
}

function isIssuedTicket(value: unknown): value is IssuedTicketPayload {
  if (!value || typeof value !== 'object') return false;

  const ticket = value as Partial<IssuedTicketPayload>;
  return Boolean(
    ticket.ticketId
      && ticket.ticketNumber
      && ticket.qrToken
      && typeof ticket.ticketId === 'string'
      && typeof ticket.ticketNumber === 'string'
      && typeof ticket.qrToken === 'string',
  );
}

function isSafeIssuedTicket(value: unknown): value is TicketClaimReference {
  if (!value || typeof value !== 'object') return false;

  const ticket = value as Partial<TicketClaimReference>;
  return Boolean(
    ticket.ticketId
      && ticket.ticketNumber
      && typeof ticket.ticketId === 'string'
      && typeof ticket.ticketNumber === 'string',
  );
}

function createIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('Secure random generation is unavailable in this browser.');
  }

  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function TicketClaimForm({
  event,
  ticketTypes,
  onSuccess,
}: TicketClaimFormProps) {
  const formId = useId();
  const idempotencyKeyRef = useRef<string | null>(null);

  const [step, setStep] = useState<Step>('select');
  const [selectedType, setSelectedType] = useState<ClaimableTicketType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [showInWhos, setShowInWhos] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [issuedTickets, setIssuedTickets] = useState<TicketClaimReference[]>([]);
  const [recoveryRequired, setRecoveryRequired] = useState(false);

  const visibleTypes = ticketTypes.filter(
    (ticketType) => ticketType.is_active && ticketType.is_visible !== false,
  );
  const activeTypes = visibleTypes.filter(
    (ticketType) => ticketType.quantity_available > 0,
  );
  const soldOutTypes = visibleTypes.filter(
    (ticketType) => ticketType.quantity_available <= 0,
  );
  const isSoldOut = activeTypes.length === 0;

  const maxQuantity = selectedType ? getQuantityLimit(selectedType) : 1;
  const total = selectedType ? selectedType.price * quantity : 0;
  const ticketWord = quantity === 1 ? 'ticket' : 'tickets';

  const validateDetails = (): boolean => {
    const errors: Record<string, string> = {};

    if (!attendeeName.trim() || attendeeName.trim().length < 2) {
      errors.attendeeName = 'Enter your full name (at least 2 characters)';
    }
    if (
      !attendeeEmail.trim()
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeEmail)
    ) {
      errors.attendeeEmail = 'Enter a valid email address';
    }
    if (attendeePhone && !/^\+?[\d\s\-()]{7,20}$/.test(attendeePhone)) {
      errors.attendeePhone = 'Enter a valid phone number';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleClaim = async () => {
    if (!selectedType || !termsAccepted || loading) return;

    setLoading(true);
    setServerError(null);

    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = createIdempotencyKey();
      }

      if (selectedType.price > 0) {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.functions.invoke('create-order', {
          body: {
            eventId: event.id,
            items: [{ ticketTypeId: selectedType.id, quantity }],
            idempotencyKey: idempotencyKeyRef.current,
            referralCode: new URLSearchParams(window.location.search).get('ref'),
          },
        });
        if (error || !data?.order_id) {
          setServerError(data?.error ?? 'Sign in to reserve and pay for this ticket.');
          return;
        }
        window.location.assign(`/checkout/${encodeURIComponent(data.order_id)}`);
        return;
      }

      const response = await fetch('/api/tickets/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          ticketTypeId: selectedType.id,
          attendeeName: attendeeName.trim(),
          attendeeEmail: attendeeEmail.trim().toLowerCase(),
          attendeePhone: attendeePhone.trim() || null,
          quantity,
          idempotencyKey: idempotencyKeyRef.current,
          showInWhosGoing: showInWhos,
          marketingOptIn,
          termsAccepted,
        }),
      });

      const data = await response.json() as ClaimResponse;

      if (!response.ok) {
        if (data.details) {
          const errors: Record<string, string> = {};
          Object.entries(data.details).forEach(([field, messages]) => {
            if (messages[0]) errors[field] = messages[0];
          });
          setFieldErrors(errors);
          setStep('details');
        } else if (typeof data.available === 'number') {
          setServerError(
            data.available > 0
              ? `Only ${data.available} ${data.available === 1 ? 'ticket is' : 'tickets are'} available.`
              : (data.error ?? 'This ticket type is sold out.'),
          );
        } else {
          setServerError(data.error ?? 'Something went wrong. Please try again.');
        }
        return;
      }

      const ticketMetadata = Array.isArray(data.tickets)
        ? data.tickets.filter(isSafeIssuedTicket)
        : [];

      if (data.result === 'already_claimed' || data.requiresQrReissue === true) {
        const replayQuantity = data.quantity ?? ticketMetadata.length;
        if (
          data.success !== true
          || ticketMetadata.length === 0
          || replayQuantity !== ticketMetadata.length
        ) {
          setServerError(
            'Your existing reservation could not be loaded. Sign in with the booking email and open your wallet.',
          );
          return;
        }

        setIssuedTickets(ticketMetadata);
        setRecoveryRequired(true);
        setStep('success');
        onSuccess(ticketMetadata, { requiresQrReissue: true });
        return;
      }

      const tickets = Array.isArray(data.tickets)
        ? data.tickets.filter(isIssuedTicket)
        : [];

      if (
        data.success !== true
        || tickets.length === 0
        || tickets.length !== quantity
        || (typeof data.quantity === 'number' && data.quantity !== tickets.length)
      ) {
        setServerError(
          'The booking response was incomplete. Please keep this page open and contact support.',
        );
        return;
      }

      try {
        tickets.forEach((ticket) => {
          sessionStorage.setItem(
            `fte:ticket:qr:${ticket.ticketId}`,
            ticket.qrToken,
          );
        });
      } catch {
        setServerError(
          'Your tickets were issued, but this browser blocked secure QR storage. Keep this page open and contact support.',
        );
        return;
      }

      setIssuedTickets(
        tickets.map(({ ticketId, ticketNumber }) => ({
          ticketId,
          ticketNumber,
        })),
      );
      setRecoveryRequired(false);
      setStep('success');
      onSuccess(tickets, {
        requiresQrReissue: false,
        ticketTypeId: selectedType.id,
      });
    } catch {
      setServerError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (event.status === 'cancelled') {
    return (
      <div className="rounded-[var(--r-xl)] border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto mb-2 text-red-500" size={28} aria-hidden="true" />
        <p className="font-bold text-red-700">
          This event has been cancelled.
        </p>
      </div>
    );
  }

  if (event.status !== 'published') {
    return (
      <div className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)] p-6 text-center">
        <AlertCircle className="mx-auto mb-2 text-[var(--text-muted)]" size={28} aria-hidden="true" />
        <p className="font-bold text-[var(--text)]">Ticket reservations are unavailable</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          This event is not currently accepting reservations.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--sp-4)' }}>
      {step !== 'success' && (
        <ol
          className="flex flex-wrap items-center gap-2 rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)]"
          style={{
            padding: 'clamp(0.875rem, 2.5vw, 1.125rem)',
            boxSizing: 'border-box',
          }}
          aria-label="Ticket reservation progress"
        >
          {(['select', 'details', 'confirm'] as const).map((progressStep, index) => {
            const steps: Step[] = ['select', 'details', 'confirm', 'success'];
            const isCurrent = step === progressStep;
            const isComplete = steps.indexOf(step) > index;

            return (
              <li key={progressStep} className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                    isCurrent || isComplete
                      ? 'text-white'
                      : 'bg-[var(--bg-card)] text-[var(--text-muted)]'
                  }`}
                  style={isCurrent || isComplete ? { background: 'var(--grad-primary)' } : undefined}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {index + 1}
                </span>
                <span className={isCurrent ? 'font-semibold text-[var(--text)]' : ''}>
                  {progressStep === 'select'
                    ? 'Ticket'
                    : progressStep === 'details'
                      ? 'Your info'
                      : 'Confirm'}
                </span>
                {index < 2 && <ChevronRight size={12} aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      )}

      {step === 'select' && (
        <div className="flex flex-col" style={{ gap: 'var(--sp-3)' }}>
          <div
            className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)]"
            style={{
              padding: 'clamp(1rem, 2.8vw, 1.375rem)',
              boxSizing: 'border-box',
            }}
          >
            <p className="type-overline text-[var(--text-muted)]">Reserve your spot</p>
            <h3 className="mt-1 font-bold text-[var(--text)]">Choose a ticket type</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)] leading-relaxed">
              You can reserve up to 10 tickets, subject to availability and the ticket limit.
            </p>
          </div>

          {isSoldOut && (
            <div
              className="rounded-[var(--r-lg)] border border-red-200 bg-red-50 p-4"
              role="status"
            >
              <p className="text-sm font-bold text-red-700">
                No tickets are currently available.
              </p>
            </div>
          )}

          {activeTypes.map((ticketType) => {
            const typeLimit = getQuantityLimit(ticketType);

            return (
              <button
                key={ticketType.id}
                type="button"
                onClick={() => {
                  setSelectedType(ticketType);
                  setQuantity(1);
                  setServerError(null);
                  setStep('details');
                }}
                className="w-full rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-card)] text-left transition hover:border-[var(--border-hover)] focus-visible:border-[var(--accent)]"
                style={{
                  padding: 'clamp(1rem, 2.8vw, 1.375rem)',
                  boxSizing: 'border-box',
                  minWidth: 0,
                }}
                aria-label={`Select ${ticketType.name}, ${formatPrice(ticketType.price)}`}
              >
                <span className="flex items-start justify-between gap-4">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[var(--text)]">{ticketType.name}</span>
                      <span className="rounded-full bg-[var(--bg-secondary)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        {ticketType.quantity_available} left
                      </span>
                    </span>
                    {ticketType.description && (
                      <span className="mt-2 block text-sm leading-relaxed text-[var(--text-muted)]">
                        {ticketType.description}
                      </span>
                    )}
                    <span className="mt-2 block text-xs text-[var(--text-muted)]">
                      Up to {typeLimit} {typeLimit === 1 ? 'ticket' : 'tickets'} per booking
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="type-overline block text-[var(--text-muted)]">Each</span>
                    <span className="mt-1 block text-xl font-black text-[var(--accent)]">
                      {formatPrice(ticketType.price)}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}

          {soldOutTypes.map((ticketType) => (
            <div
              key={ticketType.id}
              className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-card)] opacity-60"
              style={{
                padding: 'clamp(1rem, 2.8vw, 1.375rem)',
                boxSizing: 'border-box',
                minWidth: 0,
              }}
              aria-disabled="true"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-[var(--text)]">{ticketType.name}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Sold out</p>
                </div>
                <span className="badge badge-error">Sold out</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 'details' && selectedType && (
        <div className="flex flex-col" style={{ gap: 'var(--sp-4)' }}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-[var(--text)]">Reservation details</h3>
            <button
              type="button"
              onClick={() => {
                setServerError(null);
                setStep('select');
              }}
              className="min-h-11 rounded-full px-3 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text)]"
            >
              Change ticket
            </button>
          </div>

          <div
            className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)]"
            style={{
              padding: 'clamp(1rem, 2.8vw, 1.375rem)',
              boxSizing: 'border-box',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--text)]">{selectedType.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">
                  {event.title}
                </p>
              </div>
              <p className="shrink-0 font-black text-[var(--accent)]">
                {formatPrice(selectedType.price)} each
              </p>
            </div>

            <div
              className="flex items-center justify-between gap-4 border-t border-[var(--border)]"
              style={{ marginTop: 'var(--sp-4)', paddingTop: 'var(--sp-4)' }}
            >
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Quantity</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Maximum {maxQuantity}; {selectedType.quantity_available} remaining
                </p>
              </div>
              <div
                className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] p-1"
                role="group"
                aria-label="Ticket quantity"
              >
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  disabled={quantity <= 1}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text)] hover:bg-[var(--bg-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Decrease ticket quantity"
                >
                  <Minus size={16} aria-hidden="true" />
                </button>
                <output
                  className="min-w-8 text-center text-lg font-black text-[var(--text)]"
                  aria-live="polite"
                >
                  {quantity}
                </output>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
                  disabled={quantity >= maxQuantity}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text)] hover:bg-[var(--bg-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Increase ticket quantity"
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col" style={{ gap: 'var(--sp-3)' }}>
            <div>
              <label
                htmlFor={`${formId}-name`}
                className="mb-1 block text-sm font-medium text-[var(--text)]"
              >
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                id={`${formId}-name`}
                type="text"
                value={attendeeName}
                onChange={(event) => {
                  setAttendeeName(event.target.value);
                  setFieldErrors((current) => ({ ...current, attendeeName: '' }));
                }}
                placeholder="Your full name"
                autoComplete="name"
                aria-invalid={Boolean(fieldErrors.attendeeName)}
                aria-describedby={fieldErrors.attendeeName ? `${formId}-name-error` : undefined}
                className={`input ${fieldErrors.attendeeName ? 'border-red-400' : ''}`}
              />
              {fieldErrors.attendeeName && (
                <p id={`${formId}-name-error`} className="mt-1 text-xs text-red-500">
                  {fieldErrors.attendeeName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`${formId}-email`}
                className="mb-1 block text-sm font-medium text-[var(--text)]"
              >
                Email address <span className="text-red-500">*</span>
              </label>
              <input
                id={`${formId}-email`}
                type="email"
                value={attendeeEmail}
                onChange={(event) => {
                  setAttendeeEmail(event.target.value);
                  setFieldErrors((current) => ({ ...current, attendeeEmail: '' }));
                }}
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.attendeeEmail)}
                aria-describedby={fieldErrors.attendeeEmail ? `${formId}-email-error` : `${formId}-email-help`}
                className={`input ${fieldErrors.attendeeEmail ? 'border-red-400' : ''}`}
              />
              {fieldErrors.attendeeEmail ? (
                <p id={`${formId}-email-error`} className="mt-1 text-xs text-red-500">
                  {fieldErrors.attendeeEmail}
                </p>
              ) : (
                <p id={`${formId}-email-help`} className="mt-1 text-xs text-[var(--text-muted)]">
                  Used to identify this booking.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`${formId}-phone`}
                className="mb-1 block text-sm font-medium text-[var(--text)]"
              >
                WhatsApp / phone{' '}
                <span className="text-xs text-[var(--text-muted)]">(optional)</span>
              </label>
              <input
                id={`${formId}-phone`}
                type="tel"
                value={attendeePhone}
                onChange={(event) => {
                  setAttendeePhone(event.target.value);
                  setFieldErrors((current) => ({ ...current, attendeePhone: '' }));
                }}
                placeholder="+263 77 123 4567"
                autoComplete="tel"
                aria-invalid={Boolean(fieldErrors.attendeePhone)}
                aria-describedby={fieldErrors.attendeePhone ? `${formId}-phone-error` : undefined}
                className={`input ${fieldErrors.attendeePhone ? 'border-red-400' : ''}`}
              />
              {fieldErrors.attendeePhone && (
                <p id={`${formId}-phone-error`} className="mt-1 text-xs text-red-500">
                  {fieldErrors.attendeePhone}
                </p>
              )}
            </div>
          </div>

          <div
            className="flex flex-col rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)]"
            style={{ gap: 'var(--sp-3)', padding: 'var(--sp-3)', boxSizing: 'border-box' }}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={showInWhos}
                onChange={(event) => setShowInWhos(event.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-purple-500"
              />
              <span>
                <span className="block text-sm font-medium text-[var(--text)]">
                  Show me in Who&apos;s Going
                </span>
                <span className="mt-1 block text-xs text-[var(--text-muted)]">
                  Your display name may be visible to other attendees.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(event) => setMarketingOptIn(event.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-purple-500"
              />
              <span className="text-sm text-[var(--text)]">
                Keep me updated about Future Times Events
              </span>
            </label>
          </div>

          {serverError && (
            <div
              className="rounded-[var(--r-lg)] border border-red-200 bg-red-50 p-3"
              role="alert"
            >
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (validateDetails()) {
                setServerError(null);
                setStep('confirm');
              }
            }}
            className="btn btn-lg btn-primary w-full"
          >
            Review {quantity} {ticketWord}
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      {step === 'confirm' && selectedType && (
        <div className="space-y-4">
          <h3 className="font-bold text-[var(--text)]">Confirm your reservation</h3>

          <dl className="space-y-3 rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4 sm:p-5">
            <div className="flex justify-between gap-4 text-sm">
              <dt className="text-[var(--text-muted)]">Event</dt>
              <dd className="max-w-[65%] text-right font-semibold text-[var(--text)]">
                {event.title}
              </dd>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <dt className="text-[var(--text-muted)]">Ticket</dt>
              <dd className="text-right font-semibold text-[var(--text)]">
                {selectedType.name}
              </dd>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <dt className="text-[var(--text-muted)]">Quantity</dt>
              <dd className="font-semibold text-[var(--text)]">{quantity}</dd>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <dt className="text-[var(--text-muted)]">Name</dt>
              <dd className="max-w-[65%] break-words text-right font-semibold text-[var(--text)]">
                {attendeeName}
              </dd>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <dt className="text-[var(--text-muted)]">Email</dt>
              <dd className="max-w-[70%] break-all text-right font-semibold text-[var(--text)]">
                {attendeeEmail}
              </dd>
            </div>
            <div className="flex items-end justify-between gap-4 border-t border-[var(--border)] pt-3">
              <dt className="font-bold text-[var(--text)]">Total</dt>
              <dd className="text-2xl font-black text-[var(--accent)]">
                {formatPrice(total)}
              </dd>
            </div>
          </dl>

          <div className="flex items-start gap-3 rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <input
              id={`${formId}-acceptance`}
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-purple-500"
            />
            <div>
              <label
                htmlFor={`${formId}-acceptance`}
                className="cursor-pointer text-sm text-[var(--text-secondary)]"
              >
                I confirm these attendee and ticket details are correct, and I accept the event entry rules.
              </label>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                See how we handle your information in our{' '}
                <Link href="/privacy-policy" className="font-semibold text-[var(--accent)] hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>

          {serverError && (
            <div
              className="rounded-[var(--r-lg)] border border-red-200 bg-red-50 p-3"
              role="alert"
            >
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            <button
              type="button"
              onClick={() => setStep('details')}
              disabled={loading}
              className="btn btn-lg btn-outline px-5"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleClaim}
              disabled={!termsAccepted || loading}
              className="btn btn-lg btn-primary min-w-0 px-4"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  Reserving…
                </>
              ) : (
                <>
                  <Ticket size={18} aria-hidden="true" />
                  Reserve {quantity} {ticketWord}
                </>
              )}
            </button>
          </div>
          <p className="text-center text-xs text-[var(--text-muted)]">
            Each ticket receives its own unique QR code.
          </p>
        </div>
      )}

      {step === 'success' && (
        <div className="space-y-5 py-2 text-center" role="status" aria-live="polite">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: 'var(--grad-emerald)' }}
          >
            <CheckCircle2 size={32} className="text-white" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-[var(--text)]">
              {issuedTickets.length}{' '}
              {recoveryRequired
                ? (issuedTickets.length === 1 ? 'ticket was already reserved' : 'tickets were already reserved')
                : (issuedTickets.length === 1 ? 'ticket is ready' : 'tickets are ready')}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {recoveryRequired
                ? 'For security, a retried booking never returns QR credentials again. Sign in with the booking email, open your wallet, and recover each issued QR there.'
                : 'Open each ticket now. QR access is saved only for this browser session.'}
            </p>
          </div>
          {recoveryRequired && (
            <Link href="/tickets" className="btn btn-lg btn-primary w-full">
              Open secure ticket wallet
            </Link>
          )}
          <ul className="space-y-2 text-left">
            {issuedTickets.map((ticket) => (
              <li key={ticket.ticketId}>
                <Link
                  href={`/ticket/${ticket.ticketId}`}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 font-semibold text-[var(--text)] hover:border-[var(--border-hover)]"
                >
                  <span className="truncate">{ticket.ticketNumber}</span>
                  <span className="shrink-0 text-sm text-[var(--accent)]">View ticket</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
