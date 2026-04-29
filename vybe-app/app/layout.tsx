import type { Metadata } from 'next';
import { Inter, Syne } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import StripeBackground from '@/components/layout/StripeBackground';
import { Toaster } from 'react-hot-toast';
import MobileBottomNav from '@/components/layout/MobileBottomNav';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Events Distro – Discover Events That Move You',
  description: 'Discover world-class events, music festivals, art shows, tech conferences and more. Buy tickets, book VIP tables, and experience the best events near you.',
  keywords: 'events, nightlife, tickets, festivals, concerts, event discovery',
  openGraph: {
    title: 'Events Distro – Discover Events That Move You',
    description: 'The premier event discovery platform.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${syne.variable} relative`}>
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
