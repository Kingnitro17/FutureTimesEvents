'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRDisplayProps {
  /** The raw QR token (only shown once on ticket claim) */
  token: string;
  /** Size in pixels */
  size?: number;
  /** Alt text for screen readers */
  label?: string;
}

/**
 * Renders a real QR code from the raw token using the `qrcode` library.
 *
 * Security notes:
 * - The token is rendered ONLY as a QR image — never as plain text
 * - The QR URL (if token is a URL token) is never displayed as a link
 * - alt text uses the label, not the token
 * - The canvas is drawn once; the token is not stored in component state beyond initial render
 */
export default function QRDisplay({ token, size = 220, label = 'Your ticket QR code' }: QRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !token) return;

    QRCode.toCanvas(canvasRef.current, token, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'H',  // High error correction for reliability
      color: {
        dark:  '#000000',
        light: '#ffffff',
      },
    }).catch(err => {
      console.error('[QRDisplay] Failed to generate QR:', err);
    });
  }, [token, size]);

  return (
    <div
      className="inline-flex w-full flex-col items-center rounded-2xl bg-white p-4 shadow-md box-border"
      style={{ maxWidth: size + 32, padding: 'var(--sp-3)' }}
      role="img"
      aria-label={label}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="h-auto w-full rounded-lg"
        style={{ display: 'block' }}
      />
    </div>
  );
}
