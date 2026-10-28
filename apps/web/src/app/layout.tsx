import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Intellect - Your AI Knowledge Base',
    template: '%s | Intellect',
  },
  description: 'Save what matters. Write what you think. Curate an AI that knows what you know. Summarize, organize, and chat with your knowledge.',
  keywords: ['AI', 'knowledge base', 'summarization', 'spaced repetition', 'learning', 'productivity', 'second brain'],
  authors: [{ name: 'Intellect' }],
  creator: 'Intellect',
  publisher: 'Intellect',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://intellect.app',
    siteName: 'Intellect',
    title: 'Intellect - Your AI Knowledge Base',
    description: 'Save what matters. Write what you think. Curate an AI that knows what you know.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Intellect - AI Knowledge Base',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Intellect - Your AI Knowledge Base',
    description: 'Save what matters. Write what you think. Curate an AI that knows what you know.',
    images: ['/og-image.png'],
    creator: '@getintellect',
  },
  verification: {
    google: 'google-site-verification-code',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}