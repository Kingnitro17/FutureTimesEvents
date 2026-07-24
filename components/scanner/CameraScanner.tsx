'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Wifi,
  WifiOff,
  XCircle,
  Zap,
} from 'lucide-react';

export type ScanResultCode =
  | 'valid_checked_in'
  | 'already_checked_in'
  | 'not_found'
  | 'wrong_event'
  | 'cancelled'
  | 'revoked'
  | 'event_not_open'
  | 'invalid_token'
  | 'invalid_status'
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

const RESULT_CONFIG: Record<
  ScanResultCode,
  {
    label: string;
    sublabel: string;
    background: string;
    Icon: React.ComponentType<{
      size?: number;
      color?: string;
      className?: string;
      'aria-hidden'?: boolean;
    }>;
  }
> = {
  valid_checked_in: {
    label: 'ADMITTED',
    sublabel: 'Ticket accepted — welcome in.',
    background: 'linear-gradient(135deg,#059669,#10b981)',
    Icon: CheckCircle2,
  },
  already_checked_in: {
    label: 'ALREADY SCANNED',
    sublabel: 'This ticket was already used.',
    background: 'linear-gradient(135deg,#d97706,#f59e0b)',
    Icon: AlertCircle,
  },
  not_found: {
    label: 'INVALID',
    sublabel: 'Ticket not found in the system.',
    background: 'linear-gradient(135deg,#dc2626,#ef4444)',
    Icon: XCircle,
  },
  wrong_event: {
    label: 'WRONG EVENT',
    sublabel: 'This ticket belongs to a different event.',
    background: 'linear-gradient(135deg,#dc2626,#ef4444)',
    Icon: XCircle,
  },
  cancelled: {
    label: 'CANCELLED',
    sublabel: 'This ticket has been cancelled.',
    background: 'linear-gradient(135deg,#dc2626,#ef4444)',
    Icon: XCircle,
  },
  revoked: {
    label: 'REVOKED',
    sublabel: 'This ticket has been revoked.',
    background: 'linear-gradient(135deg,#dc2626,#ef4444)',
    Icon: XCircle,
  },
  event_not_open: {
    label: 'NOT OPEN',
    sublabel: 'Check-in is not active for this event.',
    background: 'linear-gradient(135deg,#dc2626,#ef4444)',
    Icon: XCircle,
  },
  invalid_token: {
    label: 'INVALID QR',
    sublabel: 'The QR code cannot be verified.',
    background: 'linear-gradient(135deg,#dc2626,#ef4444)',
    Icon: XCircle,
  },
  invalid_status: {
    label: 'NOT VALID',
    sublabel: 'This ticket is not in an admissible state.',
    background: 'linear-gradient(135deg,#dc2626,#ef4444)',
    Icon: XCircle,
  },
  error: {
    label: 'SYSTEM ERROR',
    sublabel: 'Please try again.',
    background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
    Icon: AlertCircle,
  },
};

export default function CameraScanner({ eventId, gate, onScanComplete }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastTokenRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);

  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

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

  const submitScan = useCallback(async (token: string) => {
    if (!isOnline) {
      setError('No network connection. Check-in always requires live server verification.');
      return;
    }
    if (submittingRef.current) return;

    submittingRef.current = true;
    setIsLoading(true);
    setError(null);
    setScanResult(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken: token, eventId, gate }),
      });
      const result = await response.json() as ScanResult & { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? 'The check-in server rejected this request.');
      }

      setScanResult(result);
      onScanComplete?.(result);

      if (navigator.vibrate) {
        navigator.vibrate(
          result.result === 'valid_checked_in'
            ? [100, 50, 100]
            : result.result === 'already_checked_in'
              ? [200, 100, 200]
              : 500,
        );
      }

      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      resultTimerRef.current = setTimeout(() => {
        setScanResult(null);
        lastTokenRef.current = null;
      }, 4000);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Network error. Please try again.');
    } finally {
      submittingRef.current = false;
      setIsLoading(false);
    }
  }, [eventId, gate, isOnline, onScanComplete]);

  const stopScanning = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current = null;

    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    submittingRef.current = false;
    lastTokenRef.current = null;
    setIsScanning(false);
    setIsLoading(false);
    setScanResult(null);
    setTorchOn(false);
  }, []);

  const startScanning = useCallback(async (
    requestedFacingMode: 'environment' | 'user' = facingMode,
  ) => {
    if (!isOnline) {
      setError('Reconnect to the internet before starting the scanner.');
      return;
    }
    if (!videoRef.current || controlsRef.current) return;

    setError(null);
    setScanResult(null);

    try {
      const reader = new BrowserMultiFormatReader(undefined, {
        delayBetweenScanAttempts: 120,
        delayBetweenScanSuccess: 500,
      });
      readerRef.current = reader;

      const controls = await reader.decodeFromConstraints(
        {
          video: {
            facingMode: requestedFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        (result, decodeError) => {
          if (result) {
            const token = result.getText();
            if (token && token !== lastTokenRef.current && !submittingRef.current) {
              lastTokenRef.current = token;
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
              debounceTimerRef.current = setTimeout(() => {
                lastTokenRef.current = null;
              }, 5000);
              void submitScan(token);
            }
            return;
          }

          if (decodeError && !(decodeError instanceof NotFoundException)) {
            // Partial/moving QR codes commonly cause transient decode errors.
            // Continuous decoding remains active until a clean frame appears.
          }
        },
      );

      controlsRef.current = controls;
      setIsScanning(true);
    } catch (cameraError) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      readerRef.current = null;
      setIsScanning(false);

      const message = cameraError instanceof Error ? cameraError.message : String(cameraError);
      if (/permission|notallowed/i.test(message)) {
        setError('Camera permission was denied. Allow camera access and try again.');
      } else if (/notfound|devices/i.test(message)) {
        setError('No camera was found on this device.');
      } else {
        setError(`Camera error: ${message}`);
      }
    }
  }, [facingMode, isOnline, submitScan]);

  const switchCamera = useCallback(() => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    stopScanning();
    setFacingMode(nextMode);
    void startScanning(nextMode);
  }, [facingMode, startScanning, stopScanning]);

  const toggleTorch = useCallback(async () => {
    const controls = controlsRef.current;
    if (!controls?.switchTorch) {
      setError('Torch control is not supported by this browser or camera.');
      return;
    }

    try {
      await controls.switchTorch(!torchOn);
      setTorchOn(current => !current);
    } catch {
      setError('Torch control is not available on this camera.');
    }
  }, [torchOn]);

  useEffect(() => stopScanning, [stopScanning]);

  const activeResult = scanResult ? RESULT_CONFIG[scanResult.result] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-medium" role="status">
        {isOnline ? (
          <>
            <Wifi size={13} className="text-emerald-500" aria-hidden />
            <span className="text-emerald-600 dark:text-emerald-300">
              Online — every scan is verified by the server
            </span>
          </>
        ) : (
          <>
            <WifiOff size={13} className="text-red-500" aria-hidden />
            <span className="font-bold text-red-500">
              Offline — scanning is disabled
            </span>
          </>
        )}
      </div>

      <div className="relative aspect-square max-w-xs mx-auto rounded-3xl overflow-hidden bg-black shadow-2xl">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
          aria-label="Camera feed for ticket QR scanning"
        />

        {isScanning && !activeResult && (
          <>
            {[
              'top-4 left-4 border-t-4 border-l-4',
              'top-4 right-4 border-t-4 border-r-4',
              'bottom-4 left-4 border-b-4 border-l-4',
              'bottom-4 right-4 border-b-4 border-r-4',
            ].map((className, index) => (
              <div
                key={index}
                className={`absolute w-10 h-10 ${className} rounded-sm border-white`}
                aria-hidden
              />
            ))}
            <div
              className="absolute left-4 right-4 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse"
              aria-hidden
            />
          </>
        )}

        {!isScanning && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 p-6 text-center">
            <Camera size={48} className="text-white/55 mb-3" aria-hidden />
            <p className="text-sm text-white/75">
              Start the scanner, then hold one ticket QR steady inside the frame.
            </p>
          </div>
        )}

        {isLoading && !activeResult && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 size={42} className="text-white animate-spin" aria-label="Verifying ticket" />
          </div>
        )}

        {activeResult && scanResult && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center p-5 text-white"
            style={{ background: activeResult.background }}
            role="status"
            aria-live="assertive"
          >
            <activeResult.Icon size={58} color="white" aria-hidden />
            <p className="text-2xl font-black mt-3">{activeResult.label}</p>
            {scanResult.attendeeName && (
              <p className="text-lg font-bold mt-1">{scanResult.attendeeName}</p>
            )}
            {scanResult.ticketNumber && (
              <p className="font-mono text-sm mt-1 text-white/85">{scanResult.ticketNumber}</p>
            )}
            <p className="text-sm mt-2 text-white/80">{activeResult.sublabel}</p>
            {scanResult.result === 'already_checked_in' && scanResult.checkedInAt && (
              <p className="text-xs mt-2 text-white/70">
                First used {new Date(scanResult.checkedInAt).toLocaleTimeString('en-ZW')}
                {scanResult.gate ? ` at ${scanResult.gate}` : ''}
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4" role="alert">
          <p className="text-sm font-medium text-red-600 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        {!isScanning ? (
          <button
            type="button"
            onClick={() => void startScanning()}
            disabled={!isOnline}
            className="btn btn-lg btn-primary flex-1 disabled:opacity-50"
          >
            <Camera size={18} aria-hidden />
            Start scanner
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={stopScanning}
              className="btn btn-lg btn-outline flex-1"
            >
              Stop
            </button>
            <button
              type="button"
              onClick={() => void toggleTorch()}
              className="btn btn-lg btn-outline px-4"
              aria-pressed={torchOn}
              aria-label={torchOn ? 'Turn torch off' : 'Turn torch on'}
            >
              <Zap size={18} className={torchOn ? 'fill-current' : ''} aria-hidden />
            </button>
            <button
              type="button"
              onClick={switchCamera}
              className="btn btn-lg btn-outline px-4"
              aria-label="Switch camera"
            >
              <RotateCcw size={18} aria-hidden />
            </button>
          </>
        )}
      </div>

      {isScanning && !isLoading && !scanResult && (
        <p className="text-center text-sm text-[var(--text-muted)]">
          Scanning continuously — no button press is needed.
        </p>
      )}
    </div>
  );
}
