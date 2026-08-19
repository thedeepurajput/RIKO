import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-jb',
  display: 'swap',
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#080b14',
};

export const metadata = {
  title: 'RIKO — Ephemeral Encrypted Chat',
  description: 'Start a private, ephemeral chat with anyone. Share a code, connect instantly, and chat securely. All data auto-deletes after inactivity.',
  keywords: 'riko, chat, ephemeral, private, encrypted, p2p, peer-to-peer, temporary, pwa',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RIKO',
  },
  icons: {
    icon: '/icon-192.svg',
    apple: '/icon-192.svg',
  },
  openGraph: {
    title: 'RIKO — Ephemeral Encrypted Chat',
    description: 'Private, code-based chat that auto-deletes. No sign-up required.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RIKO" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
