import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'House Rules',
    short_name: 'House Rules',
    description: 'A shared home for game night.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f0e5',
    theme_color: '#315de8',
    icons: [{ src: '/favicon.svg', sizes: '64x64', type: 'image/svg+xml' }],
  };
}
