import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // TypeScript errors are surfaced during builds — do NOT ignore them.
  // Fix the error, don't silence it.
  typescript: {
    ignoreBuildErrors: false,
  },

  // Fix Turbopack workspace root detection (suppress lockfile warning)
  turbopack: {
    root: process.cwd(),
  },

  // Security headers applied to all responses
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      // Admin, checkin, and private ticket pages — never cached, never indexed
      {
        source: '/(admin|checkin|ticket)/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
      // API routes — no caching
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ];
  },

  // Images: allow Supabase storage and common image CDNs
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
    ],
  },
};

export default nextConfig;
