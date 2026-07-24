'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Keyboard,
  LogOut,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { ScanResult } from '@/components/scanner/CameraScanner';

const supabase = getSupabaseBrowserClient();

const CameraScanner = dynamic(() => import('@/components/scanner/CameraScanner'), {
  ssr: false,
  loading: () => (
    <div className="h-72 flex items-center justify-center" role="status" aria-label="Loading camera scanner">
      <div className="w-9 h-9 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" />
    </div>
  ),
});

interface EventInfo {
  id: string;
  slug: string;
  title: string;
  starts_at: string | null;
  venue: string;
  status: string;
  gate: string | null;
}

interface ScanLog {
  id: string;
  result: ScanResult['result'];
  attendeeName?: string;
  ticketNumber?: string;
  time: Date;
}

interface CheckInStats {
  totalIssued: number;
  totalCheckedIn: number;
}

interface StaffAssignmentRow {
  gate: string | null;
  events: {
    id: string;
    slug: string;
    title: string;
    starts_at: string | null;
    venue: string | null;
    venue_name: string | null;
    status: string;
  } | null;
}

function scanResultLabel(result: ScanResult['result']) {
  const labels: Record<ScanResult['result'], string> = {
    valid_checked_in: 'Admitted',
    already_checked_in: 'Already scanned',
    not_found: 'Ticket not found',
    wrong_event: 'Wrong event',
    cancelled: 'Ticket cancelled',
    revoked: 'Ticket revoked',
    event_not_open: 'Check-in not open',
    invalid_token: 'Invalid QR token',
    invalid_status: 'Ticket is not valid',
    error: 'System error',
  };
  return labels[result];
}

export default function CheckInPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<{ display_name: string; role: string } | null>(null);
  const [assignedEvents, setAssignedEvents] = useState<EventInfo[]>([]);
  const [assignedEvent, setAssignedEvent] = useState<EventInfo | null>(null);
  const [gate, setGate] = useState<string | null>(null);
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualInput, setManualInput] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualResult, setManualResult] = useState<ScanResult | null>(null);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [stats, setStats] = useState<CheckInStats>({ totalIssued: 0, totalCheckedIn: 0 });
  const [isOnline, setIsOnline] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const task = window.setTimeout(() => {
      void (async () => {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          router.replace('/login?next=/checkin');
          return;
        }
        if (cancelled) return;

        setUser({ id: authUser.id, email: authUser.email ?? '' });
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('display_name, role, account_status')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileError || !userProfile || userProfile.account_status !== 'active') {
          if (!cancelled) {
            setSetupError('Your active staff profile could not be verified.');
            setLoadingData(false);
          }
          return;
        }
        if (cancelled) return;
        setProfile({ display_name: userProfile.display_name, role: userProfile.role });

        const { data: staffRows } = await supabase
          .from('event_staff')
          .select(`
            gate,
            events (
              id,
              slug,
              title,
              starts_at,
              venue,
              venue_name,
              status
            )
          `)
          .eq('user_id', authUser.id)
          .eq('is_active', true)
          .order('assigned_at', { ascending: false });

        let event: EventInfo | null = null;
        const staffAssignments = (staffRows ?? []) as unknown as StaffAssignmentRow[];
        let availableEvents: EventInfo[] = staffAssignments.flatMap((staff) => {
          if (!staff.events) return [];
          const assigned = staff.events as unknown as {
            id: string;
            slug: string;
            title: string;
            starts_at: string | null;
            venue: string | null;
            venue_name: string | null;
            status: string;
          };
          return [{
            id: assigned.id,
            slug: assigned.slug,
            title: assigned.title,
            starts_at: assigned.starts_at,
            venue: assigned.venue_name ?? assigned.venue ?? '',
            status: assigned.status,
            gate: staff.gate,
          }];
        });

        if (availableEvents.length > 0) {
          event = availableEvents.find(
            assigned => assigned.slug === 'alick-macheso-peter-moyo-live',
          ) ?? availableEvents[0];
        } else if (['admin', 'super_admin'].includes(userProfile.role)) {
          const { data: latestEvent } = await supabase
            .from('events')
            .select('id, slug, title, starts_at, venue, venue_name, status')
            .in('status', ['published', 'sold_out'])
            .order('starts_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestEvent) {
            event = {
              id: latestEvent.id,
              slug: latestEvent.slug,
              title: latestEvent.title,
              starts_at: latestEvent.starts_at,
              venue: latestEvent.venue_name ?? latestEvent.venue ?? '',
              status: latestEvent.status,
              gate: null,
            };
            availableEvents = [event];
          }
        }

        if (!cancelled) {
          setAssignedEvents(availableEvents);
          setAssignedEvent(event);
          setGate(event?.gate ?? null);
          setLoadingData(false);
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(task);
    };
  }, [router]);

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine);
    updateOnlineState();
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);
    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);

  const fetchStats = useCallback(async (eventId: string) => {
    const { data, error } = await supabase.rpc('get_checkin_stats', {
      p_event_id: eventId,
    });
    if (error || !data || typeof data !== 'object') return;

    const result = data as {
      result?: string;
      total_issued?: number;
      total_checked_in?: number;
    };
    if (result.result !== 'success') return;

    setStats({
      totalIssued: Math.max(Number(result.total_issued) || 0, 0),
      totalCheckedIn: Math.max(Number(result.total_checked_in) || 0, 0),
    });
  }, []);

  useEffect(() => {
    if (!assignedEvent?.id) return;
    const eventId = assignedEvent.id;
    const initial = window.setTimeout(() => {
      void fetchStats(eventId);
    }, 0);
    const polling = window.setInterval(() => {
      if (navigator.onLine) void fetchStats(eventId);
    }, 10_000);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(polling);
    };
  }, [assignedEvent?.id, fetchStats]);

  const assignedEventId = assignedEvent?.id;

  const handleScanResult = useCallback((result: ScanResult) => {
    setScanLogs(current => [{
      id: crypto.randomUUID(),
      result: result.result,
      attendeeName: result.attendeeName,
      ticketNumber: result.ticketNumber,
      time: new Date(),
    }, ...current].slice(0, 20));

    if (result.result === 'valid_checked_in' && assignedEventId) {
      void fetchStats(assignedEventId);
    }
  }, [assignedEventId, fetchStats]);

  const handleManualScan = async () => {
    if (!manualInput.trim() || !assignedEvent || !isOnline) return;
    setManualLoading(true);
    setManualResult(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken: manualInput.trim(),
          eventId: assignedEvent.id,
          gate,
        }),
      });
      const result = await response.json() as ScanResult & { error?: string };
      const finalResult: ScanResult = response.ok
        ? result
        : { result: 'error' };
      setManualResult(finalResult);
      handleScanResult(finalResult);
      if (finalResult.result === 'valid_checked_in') setManualInput('');
    } catch {
      const failure: ScanResult = { result: 'error' };
      setManualResult(failure);
      handleScanResult(failure);
    } finally {
      setManualLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-9 h-9 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" role="status" aria-label="Loading check-in assignment" />
      </div>
    );
  }

  const percentage = stats.totalIssued > 0
    ? Math.round((stats.totalCheckedIn / stats.totalIssued) * 100)
    : 0;

  return (
    <div className="min-h-screen page-offset bg-[var(--bg-secondary)] pb-10">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="section-label">Live entry control</p>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-[var(--text)]">
              Ticket Scanner
            </h1>
            <div className="flex items-center gap-2 mt-1 text-xs">
              {isOnline ? (
                <>
                  <Wifi size={13} className="text-emerald-500" aria-hidden />
                  <span className="text-emerald-600 dark:text-emerald-300">Online and server-verified</span>
                </>
              ) : (
                <>
                  <WifiOff size={13} className="text-red-500" aria-hidden />
                  <span className="font-bold text-red-500">Offline — admissions disabled</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="btn btn-sm btn-outline px-3"
            aria-label="Sign out of scanner"
          >
            <LogOut size={16} aria-hidden />
          </button>
        </header>

        {setupError && (
          <div className="card rounded-2xl p-4 border-red-500/30" role="alert">
            <div className="flex gap-3">
              <AlertCircle size={19} className="text-red-500 shrink-0" aria-hidden />
              <p className="text-sm text-red-600 dark:text-red-300">{setupError}</p>
            </div>
          </div>
        )}

        {assignedEvent ? (
          <section className="card rounded-3xl p-5" aria-labelledby="assigned-event-heading">
            {assignedEvents.length > 1 && (
              <label className="block mb-4 text-sm font-semibold text-[var(--text)]">
                Scan for event
                <select
                  value={assignedEvent.id}
                  onChange={(changeEvent) => {
                    const nextEvent = assignedEvents.find(
                      event => event.id === changeEvent.target.value,
                    );
                    if (!nextEvent) return;
                    setAssignedEvent(nextEvent);
                    setGate(nextEvent.gate);
                    setManualResult(null);
                    setScanLogs([]);
                  }}
                  className="input w-full mt-2"
                >
                  {assignedEvents.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.title}{event.gate ? ` — ${event.gate}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Assigned event</p>
                <h2 id="assigned-event-heading" className="font-bold text-[var(--text)] mt-1">
                  {assignedEvent.title}
                </h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  {assignedEvent.venue || 'Venue to be announced'}
                  {gate ? ` · ${gate}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void fetchStats(assignedEvent.id)}
                className="w-11 h-11 rounded-full border border-[var(--border)] flex items-center justify-center"
                aria-label="Refresh check-in counts"
              >
                <RefreshCw size={16} aria-hidden />
              </button>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-[var(--text-muted)]">Checked in</span>
                <span className="font-bold text-[var(--text)]">
                  {stats.totalCheckedIn} / {stats.totalIssued} ({percentage}%)
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${Math.min(percentage, 100)}%`, background: 'var(--grad-emerald)' }}
                />
              </div>
            </div>
          </section>
        ) : (
          <div className="card rounded-3xl p-5 border-amber-500/30" role="alert">
            <div className="flex gap-3">
              <AlertCircle size={19} className="text-amber-500 shrink-0" aria-hidden />
              <div>
                <p className="font-bold text-[var(--text)]">No active event assignment</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Ask an administrator to assign your account to the event and gate.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Scanner input mode">
          <button
            type="button"
            onClick={() => setMode('camera')}
            className={`btn btn-md ${mode === 'camera' ? 'btn-primary' : 'btn-outline'}`}
            aria-pressed={mode === 'camera'}
          >
            <QrCode size={16} aria-hidden />
            Camera
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`btn btn-md ${mode === 'manual' ? 'btn-primary' : 'btn-outline'}`}
            aria-pressed={mode === 'manual'}
          >
            <Keyboard size={16} aria-hidden />
            Handheld input
          </button>
        </div>

        {mode === 'camera' && assignedEvent && (
          <section className="card rounded-3xl p-4 sm:p-5" aria-label="Camera ticket scanner">
            <CameraScanner
              eventId={assignedEvent.id}
              gate={gate ?? undefined}
              onScanComplete={handleScanResult}
            />
          </section>
        )}

        {mode === 'manual' && (
          <section className="card rounded-3xl p-5 space-y-4" aria-labelledby="manual-scan-heading">
            <div>
              <h2 id="manual-scan-heading" className="font-bold text-[var(--text)]">
                Handheld scanner input
              </h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Use a USB/Bluetooth QR scanner that types the encoded token. Ticket numbers are not QR credentials.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={manualInput}
                onChange={event => setManualInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') void handleManualScan();
                }}
                placeholder="Scan QR token"
                autoComplete="off"
                className="input flex-1 min-w-0 font-mono"
                aria-label="Raw QR scanner token"
              />
              <button
                type="button"
                onClick={() => void handleManualScan()}
                disabled={!manualInput.trim() || manualLoading || !assignedEvent || !isOnline}
                className="btn btn-md btn-primary px-4"
                aria-label="Verify scanned token"
              >
                {manualLoading
                  ? <RefreshCw size={16} className="animate-spin" aria-hidden />
                  : <Search size={16} aria-hidden />}
              </button>
            </div>

            {manualResult && (
              <div
                className={`rounded-2xl border p-4 ${
                  manualResult.result === 'valid_checked_in'
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : manualResult.result === 'already_checked_in'
                      ? 'border-amber-500/30 bg-amber-500/10'
                      : 'border-red-500/30 bg-red-500/10'
                }`}
                role="status"
                aria-live="assertive"
              >
                <p className="font-bold text-[var(--text)]">{scanResultLabel(manualResult.result)}</p>
                {manualResult.attendeeName && (
                  <p className="text-sm text-[var(--text)] mt-1">{manualResult.attendeeName}</p>
                )}
                {manualResult.ticketNumber && (
                  <p className="font-mono text-xs text-[var(--text-muted)] mt-1">
                    {manualResult.ticketNumber}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        <section className="card rounded-3xl p-0 overflow-hidden" aria-labelledby="recent-scans-heading">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 id="recent-scans-heading" className="font-bold text-[var(--text)]">
              <Clock size={15} className="inline mr-2" aria-hidden />
              Recent scans
            </h2>
            <span className="text-xs text-[var(--text-muted)]">{scanLogs.length} this session</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {scanLogs.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
                No tickets scanned in this session.
              </p>
            ) : scanLogs.map(log => (
              <div key={log.id} className="px-5 py-3.5 flex items-center gap-3">
                {log.result === 'valid_checked_in'
                  ? <CheckCircle2 size={17} className="text-emerald-500 shrink-0" aria-hidden />
                  : log.result === 'already_checked_in'
                    ? <AlertCircle size={17} className="text-amber-500 shrink-0" aria-hidden />
                    : <XCircle size={17} className="text-red-500 shrink-0" aria-hidden />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text)] truncate">
                    {log.attendeeName ?? scanResultLabel(log.result)}
                  </p>
                  {log.ticketNumber && (
                    <p className="font-mono text-xs text-[var(--text-muted)]">{log.ticketNumber}</p>
                  )}
                </div>
                <time className="text-xs text-[var(--text-muted)] tabular-nums">
                  {log.time.toLocaleTimeString('en-ZW', { hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center text-xs text-[var(--text-muted)] space-y-1">
          <p className="inline-flex items-center gap-1.5">
            <User size={11} aria-hidden />
            {profile?.display_name || user?.email}
          </p>
          <p className="inline-flex items-center gap-1.5">
            <ShieldCheck size={11} aria-hidden />
            Every admission is confirmed online and recorded once.
          </p>
        </footer>
      </div>
    </div>
  );
}
