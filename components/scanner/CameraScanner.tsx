'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import { CheckCircle2, XCircle, AlertCircle, Camera, RotateCcw, Loader2, WifiOff, Wifi } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────
export type ScanResultCode =
  | 'valid_checked_in'
  | 'already_checked_in'
  | 'not_found'
  | 'wrong_event'
  | 'cancelled'
  | 'revoked'
  | 'event_not_open'
  | 'invalid_token'
  | 'error';

export interface ScanResult {
  result: ScanResultCode;
  ticketNumber?: string;
  attendeeName?: string;
  checkedInAt?: string;
  gate?: string;
  scanId?: string;
}

interface CameraScannerProps {
  eventId: string;
  gate?: string;
  onScanComplete?: (result: ScanResult) => void;
}

// ── Result display config ─────────────────────────────────────
const RESULT_CONFIG: Record<
  ScanResultCode,
  { label: string; sublabel: string; color: string; bg: string; border: string; icon: React.ComponentType<{ size?: number; color?: string }> }
> = {
  valid_checked_in:   { label: '✓ ADMITTED',        sublabel: 'Ticket accepted — welcome in!',      color: '#fff',    bg: 'linear-gradient(135deg,#059669,#10b981)', border: '#059669', icon: CheckCircle2 },
  already_checked_in: { label: '⚠ ALREADY SCANNED', sublabel: 'This ticket was already used.',      color: '#fff',    bg: 'linear-gradient(135deg,#d97706,#f59e0b)', border: '#d97706', icon: AlertCircle  },
  not_found:          { label: '✗ INVALID',          sublabel: 'Ticket not found in system.',        color: '#fff',    bg: 'linear-gradient(135deg,#dc2626,#ef4444)', border: '#dc2626', icon: XCircle      },
  wrong_event:        { label: '✗ WRONG EVENT',      sublabel: 'Ticket is for a different event.',   color: '#fff',    bg: 'linear-gradient(135deg,#dc2626,#ef4444)', border: '#dc2626', icon: XCircle      },
  cancelled:          { label: '✗ CANCELLED',        sublabel: 'This ticket has been cancelled.',    color: '#fff',    bg: 'linear-gradient(135deg,#dc2626,#ef4444)', border: '#dc2626', icon: XCircle      },
  revoked:            { label: '✗ REVOKED',          sublabel: 'This ticket has been revoked.',      color: '#fff',    bg: 'linear-gradient(135deg,#dc2626,#ef4444)', border: '#dc2626', icon: XCircle      },
  event_not_open:     { label: '✗ NOT OPEN',         sublabel: 'Check-in is not active for this event.', color: '#fff', bg: 'linear-gradient(135deg,#dc2626,#ef4444)', border: '#dc2626', icon: XCircle },
  invalid_token:      { label: '✗ INVALID QR',       sublabel: 'QR code cannot be read.',            color: '#fff',    bg: 'linear-gradient(135deg,#dc2626,#ef4444)', border: '#dc2626', icon: XCircle      },
  error:              { label: '! SYSTEM ERROR',     sublabel: 'Please try again.',                  color: '#fff',    bg: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: '#7c3aed', icon: AlertCircle  },
};

// ── Main component ────────────────────────────────────────────
export default function CameraScanner({ eventId, gate, onScanComplete }: CameraScannerProps) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const readerRef     = useRef<BrowserMultiFormatReader | null>(null);
  const debounceRef   = useRef<NodeJS.Timeout | null>(null);
  const lastTokenRef  = useRef<string | null>(null);

  const [isScanning,   setIsScanning]   = useState(false);
  const [scanResult,   setScanResult]   = useState<ScanResult | null>(null);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [torchOn,      setTorchOn]      = useState(false);
  const [facingMode,   setFacingMode]   = useState<'environment' | 'user'>('environment');
  const [isOnline,     setIsOnline]     = useState(true);
  const [streamRef,    setStreamRef]    = useState<MediaStream | null>(null);

  // ── Online/offline detection ──────────────────────────────
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  // ── Submit scan to server ─────────────────────────────────
  const submitScan = useCallback(async (token: string) => {
    if (!isOnline) {
      setError('No network connection. Check-in requires an internet connection.');
      return;
    }
    if (isLoading) return;
    setIsLoading(true);
    setScanResult(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken: token, eventId, gate }),
      });

      const data = await res.json() as ScanResult & { error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Server error. Please try again.');
        setIsLoading(false);
        return;
      }

      setScanResult(data);
      onScanComplete?.(data);

      // Haptic feedback
      if (navigator.vibrate) {
        if (data.result === 'valid_checked_in') {
          navigator.vibrate([100, 50, 100]);
        } else if (data.result === 'already_checked_in') {
          navigator.vibrate([200, 100, 200]);
        } else {
          navigator.vibrate(500);
        }
      }

      // Auto-clear result after 4 seconds
      setTimeout(() => {
        setScanResult(null);
        lastTokenRef.current = null;
      }, 4000);

    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, gate, isOnline, isLoading, onScanComplete]);

  // ── Start camera ──────────────────────────────────────────
  const startScanning = useCallback(async () => {
    setError(null);
    setScanResult(null);

    try {
      readerRef.current = new BrowserMultiFormatReader();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setStreamRef(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsScanning(true);

      // Poll video frames for QR codes
      const scanFrame = async () => {
        if (!videoRef.current || !readerRef.current || !isScanning) return;
        try {
          const result = readerRef.current.decode(videoRef.current);
          const token = result ? result.getText() : null;

          // Debounce: don't re-scan the same token within 5 seconds
          if (token && token !== lastTokenRef.current && !isLoading) {
            lastTokenRef.current = token;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => { lastTokenRef.current = null; }, 5000);
            await submitScan(token);
          }
        } catch (e) {
          if (!(e instanceof NotFoundException)) {
            // Real error — not just "no QR in frame"
          }
        }
        requestAnimationFrame(scanFrame);
      };

      requestAnimationFrame(scanFrame);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('Camera permission denied. Please allow camera access in your browser settings and try again.');
      } else if (msg.includes('NotFound') || msg.includes('Devices')) {
        setError('No camera found on this device.');
      } else {
        setError(`Camera error: ${msg}`);
      }
    }
  }, [facingMode, isLoading, submitScan]);

  // ── Stop camera ───────────────────────────────────────────
  const stopScanning = useCallback(() => {
    streamRef?.getTracks().forEach(t => t.stop());
    setStreamRef(null);
    setIsScanning(false);
    setScanResult(null);
    lastTokenRef.current = null;
  }, [streamRef]);

  // ── Toggle torch ──────────────────────────────────────────
  const toggleTorch = useCallback(async () => {
    if (!streamRef) return;
    const track = streamRef.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn(v => !v);
    } catch {
      // Torch not supported on this device
    }
  }, [streamRef, torchOn]);

  // ── Switch camera ─────────────────────────────────────────
  const switchCamera = useCallback(() => {
    stopScanning();
    setFacingMode(m => m === 'environment' ? 'user' : 'environment');
    setTimeout(() => startScanning(), 300);
  }, [stopScanning, startScanning]);

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => { stopScanning(); };
  }, []);

  const activeResult = scanResult ? RESULT_CONFIG[scanResult.result] : null;

  return (
    <div className="space-y-4">
      {/* Online/Offline indicator */}
      <div className="flex items-center gap-2 text-xs font-medium">
        {isOnline
          ? <><Wifi size={12} className="text-green-500" /><span className="text-green-600 dark:text-green-400">Online — scans are verified in real-time</span></>
          : <><WifiOff size={12} className="text-red-500" /><span className="text-red-500 font-bold">OFFLINE — scanning disabled. Reconnect to continue.</span></>
        }
      </div>

      {/* Camera viewport */}
      <div className="relative aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden bg-black shadow-2xl">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
          aria-label="Camera feed for QR scanning"
        />

        {/* Corner frame markers */}
        {isScanning && (
          <>
            {['top-3 left-3 border-t-4 border-l-4', 'top-3 right-3 border-t-4 border-r-4',
              'bottom-3 left-3 border-b-4 border-l-4', 'bottom-3 right-3 border-b-4 border-r-4'
            ].map((cls, i) => (
              <div key={i} className={`absolute w-8 h-8 ${cls} rounded-sm border-white`} />
            ))}
            {/* Scan line animation */}
            <div
              className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-bounce opacity-80"
              style={{ top: '50%' }}
            />
          </>
        )}

        {/* Idle state */}
        {!isScanning && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
            <Camera size={48} className="text-white/50 mb-3" />
            <p className="text-white/60 text-sm text-center px-4">
              Tap "Start Scanner" to activate camera
            </p>
          </div>
        )}

        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 size={40} className="text-white animate-spin" />
          </div>
        )}

        {/* Result overlay */}
        {activeResult && scanResult && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center p-4"
            style={{ background: activeResult.bg }}
            role="status"
            aria-live="assertive"
          >
            <activeResult.icon size={56} color={activeResult.color} />
            <p className="text-2xl font-black mt-3" style={{ color: activeResult.color }}>
              {activeResult.label}
            </p>
            {scanResult.attendeeName && (
              <p className="text-lg font-bold mt-1" style={{ color: activeResult.color }}>
                {scanResult.attendeeName}
              </p>
            )}
            {scanResult.ticketNumber && (
              <p className="text-sm mt-1 opacity-80 font-mono" style={{ color: activeResult.color }}>
                {scanResult.ticketNumber}
              </p>
            )}
            <p className="text-sm mt-2 opacity-75" style={{ color: activeResult.color }}>
              {activeResult.sublabel}
            </p>
            {scanResult.result === 'already_checked_in' && scanResult.checkedInAt && (
              <p className="text-xs mt-2 opacity-60" style={{ color: activeResult.color }}>
                First scanned: {new Date(scanResult.checkedInAt).toLocaleTimeString()}
                {scanResult.gate ? ` at ${scanResult.gate}` : ''}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {!isScanning ? (
          <button
            onClick={startScanning}
            disabled={!isOnline}
            className="flex-1 py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: isOnline ? 'linear-gradient(135deg,#FF55C2,#7222E3)' : '#888' }}
            aria-label="Start QR scanner"
          >
            <Camera size={18} className="inline mr-2" />
            Start Scanner
          </button>
        ) : (
          <>
            <button
              onClick={stopScanning}
              className="flex-1 py-4 rounded-2xl font-bold text-sm border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-secondary)] transition-colors"
              aria-label="Stop scanner"
            >
              Stop
            </button>
            <button
              onClick={toggleTorch}
              className="p-4 rounded-2xl border border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors"
              aria-label={torchOn ? 'Turn off torch' : 'Turn on torch'}
              title="Torch"
            >
              🔦
            </button>
            <button
              onClick={switchCamera}
              className="p-4 rounded-2xl border border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors"
              aria-label="Switch camera"
              title="Switch camera"
            >
              <RotateCcw size={18} />
            </button>
          </>
        )}
      </div>

      {/* Instructions */}
      {isScanning && !isLoading && !scanResult && (
        <p className="text-center text-sm text-[var(--text-muted)]">
          Hold the QR code steady in frame — it will scan automatically
        </p>
      )}
    </div>
  );
}
