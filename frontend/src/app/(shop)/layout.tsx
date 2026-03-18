import type { Metadata } from 'next';
import { ShopHeader } from '@/components/shop/header/ShopHeader';
import { AnnouncementBar } from '@/components/shop/header/AnnouncementBar';
import { ShopFooter } from '@/components/shop/ShopFooter';
import { FavoritesSyncProvider } from '@/components/shop/FavoritesSyncProvider';
import { SettingsProvider } from '@/hooks/useSettings';
import { fetchApi } from '@/lib/api-server';
import type { Brand, Category, SiteSettings, BlogPost } from '@/types/api';

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetchApi<{ data: Category[] }>('/categories', {
      revalidate: 3600,
      tags: ['categories'],
    });
    return res.data;
  } catch {
    return [];
  }
}

async function getBrands(): Promise<Brand[]> {
  try {
    const res = await fetchApi<{ data: Brand[] }>('/brands', {
      revalidate: 3600,
      tags: ['brands'],
    });
    return res.data;
  } catch {
    return [];
  }
}

async function getSettings(): Promise<SiteSettings> {
  try {
    const res = await fetchApi<{ data: SiteSettings }>('/settings', {
      revalidate: 60,
      tags: ['settings'],
    });
    return res.data;
  } catch {
    return {};
  }
}

async function getLatestBlogPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetchApi<{ data: BlogPost[] }>('/blog?per_page=3', {
      revalidate: 600,
      tags: ['blog'],
    });
    return res.data;
  } catch {
    return [];
  }
}

function resolveUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${path}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const favicon = resolveUrl(settings.general?.site_favicon);

  if (!favicon) return {};

  return {
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon,
    },
  };
}

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, brands, settings, blogPosts] = await Promise.all([
    getCategories(),
    getBrands(),
    getSettings(),
    getLatestBlogPosts(),
  ]);

  return (
    <SettingsProvider settings={settings}>
      <div className="flex min-h-screen flex-col">
        <AnnouncementBar />
        <ShopHeader categories={categories} />
        <FavoritesSyncProvider />
        <main className="flex-1">{children}</main>
        <ShopFooter settings={settings} categories={categories} brands={brands} blogPosts={blogPosts} />
      </div>
    </SettingsProvider>
  );
}
