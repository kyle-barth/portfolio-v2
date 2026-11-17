import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google';
import './globals.css';

// One family for the page (its optical sizes cover display and text); the mono face only paints the 3D monitor.
const display = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'], variable: '--font-display', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: '500', variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.kyle-barth.dev'),
  title: 'Kyle Barth, Senior Front-End Software Engineer',
  description:
    'Kyle Barth builds fast, well-tested web front ends in London. Side projects include Garage, a voice and text chat app, and Vitals, a sensor monitor for Windows.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#070a12',
  colorScheme: 'dark',
};

// Runs before the first paint: the page opens on the desk's monitor booting, and is brought in once
// the camera has pulled back from it (components/desk-scene.tsx). Without JavaScript nothing is hidden.
// With ?debug&motion=full (any motion=full in development) it also marks the document so the CSS shows
// the full motion even when the system asks for reduced motion, as the scene does.
const DEV = process.env.NODE_ENV !== 'production';
const BOOT = `document.documentElement.dataset.boot='on';var q=location.search;if((${DEV}||/[?&]debug(=|&|$)/.test(q))&&/[?&]motion=full(&|$)/.test(q))document.documentElement.dataset.motion='full'`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body data-side="left">{children}</body>
    </html>
  );
}
