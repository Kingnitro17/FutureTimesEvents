'use client';

import { useState, useId } from 'react';
import { Ticket, CheckCircle2, Loader2, AlertCircle, ChevronRight } from 'lucide-react';

interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity_available: number;
  claim_limit_per_contact: number;
  claim_opens_at: string | null;
  claim_closes_at: string | null;
  is_active: boolean;
}

interface TicketClaimFormProps {
  event: {
    id: string;
    title: string;
    starts_at: string;
    venue_name: string;
    status: string;
  };
  ticketTypes: TicketType[];
  onSuccess: (ticketId: string, ticketNumber: string, qrToken: string) => void;
}

type Step = 'select' | 'details' | 'confirm' | 'success';

function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function TicketClaimForm({ event, ticketTypes, onSuccess }: TicketClaimFormProps) {
  const formId = useId();

  const [step,          setStep]          = useState<Step>('select');
  const [selectedType,  setSelectedType]  = useState<TicketType | null>(null);
  const [attendeeName,  setAttendeeName]  = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [showInWhos,    setShowInWhos]    = useState(false);
  const [marketingOptIn,setMarketingOptIn]= useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [fieldErrors,   setFieldErrors]   = useState<Record<string, string>>({});
  const [serverError,   setServerError]   = useState<string | null>(null);

  const activeTypes = ticketTypes.filter(t => t.is_active && t.quantity_available > 0);
  const soldOutTypes = ticketTypes.filter(t => t.is_active && t.quantity_available === 0);
  const isSoldOut = activeTypes.length === 0;

  const validateDetails = (): boolean => {
    const errors: Record<string, string> = {};
    if (!attendeeName.trim() || attendeeName.trim().length < 2)
      errors.attendeeName = 'Enter your full name (at least 2 characters)';
    if (!attendeeEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeEmail))
      errors.attendeeEmail = 'Enter a valid email address';
    if (attendeePhone && !/^\+?[\d\s\-()]{7,20}$/.test(attendeePhone))
      errors.attendeePhone = 'Enter a valid phone number';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleClaim = async () => {
    if (!selectedType || !termsAccepted) return;
    setLoading(true);
    setServerError(null);

    const idempotencyKey = generateIdempotencyKey();

    try {
      const res = await fetch('/api/tickets/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId:        event.id,
          ticketTypeId:   selectedType.id,
          attendeeName:   attendeeName.trim(),
          attendeeEmail:  attendeeEmail.trim().toLowerCase(),
          attendeePhone:  attendeePhone.trim() || null,
          quantity:       1,
          idempotencyKey,
          showInWhosGoing: showInWhos,
          marketingOptIn,
          termsAccepted,
        }),
      });

      const data = await res.json() as {
        success?: boolean;
        ticketId?: string;
        ticketNumber?: string;
        qrToken?: string;
        error?: string;
        details?: Record<string, string[]>;
        opensAt?: string;
        available?: number;
      };

      if (!res.ok) {
        if (data.details) {
          const errs: Record<string, string> = {};
          Object.entries(data.details).forEach(([k, v]) => { errs[k] = v[0]; });
          setFieldErrors(errs);
          setStep('details');
        } else {
          setServerError(data.error ?? 'Something went wrong. Please try again.');
        }
        return;
      }

      if (data.ticketId && data.ticketNumber && data.qrToken) {
        setStep('success');
        onSuccess(data.ticketId, data.ticketNumber, data.qrToken);
      }
    } catch {
      setServerError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (event.status === 'cancelled') {
    return (
      <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center">
        <AlertCircle className="mx-auto mb-2 text-red-500" size={28} />
        <p className="font-bold text-red-700 dark:text-red-400">This event has been cancelled.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      {step !== 'success' && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          {(['select', 'details', 'confirm'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s ? 'text-white scale-110' :
                ['select', 'details', 'confirm'].indexOf(step) > i ? 'text-white opacity-70' : 'text-[var(--text-muted)] bg-[var(--bg-tertiary)]'
              }`} style={step === s || ['select','details','confirm'].indexOf(step) > i
                ? { background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }
                : {}}>
                {i + 1}
              </div>
              <span className={step === s ? 'font-semibold text-[var(--text)]' : ''}>
                {s === 'select' ? 'Ticket' : s === 'details' ? 'Your info' : 'Confirm'}
              </span>
              {i < 2 && <ChevronRight size={12} />}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Select ticket type */}
      {step === 'select' && (
        <div className="space-y-3">
          <h3 className="font-bold text-[var(--text)]">Choose your ticket</h3>

          {isSoldOut && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="font-bold text-red-700 dark:text-red-400 text-sm">This event is sold out.</p>
            </div>
          )}

          {activeTypes.map(tt => (
            <button
              key={tt.id}
              onClick={() => { setSelectedType(tt); setStep('details'); }}
              className={`w-full p-4 rounded-2xl text-left border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                selectedType?.id === tt.id
                  ? 'border-purple-400 shadow-md'
                  : 'border-[var(--border)] hover:border-purple-300'
              } bg-[var(--bg-card)]`}
              aria-label={`Select ${tt.name} ticket`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[var(--text)]">{tt.name}</p>
                  {tt.description && (
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">{tt.description}</p>
                  )}
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {tt.quantity_available} available · Max {tt.claim_limit_per_contact} per person
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-2xl" style={{ color: 'var(--accent)' }}>
                    {tt.price === 0 ? 'FREE' : `$${tt.price}`}
                  </p>
                </div>
              </div>
            </button>
          ))}

          {soldOutTypes.map(tt => (
            <div key={tt.id} className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] opacity-50 cursor-not-allowed">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-[var(--text)]">{tt.name}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Sold out</p>
                </div>
                <span className="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full">
                  SOLD OUT
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 2: Attendee details */}
      {step === 'details' && selectedType && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[var(--text)]">Your details</h3>
            <button onClick={() => setStep('select')} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
              ← Change ticket
            </button>
          </div>

          {/* Ticket reminder */}
          <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">{selectedType.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{event.title}</p>
            </div>
            <p className="font-black text-xl" style={{ color: 'var(--accent)' }}>
              {selectedType.price === 0 ? 'FREE' : `$${selectedType.price}`}
            </p>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div>
              <label htmlFor={`${formId}-name`} className="block text-sm font-medium text-[var(--text)] mb-1">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                id={`${formId}-name`}
                type="text"
                value={attendeeName}
                onChange={e => { setAttendeeName(e.target.value); setFieldErrors(v => ({...v, attendeeName: ''})); }}
                placeholder="Your full name"
                autoComplete="name"
                className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border text-[var(--text)] outline-none focus:ring-2 focus:ring-purple-400/40 transition-all ${
                  fieldErrors.attendeeName ? 'border-red-400' : 'border-[var(--border)] focus:border-purple-400'
                }`}
              />
              {fieldErrors.attendeeName && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.attendeeName}</p>
              )}
            </div>

            <div>
              <label htmlFor={`${formId}-email`} className="block text-sm font-medium text-[var(--text)] mb-1">
                Email address <span className="text-red-500">*</span>
              </label>
              <input
                id={`${formId}-email`}
                type="email"
                value={attendeeEmail}
                onChange={e => { setAttendeeEmail(e.target.value); setFieldErrors(v => ({...v, attendeeEmail: ''})); }}
                placeholder="you@example.com"
                autoComplete="email"
                className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border text-[var(--text)] outline-none focus:ring-2 focus:ring-purple-400/40 transition-all ${
                  fieldErrors.attendeeEmail ? 'border-red-400' : 'border-[var(--border)] focus:border-purple-400'
                }`}
              />
              {fieldErrors.attendeeEmail && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.attendeeEmail}</p>
              )}
              <p className="text-xs text-[var(--text-muted)] mt-1">Your ticket confirmation will be sent here.</p>
            </div>

            <div>
              <label htmlFor={`${formId}-phone`} className="block text-sm font-medium text-[var(--text)] mb-1">
                WhatsApp / phone <span className="text-[var(--text-muted)] text-xs">(optional)</span>
              </label>
              <input
                id={`${formId}-phone`}
                type="tel"
                value={attendeePhone}
                onChange={e => { setAttendeePhone(e.target.value); setFieldErrors(v => ({...v, attendeePhone: ''})); }}
                placeholder="+263 77 123 4567"
                autoComplete="tel"
                className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border text-[var(--text)] outline-none focus:ring-2 focus:ring-purple-400/40 transition-all ${
                  fieldErrors.attendeePhone ? 'border-red-400' : 'border-[var(--border)] focus:border-purple-400'
                }`}
              />
              {fieldErrors.attendeePhone && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.attendeePhone}</p>
              )}
            </div>
          </div>

          {/* Opt-ins */}
          <div className="space-y-2 pt-1">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={showInWhos}
                onChange={e => setShowInWhos(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-purple-500"
              />
              <div>
                <p className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                  Show me in &quot;Who&apos;s Going&quot;
                </p>
                <p className="text-xs text-[var(--text-muted)]">Your name may be visible to other attendees on the event page.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={e => setMarketingOptIn(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-purple-500"
              />
              <div>
                <p className="text-sm text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                  Keep me updated on Future Times Events
                </p>
              </div>
            </label>
          </div>

          <button
            onClick={() => { if (validateDetails()) setStep('confirm'); }}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }}
          >
            Continue →
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && selectedType && (
        <div className="space-y-4">
          <h3 className="font-bold text-[var(--text)]">Confirm your ticket</h3>

          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Event</span>
              <span className="font-semibold text-[var(--text)] text-right max-w-[60%]">{event.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Ticket</span>
              <span className="font-semibold text-[var(--text)]">{selectedType.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Name</span>
              <span className="font-semibold text-[var(--text)]">{attendeeName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Email</span>
              <span className="font-semibold text-[var(--text)]">{attendeeEmail}</span>
            </div>
            <div className="border-t border-[var(--border)] pt-3 flex justify-between font-bold">
              <span className="text-[var(--text)]">Total</span>
              <span className="text-2xl" style={{ color: 'var(--accent)' }}>
                {selectedType.price === 0 ? 'FREE' : `$${selectedType.price}`}
              </span>
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-purple-400 transition-colors">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-purple-500"
              aria-label="Accept terms and conditions"
            />
            <p className="text-sm text-[var(--text-secondary)]">
              I agree to the <a href="/terms" className="text-purple-500 hover:underline">Terms & Conditions</a> and{' '}
              <a href="/privacy" className="text-purple-500 hover:underline">Privacy Policy</a>. I understand my ticket is non-transferable.
            </p>
          </label>

          {serverError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{serverError}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('details')}
              className="px-5 py-4 rounded-2xl font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleClaim}
              disabled={!termsAccepted || loading}
              className="flex-1 py-4 rounded-2xl font-black text-white text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }}
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Securing your ticket…</>
              ) : (
                <><Ticket size={18} /> Claim My Ticket</>
              )}
            </button>
          </div>
          <p className="text-center text-xs text-[var(--text-muted)]">
            Your ticket is secured server-side. Double submissions are protected.
          </p>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 'success' && (
        <div className="text-center space-y-4 py-4">
          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#46FFAB,#7222E3)' }}>
            <CheckCircle2 size={40} color="white" />
          </div>
          <div>
            <h3 className="font-black text-2xl text-[var(--text)]">You&apos;re in! 🎉</h3>
            <p className="text-[var(--text-muted)] mt-1">
              Your ticket is below. Save or screenshot your QR code.
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              A confirmation will be sent to <strong>{attendeeEmail}</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
