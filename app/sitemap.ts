import type { MetadataRoute } from 'next';

const SITE_URL = 'https://futuretimesevents.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/events`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/map`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/privacy-policy`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
