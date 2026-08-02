import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Future Times Events',
    short_name: 'Future Times',
    description: 'Discover events and reserve tickets across Zimbabwe.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#7222E3',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
