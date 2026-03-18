import type { Metadata } from 'next';
import { fetchApi } from '@/lib/api-server';
import type { Banner, ProductListItem, Brand, Category, FeaturedCategory, HomepageSection, PaginatedResponse, SiteSettings, TrustBadge } from '@/types/api';
import { HeroBanner } from '@/components/shop/home/HeroBanner';
import { AdvantageBar } from '@/components/shop/home/AdvantageBar';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { BrandCarousel } from '@/components/shop/home/BrandCarousel';
import { TripleBanner } from '@/components/shop/home/TripleBanner';
import { Newsletter } from '@/components/shop/home/Newsletter';
import { TrustBadges } from '@/components/shop/home/TrustBadges';
import { FeaturedCategories } from '@/components/shop/home/FeaturedCategories';
import { HomepageSectionRenderer } from '@/components/shop/home/HomepageSectionRenderer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

export const metadata: Metadata = {
  title: 'Giyim Mağazası - Online Moda Alışveriş',
  description: 'Kadın, erkek ve çocuk giyimde en yeni trendler. Kaliteli ve uygun fiyatlı moda ürünleri ile online alışverişin keyfini çıkarın.',
  openGraph: {
    title: 'Giyim Mağazası - Online Moda Alışveriş',
    description: 'Kadın, erkek ve çocuk giyimde en yeni trendler. Kaliteli ve uygun fiyatlı moda ürünleri.',
    url: SITE_URL,
    siteName: 'Giyim Mağazası',
    type: 'website',
  },
};

// ─── Dynamic sections API ────────────────────────────────────
async function getHomepageSections() {
  try {
    const res = await fetchApi<{ data: HomepageSection[] }>('/homepage/sections', {
      revalidate: 0,
      tags: ['homepage-sections'],
    });
    return res.data;
  } catch {
    return null;
  }
}

// ─── Legacy fetchers (fallback) ──────────────────────────────
async function getBanners() {
  try {
    const res = await fetchApi<{ data: Banner[] }>('/banners', {
      revalidate: 300,
      tags: ['banners'],
    });
    return res.data;
  } catch {
    return [];
  }
}

async function getFeaturedProducts() {
  try {
    const res = await fetchApi<PaginatedResponse<ProductListItem>>(
      '/products?show_on_homepage=1&per_page=50',
      { revalidate: 300, tags: ['products'] }
    );
    return res.data;
  } catch {
    return [];
  }
}

async function getBrands() {
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

async function getCategories() {
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

async function getFeaturedCategories() {
  try {
    const res = await fetchApi<{ data: FeaturedCategory[] }>('/categories/featured', {
      revalidate: 0,
      tags: ['categories', 'products'],
    });
    return res.data;
  } catch {
    return [];
  }
}

async function getTrustBadges() {
  try {
    const res = await fetchApi<{ data: TrustBadge[] }>('/trust-badges', {
      revalidate: 3600,
      tags: ['trust-badges'],
    });
    return res.data;
  } catch {
    return [];
  }
}

async function getSettings() {
  try {
    const res = await fetchApi<{ data: SiteSettings }>('/settings', {
      revalidate: 600,
      tags: ['settings'],
    });
    return res.data;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  // Try dynamic sections first
  const [sections, settings] = await Promise.all([
    getHomepageSections(),
    getSettings(),
  ]);

  const siteName = settings?.general?.site_name || 'Giyim Mağazası';

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteName,
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      sameAs: [],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: SITE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/arama?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  // Dynamic rendering if sections are available
  if (sections && sections.length > 0) {
    let productGridIndex = 0;
    return (
      <div>
        {sections.map((section) => {
          const ci = section.type === 'product_grid' ? productGridIndex++ : 0;
          return <HomepageSectionRenderer key={section.id} section={section} colorIndex={ci} />;
        })}

        {jsonLd.map((ld, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
          />
        ))}
      </div>
    );
  }

  // Fallback: legacy hardcoded layout
  const [banners, featured, brands, categories, featuredCats, trustBadges] = await Promise.all([
    getBanners(),
    getFeaturedProducts(),
    getBrands(),
    getCategories(),
    getFeaturedCategories(),
    getTrustBadges(),
  ]);

  const heroBanners = banners.filter((b) => b.position === 'hero');
  const midBanners = banners.filter((b) => b.position === 'mid');
  const featuredSlice = featured.slice(0, 10);
  const bannerCategories = featuredCats.filter((c) => c.isFeatured);
  const showcaseCategories = featuredCats.filter(
    (c) => c.products && c.products.length > 0
  );

  return (
    <div>
      <HeroBanner banners={heroBanners} categories={categories} />
      <AdvantageBar />
      <TripleBanner banners={midBanners} />
      {bannerCategories.length > 0 && <FeaturedCategories categories={bannerCategories} />}
      {featuredSlice.length > 0 && (
        <ProductGrid
          title="Öne Çıkan Ürünler"
          subtitle="Yeni Sezon"
          description="En beğenilen ve en çok satan moda ürünleri"
          products={featuredSlice}
          href="/one-cikanlar"
          columns={5}
        />
      )}
      {showcaseCategories.map((cat) => (
        <ProductGrid
          key={cat.id}
          title={cat.showcaseTitle || cat.name}
          products={cat.products}
          href={`/kategori/${cat.slug}`}
          columns={5}
          mode={cat.products.length > 5 ? 'carousel' : 'grid'}
        />
      ))}
      {brands.length > 0 && <BrandCarousel brands={brands} />}
      <TrustBadges badges={trustBadges} />
      <Newsletter />
      {jsonLd.map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
    </div>
  );
}
