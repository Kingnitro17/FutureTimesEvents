import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import QRCode from 'qrcode';

const logoPath = 'public/assets/logo.png';
const siteUrl = 'https://futuretimesevents.com';

const icon32 = await sharp(logoPath).resize(32, 32).png().toBuffer();
const icoHeader = Buffer.from([0, 0, 1, 0, 1, 0, 32, 32, 0, 0, 1, 0, 32, 0]);
const icoSizeAndOffset = Buffer.alloc(8);
icoSizeAndOffset.writeUInt32LE(icon32.length, 0);
icoSizeAndOffset.writeUInt32LE(22, 4);
await writeFile('app/favicon.ico', Buffer.concat([icoHeader, icoSizeAndOffset, icon32]));

await sharp(logoPath).resize(512, 512).png().toFile('app/icon.png');
await sharp(logoPath).resize(180, 180).png().toFile('app/apple-icon.png');

const logo = await readFile(logoPath);
const socialBackground = Buffer.from(`
  <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FF55C2"/><stop offset="1" stop-color="#7222E3"/></linearGradient></defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    <circle cx="1050" cy="80" r="230" fill="#fff" opacity=".08"/>
    <circle cx="80" cy="590" r="270" fill="#2CC4EA" opacity=".18"/>
    <text x="420" y="285" fill="white" font-family="Arial, sans-serif" font-size="72" font-weight="800">Future Times Events</text>
    <text x="420" y="365" fill="white" opacity=".86" font-family="Arial, sans-serif" font-size="34">Discover events that move you</text>
  </svg>`);
await sharp(socialBackground)
  .composite([{ input: await sharp(logo).resize(280, 280).png().toBuffer(), left: 90, top: 175 }])
  .png()
  .toFile('app/opengraph-image.png');

await QRCode.toFile('public/assets/future-times-events-qr.png', siteUrl, {
  errorCorrectionLevel: 'H', width: 1200, margin: 4,
  color: { dark: '#17082B', light: '#FFFFFF' },
});

console.log('Generated favicon, app icons, social image, and permanent site QR.');
