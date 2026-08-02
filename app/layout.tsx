import type { Metadata } from 'next';
import { Inter, Space_Grotesk, Raleway } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import StripeBackground from '@/components/layout/StripeBackground';
import { Toaster } from 'react-hot-toast';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import CookieConsent from '@/components/CookieConsent';
import { AuthProvider } from '@/lib/auth-context';
import HideOnAuthPages from '@/components/layout/HideOnAuthPages';

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
  metadataBase: new URL('https://futuretimesevents.com'),
  title: {
    default: 'Future Times Events | Discover Events in Zimbabwe',
    template: '%s | Future Times Events',
  },
  description: 'Discover concerts, festivals, nightlife, sports and experiences across Zimbabwe. Find events, reserve tickets and plan your next unforgettable moment with Future Times Events.',
  applicationName: 'Future Times Events',
  authors: [{ name: 'Future Times Events', url: 'https://futuretimesevents.com' }],
  creator: 'Future Times Events',
  publisher: 'Future Times Events',
  keywords: ['Future Times Events', 'events in Zimbabwe', 'Zimbabwe event tickets', 'Harare events', 'concerts', 'festivals', 'nightlife', 'sports events'],
  category: 'events',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  openGraph: {
    title: 'Future Times Events | Discover Events in Zimbabwe',
    description: 'Discover Zimbabwe’s best concerts, festivals, nightlife, sports and experiences.',
    url: '/',
    siteName: 'Future Times Events',
    type: 'website',
    locale: 'en_ZW',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'Future Times Events' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Future Times Events | Discover Events in Zimbabwe',
    description: 'Discover Zimbabwe’s best concerts, festivals, nightlife, sports and experiences.',
    images: ['/opengraph-image.png'],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationJsonLd = {
    '@context': 'https://schema.org', '@type': 'Organization', name: 'Future Times Events',
    url: 'https://futuretimesevents.com', logo: 'https://futuretimesevents.com/icon.png',
    description: 'Event discovery and ticketing platform for experiences across Zimbabwe.',
  };
  const websiteJsonLd = {
    '@context': 'https://schema.org', '@type': 'WebSite', name: 'Future Times Events',
    alternateName: 'Future Times', url: 'https://futuretimesevents.com',
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${raleway.variable} relative`}>
        <AuthProvider>
          <StripeBackground />
          <Navbar />
          <main className="relative z-10 pb-24 md:pb-0">{children}</main>
          <HideOnAuthPages>
            <Footer />
          </HideOnAuthPages>
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
          <CookieConsent />
        </AuthProvider>
      </body>
    </html>
  );
}
