import type { Metadata, Viewport } from 'next';
import { DM_Sans, Nunito } from 'next/font/google';
import './globals.css';

const bodyFont = DM_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const headingFont = Nunito({ subsets: ['latin'], variable: '--font-heading', display: 'swap' });
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  metadataBase: new URL('https://bruce12-glitch.github.io'),
  title: 'Intellect — Good books. Better conversations.',
  description: 'A happy little home for books, big ideas, and curious minds. Discover a good read, find your people, and pass a book forward.',
  icons: { icon: `${basePath}/icon.svg` },
  openGraph: {
    type: 'website',
    url: 'https://bruce12-glitch.github.io/intellect/',
    siteName: 'Intellect',
    title: 'Good books. Better conversations.',
    description: 'Your next favorite book is just the beginning.',
    images: [{ url: `${basePath}/images/pip-reading.webp`, width: 640, height: 640, alt: 'Pip, Intellect’s friendly green reading companion' }],
  },
};

export const viewport: Viewport = { themeColor: '#fbfcf9', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className={`${bodyFont.variable} ${headingFont.variable}`}>{children}</body></html>;
}
