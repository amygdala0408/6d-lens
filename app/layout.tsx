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
  title: 'The 6D Lens | Evaluating EdTech for Instructional Design & Pedagogy',
  description:
    'A structured, research-grounded framework for evaluating educational technology across six dimensions of instructional design, pedagogy, equity, and student safety. Built on Hattie, Marzano, UDL, TPACK, and ESSA evidence tiers.',
  keywords: [
    'edtech evaluation',
    'education technology',
    'instructional design',
    'pedagogy',
    '6D framework',
    'learning design',
    'student safety',
    'equity in edtech',
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
    title: 'The 6D Lens | Evaluating EdTech for Instructional Design & Pedagogy',
    description:
      'A structured, research-grounded framework for evaluating educational technology. Six dimensions. Four gatekeepers. Evidence-capped scoring.',
    siteName: 'The 6D Lens',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'The 6D Lens: Evaluating EdTech for Instructional Design and Pedagogy',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The 6D Lens | Evaluating EdTech for Instructional Design & Pedagogy',
    description:
      'A structured evaluation framework grounded in learning science, prioritizing equity, student safety, and evidence-based instructional design.',
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
