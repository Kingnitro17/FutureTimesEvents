'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { LogOut, RefreshCw, Search, Clock, CheckCircle2, XCircle, AlertCircle, User } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
import type { ScanResult } from '@/components/scanner/CameraScanner';

// Dynamic import prevents SSR for the camera component
const CameraScanner = dynamic(() => import('@/components/scanner/CameraScanner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
    </div>
  ),
});

interface ScanLog {
  id: string;
  result: ScanResult['result'];
  attendeeName?: string;
  ticketNumber?: string;
  time: Date;
}

interface EventInfo {
  id: string;
  title: string;
  starts_at: string;
  venue_name: string;
  status: string;
}

interface CheckedInStats {
  total_issued: number;
  total_checked_in: number;
}

export default function CheckInPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [user,         setUser]         = useState<{ id: string; email: string } | null>(null);
  const [profile,      setProfile]      = useState<{ display_name: string; role: string } | null>(null);
  const [assignedEvent,setAssignedEvent] = useState<EventInfo | null>(null);
  const [gate,         setGate]         = useState<string | null>(null);
  const [scanLogs,     setScanLogs]     = useState<ScanLog[]>([]);
  const [stats,        setStats]        = useState<CheckedInStats>({ total_issued: 0, total_checked_in: 0 });
  const [mode,         setMode]         = useState<'camera' | 'manual'>('camera');
  const [manualInput,  setManualInput]  = useState('');
  const [manualLoading,setManualLoading]= useState(false);
  const [manualResult, setManualResult] = useState<ScanResult | null>(null);
  const [isOnline,     setIsOnline]     = useState(true);
  const [loadingData,  setLoadingData]  = useState(true);

  // ── Auth and event assignment ─────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push('/auth/login?next=/checkin'); return; }

      setUser({ id: u.id, email: u.email ?? '' });

      // Fetch profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('display_name, role')
        .eq('id', u.id)
        .single();
      setProfile(prof);

      // Find event assignment (most recent active assignment)
      const { data: staff } = await supabase
        .from('event_staff')
        .select('gate, events(id, title, starts_at, venue_name, status)')
        .eq('user_id', u.id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single();

      if (staff?.events) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAssignedEvent(staff.events as unknown as EventInfo);
        setGate(staff.gate);
      } else if (['admin', 'super_admin'].includes(prof?.role ?? '')) {
        // Admins: show most recent active event
        const { data: ev } = await supabase
          .from('events')
          .select('id, title, starts_at, venue_name, status')
          .in('status', ['published', 'sold_out'])
          .order('starts_at', { ascending: false })
          .limit(1)
          .single();
        setAssignedEvent(ev);
      }

      setLoadingData(false);
    };
    init();
  }, []);

  // ── Fetch stats ───────────────────────────────────────────
  const fetchStats = async (eventId: string) => {
    const { data } = await supabase
      .from('tickets')
      .select('status')
      .eq('event_id', eventId)
      .neq('status', 'cancelled')
      .neq('status', 'revoked');

    if (data) {
      setStats({
        total_issued:     data.length,
        total_checked_in: data.filter((t: { status: string }) => t.status === 'checked_in').length,
      });
    }
  };

  useEffect(() => {
    if (assignedEvent?.id) fetchStats(assignedEvent.id);
  }, [assignedEvent]);

  // ── Realtime stats updates ────────────────────────────────
  useEffect(() => {
    if (!assignedEvent?.id) return;
    const channel = supabase
      .channel(`checkin-stats-${assignedEvent.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'tickets',
        filter: `event_id=eq.${assignedEvent.id}`,
      }, () => fetchStats(assignedEvent.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [assignedEvent?.id]);

  // ── Online detection ──────────────────────────────────────
  useEffect(() => {
    const fn = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', fn);
    window.addEventListener('offline', fn);
    return () => { window.removeEventListener('online', fn); window.removeEventListener('offline', fn); };
  }, []);

  // ── Handle scan result ────────────────────────────────────
  const handleScanResult = (result: ScanResult) => {
    const log: ScanLog = {
      id: crypto.randomUUID(),
      result: result.result,
      attendeeName: result.attendeeName,
      ticketNumber: result.ticketNumber,
      time: new Date(),
    };
    setScanLogs(prev => [log, ...prev].slice(0, 20)); // keep last 20
    if (result.result === 'valid_checked_in') fetchStats(assignedEvent?.id ?? '');
  };

  // ── Manual lookup ─────────────────────────────────────────
  const handleManualScan = async () => {
    if (!manualInput.trim() || !assignedEvent?.id) return;
    setManualLoading(true);
    setManualResult(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken: manualInput.trim(),
          eventId: assignedEvent.id,
          gate,
        }),
      });
      const data = await res.json() as ScanResult;
      setManualResult(data);
      handleScanResult(data);
      if (data.result === 'valid_checked_in') setManualInput('');
    } catch {
      setManualResult({ result: 'error' });
    } finally {
      setManualLoading(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  // ── Result icon ───────────────────────────────────────────
  const ResultIcon = ({ result }: { result: ScanResult['result'] }) => {
    if (result === 'valid_checked_in')   return <CheckCircle2 size={14} className="text-green-500" />;
    if (result === 'already_checked_in') return <AlertCircle size={14} className="text-amber-500" />;
    return <XCircle size={14} className="text-red-500" />;
  };

  const pct = stats.total_issued > 0
    ? Math.round((stats.total_checked_in / stats.total_issued) * 100)
    : 0;

  if (loadingData) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] pt-[var(--nav-h)] pb-8">
      <div className="max-w-md mx-auto px-4 pt-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-black text-[var(--text)]">
              Scanner
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
              <span className="text-xs text-[var(--text-muted)]">
                {isOnline ? 'Online' : '⚠ OFFLINE — scanning disabled'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">{profile?.display_name}</span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-card)] transition-colors"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Event info */}
        {assignedEvent ? (
          <div className="glass rounded-2xl p-4 border border-[var(--border)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">Event</p>
                <p className="font-bold text-[var(--text)] text-sm mt-0.5">{assignedEvent.title}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {assignedEvent.venue_name}
                  {gate && <> · Gate: <span className="font-bold text-purple-500">{gate}</span></>}
                </p>
              </div>
              <button
                onClick={() => fetchStats(assignedEvent.id)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                aria-label="Refresh stats"
              >
                <RefreshCw size={14} className="text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--text-muted)]">Check-ins</span>
                <span className="font-bold text-[var(--text)]">
                  {stats.total_checked_in} / {stats.total_issued} ({pct}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#46FFAB,#7222E3)' }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-4 border border-amber-200 dark:border-amber-700/50 bg-amber-50/50 dark:bg-amber-900/10">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">No event assigned</p>
                <p className="text-xs text-amber-600 dark:text-amber-500">Ask your admin to assign you to an event and gate.</p>
              </div>
            </div>
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex gap-2">
          {(['camera', 'manual'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                mode === m
                  ? 'text-white border-transparent'
                  : 'border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-card)]'
              }`}
              style={mode === m ? { background: 'linear-gradient(135deg,#FF55C2,#7222E3)' } : {}}
            >
              {m === 'camera' ? '📷 Camera' : '⌨️ Manual'}
            </button>
          ))}
        </div>

        {/* Camera scanner */}
        {mode === 'camera' && assignedEvent && (
          <div className="glass rounded-2xl p-4 border border-[var(--border)]">
            <CameraScanner
              eventId={assignedEvent.id}
              gate={gate ?? undefined}
              onScanComplete={handleScanResult}
            />
          </div>
        )}

        {/* Manual entry */}
        {mode === 'manual' && (
          <div className="glass rounded-2xl p-4 border border-[var(--border)] space-y-3">
            <h2 className="font-semibold text-sm text-[var(--text)]">
              Enter ticket number or QR token
            </h2>
            <div className="flex gap-2">
              <input
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualScan()}
                placeholder="e.g. FTE-1A2B3C4D"
                className="flex-1 px-3 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm font-mono outline-none focus:border-purple-400 transition-colors"
                aria-label="Ticket number or QR token"
              />
              <button
                onClick={handleManualScan}
                disabled={!manualInput.trim() || manualLoading || !assignedEvent}
                className="px-4 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-40 transition-colors"
                style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }}
                aria-label="Validate ticket"
              >
                {manualLoading ? '...' : <Search size={16} />}
              </button>
            </div>

            {manualResult && (
              <div
                className="p-3 rounded-xl text-sm font-medium"
                style={{
                  background: manualResult.result === 'valid_checked_in'
                    ? 'rgba(5,150,105,0.1)'
                    : manualResult.result === 'already_checked_in'
                    ? 'rgba(217,119,6,0.1)'
                    : 'rgba(220,38,38,0.1)',
                  border: `1px solid ${
                    manualResult.result === 'valid_checked_in' ? 'rgba(5,150,105,0.3)'
                    : manualResult.result === 'already_checked_in' ? 'rgba(217,119,6,0.3)'
                    : 'rgba(220,38,38,0.3)'
                  }`,
                }}
                role="status"
              >
                <p className={
                  manualResult.result === 'valid_checked_in' ? 'text-green-700 dark:text-green-400 font-bold'
                  : manualResult.result === 'already_checked_in' ? 'text-amber-700 dark:text-amber-400 font-bold'
                  : 'text-red-700 dark:text-red-400 font-bold'
                }>
                  {manualResult.result === 'valid_checked_in'   && '✓ Admitted'}
                  {manualResult.result === 'already_checked_in' && '⚠ Already scanned'}
                  {manualResult.result === 'not_found'          && '✗ Ticket not found'}
                  {manualResult.result === 'wrong_event'        && '✗ Wrong event'}
                  {manualResult.result === 'cancelled'          && '✗ Ticket cancelled'}
                  {manualResult.result === 'revoked'            && '✗ Ticket revoked'}
                  {manualResult.result === 'error'              && '! System error — try again'}
                </p>
                {manualResult.attendeeName && (
                  <p className="text-[var(--text)] mt-1">{manualResult.attendeeName}</p>
                )}
                {manualResult.ticketNumber && (
                  <p className="text-[var(--text-muted)] font-mono text-xs mt-0.5">{manualResult.ticketNumber}</p>
                )}
                {manualResult.result === 'already_checked_in' && manualResult.checkedInAt && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    First checked in at {new Date(manualResult.checkedInAt).toLocaleTimeString()}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recent scans */}
        <div className="glass rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="font-semibold text-sm text-[var(--text)]">
              <Clock size={14} className="inline mr-1.5 text-[var(--text-muted)]" />
              Recent Scans
            </h3>
            {scanLogs.length > 0 && (
              <span className="text-xs text-[var(--text-muted)]">{scanLogs.length} scans this session</span>
            )}
          </div>
          <div className="divide-y divide-[var(--border)]">
            {scanLogs.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                No scans yet this session
              </div>
            ) : (
              scanLogs.map(log => (
                <div key={log.id} className="px-4 py-3 flex items-center gap-3">
                  <ResultIcon result={log.result} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate">
                      {log.attendeeName ?? (log.result === 'not_found' ? 'Unknown ticket' : log.result)}
                    </p>
                    {log.ticketNumber && (
                      <p className="text-xs text-[var(--text-muted)] font-mono">{log.ticketNumber}</p>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)] shrink-0 tabular-nums">
                    {log.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Scanner identity */}
        <div className="text-center text-xs text-[var(--text-muted)] space-y-0.5">
          <div className="flex items-center justify-center gap-1">
            <User size={10} />
            <span>Signed in as {user?.email}</span>
          </div>
          <p>Future Times Events · All scans are server-verified</p>
        </div>
      </div>
    </div>
  );
}
