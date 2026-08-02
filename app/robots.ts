import type { MetadataRoute } from 'next';

const SITE_URL = 'https://futuretimesevents.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/analytics/', '/api/', '/auth/', '/checkin/', '/checkout/', '/dashboard/', '/notifications/', '/profile/', '/settings/', '/ticket/', '/tickets/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
