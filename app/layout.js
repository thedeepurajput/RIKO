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

export const metadata = {
  title: 'LinkChat — Ephemeral Encrypted Chat',
  description: 'Start a private, ephemeral chat with anyone. Share a code, connect instantly, and chat securely. All data auto-deletes after inactivity.',
  keywords: 'chat, ephemeral, private, encrypted, p2p, peer-to-peer, temporary',
  openGraph: {
    title: 'LinkChat — Ephemeral Encrypted Chat',
    description: 'Private, code-based chat that auto-deletes. No sign-up required.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
