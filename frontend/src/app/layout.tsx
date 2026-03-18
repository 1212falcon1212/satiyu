import type { Metadata, Viewport } from 'next';
import { Poppins, DM_Sans } from 'next/font/google';
import { Providers } from '@/components/providers';
import { fetchApi } from '@/lib/api-server';
import type { SiteSettings } from '@/types/api';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1A1A1A',
};

function resolveUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${path}`;
}

export async function generateMetadata(): Promise<Metadata> {
  let favicon: string | undefined;
  try {
    const res = await fetchApi<{ data: SiteSettings }>('/settings', {
      revalidate: 600,
      tags: ['settings'],
    });
    favicon = resolveUrl(res.data.general?.site_favicon);
  } catch {
    // ignore
  }

  return {
    title: {
      default: 'Giyim Mağazası - Online Moda Alışveriş',
      template: '%s | Giyim Mağazası',
    },
    description:
      'Kadın, erkek ve çocuk giyimde en yeni trendler. Kaliteli ve uygun fiyatlı moda ürünleri.',
    metadataBase: new URL(SITE_URL),
    ...(favicon && {
      icons: {
        icon: favicon,
        shortcut: favicon,
        apple: favicon,
      },
    }),
    openGraph: {
      type: 'website',
      siteName: 'Giyim Mağazası',
      locale: 'tr_TR',
      images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Giyim Mağazası' }],
    },
    twitter: {
      card: 'summary_large_image',
      images: ['/og-image.jpg'],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${poppins.variable} ${dmSans.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
