import type { Metadata } from 'next';
import { Inter, Space_Grotesk, Raleway } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import StripeBackground from '@/components/layout/StripeBackground';
import { Toaster } from 'react-hot-toast';
import MobileBottomNav from '@/components/layout/MobileBottomNav';

/* ── Body font: Inter 400/500/600/700 ── */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

/* ── Heading font: Space Grotesk 700 ── */
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
  weight: ['700'],
});

/* ── Subheading font: Raleway 600 ── */
const raleway = Raleway({
  subsets: ['latin'],
  variable: '--font-raleway',
  display: 'swap',
  weight: ['600'],
});

export const metadata: Metadata = {
  title: 'Future Times Events – Discover Events That Move You',
  description: 'Discover world-class events, music festivals, art shows, tech conferences and more. Buy tickets, book VIP tables, and experience the best events near you with Future Times Events.',
  keywords: 'future times events, events, nightlife, tickets, festivals, concerts, event discovery',
  openGraph: {
    title: 'Future Times Events – Discover Events That Move You',
    description: 'The premier event discovery platform.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${raleway.variable} relative`}>
        <StripeBackground />
        <Navbar />
        <main className="relative z-10 pb-24 md:pb-0">{children}</main>
        <Footer />
        <MobileBottomNav />
        <Toaster
          position="bottom-right"
          gutter={12}
          toastOptions={{
            duration: 3500,
            className: 'toast-vybe',
            success: { iconTheme: { primary: '#46FFAB', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#FF55C2', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
