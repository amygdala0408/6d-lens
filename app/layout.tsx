import type { Metadata, Viewport } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';

// ─── Fonts ────────────────────────────────────────────────
// Bebas Neue is loaded via CSS @font-face in globals.css
// because next/font doesn't support it reliably.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
  weight: ['300', '400', '500', '600', '700'],
});

// ─── Metadata ─────────────────────────────────────────────
export const metadata: Metadata = {
  title: '6D Lens | EdTech Evaluation Framework',
  description:
    'Research-backed EdTech evaluation using the 6 Dimensions of Intention & Integrity in Learning Design. Built on Hattie, Marzano, UDL, TPACK, and ESSA evidence tiers.',
  keywords: [
    'edtech evaluation',
    'education technology',
    '6D framework',
    'learning design',
    'pedagogical vault',
    'UDL',
    'TPACK',
    'SAMR',
    'Hattie',
    'Marzano',
    'ESSA evidence',
  ],
  authors: [{ name: 'Amy Henderson' }],
  creator: 'The Pedagogical Vault',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://6dlens.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: '6D Lens | Does Your EdTech Tool Put Learning First?',
    description:
      'Research-backed EdTech evaluation using the 6 Dimensions of Intention & Integrity in Learning Design. No marketing hype. Just honest analysis.',
    siteName: '6D Lens',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '6D Lens — EdTech Evaluation Framework',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '6D Lens | Does Your EdTech Tool Put Learning First?',
    description:
      'Research-backed EdTech evaluation framework grounded in learning science.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1A1A1A',
};

// ─── Root Layout ──────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <head>
        {/* Preconnect for Bebas Neue from Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap"
          rel="stylesheet"
        />
        {/* SVG Favicon */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-lens-paper text-lens-ink antialiased">
        {children}
      </body>
    </html>
  );
}
