import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import LanguageProvider from './LanguageProvider';

const geistSans = localFont({ src: '../public/fonts/geist-latin.woff2', variable: '--font-geist-sans', weight: '100 900', display: 'swap' });
const geistMono = localFont({ src: '../public/fonts/geist-mono-latin.woff2', variable: '--font-geist-mono', weight: '100 900', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_ORIGIN ?? 'http://localhost:3000'),
  title: 'House Rules — Game night starts here',
  description: 'Create a room, invite your friends, and play social games together from any phone.',
  applicationName: 'House Rules',
  appleWebApp: { capable: true, title: 'House Rules', statusBarStyle: 'black-translucent' },
  openGraph: {
    title: 'House Rules — Game night starts here',
    description: 'One shared room for secret roles, wild accusations, and unforgettable game nights.',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'House Rules — Phones down. Game on.' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'House Rules — Game night starts here',
    description: 'One shared room for secret roles, wild accusations, and unforgettable game nights.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}><LanguageProvider>{children}</LanguageProvider></body></html>;
}
