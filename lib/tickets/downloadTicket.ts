'use client';

import QRCode from 'qrcode';
import type { WalletTicket } from '@/types';

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not render the ticket QR image.'));
    image.src = source;
  });
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines - 1) break;
  }
  if (line && lines.length < maxLines) lines.push(line);

  lines.forEach((value, index) => {
    const isLastTruncatedLine = index === maxLines - 1
      && words.join(' ').length > lines.join(' ').length;
    context.fillText(isLastTruncatedLine ? `${value.replace(/[.,;:]?$/, '')}…` : value, x, y + index * lineHeight);
  });
}

/**
 * Creates a portable PNG containing the real scannable QR image.
 *
 * The raw token is used only to paint the QR. It is never drawn as text,
 * logged, uploaded, or written anywhere other than the caller-managed
 * sessionStorage entry.
 */
export async function downloadTicketPng(ticket: WalletTicket, rawToken: string) {
  if (!rawToken) throw new Error('This ticket QR is not available in the current session.');
  if (ticket.status !== 'issued') throw new Error('Only active tickets can be downloaded.');

  const width = 1080;
  const height = 1600;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser cannot create a downloadable ticket.');

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#FF55C2');
  background.addColorStop(0.52, '#7222E3');
  background.addColorStop(1, '#2CC4EA');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.beginPath();
  context.arc(900, 120, 340, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(80, 1480, 420, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#FFFFFF';
  context.font = '700 34px Arial, sans-serif';
  context.letterSpacing = '5px';
  context.fillText('FUTURE TIMES EVENTS', 90, 105);

  context.font = '700 72px Arial, sans-serif';
  context.letterSpacing = '0px';
  drawWrappedText(context, ticket.event.title, 90, 240, 900, 82, 3);

  context.fillStyle = 'rgba(255,255,255,0.88)';
  context.font = '600 34px Arial, sans-serif';
  context.fillText(ticket.ticketType.name, 90, 500);

  const cardX = 90;
  const cardY = 570;
  const cardWidth = 900;
  const cardHeight = 900;
  context.fillStyle = '#FFFFFF';
  context.beginPath();
  context.roundRect(cardX, cardY, cardWidth, cardHeight, 48);
  context.fill();

  const qrDataUrl = await QRCode.toDataURL(rawToken, {
    width: 520,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#11111A', light: '#FFFFFF' },
  });
  const qrImage = await loadImage(qrDataUrl);
  context.drawImage(qrImage, 280, 620, 520, 520);

  context.fillStyle = '#11111A';
  context.textAlign = 'center';
  context.font = '700 34px monospace';
  context.fillText(ticket.ticketNumber, width / 2, 1205);

  const startsAt = ticket.event.startsAt ? new Date(ticket.event.startsAt) : null;
  const validDate = startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt : null;
  const dateLabel = validDate
    ? validDate.toLocaleString('en-ZW', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Harare',
      })
    : 'Event date to be announced';

  context.fillStyle = '#5D5D70';
  context.font = '500 29px Arial, sans-serif';
  context.fillText(dateLabel, width / 2, 1270);
  context.fillText(ticket.event.venue || 'Venue to be announced', width / 2, 1320);

  context.font = '500 23px Arial, sans-serif';
  context.fillStyle = '#85859A';
  context.fillText('Show this QR at the entrance. Do not share it.', width / 2, 1400);

  context.textAlign = 'start';
  const fileSlug = `${ticket.event.slug}-${ticket.ticketNumber}`
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const link = document.createElement('a');
  link.download = `${fileSlug || 'future-times-ticket'}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
