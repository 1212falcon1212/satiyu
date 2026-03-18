'use client';

import type { HomepageSection, Banner, Category, ProductListItem, Brand, TrustBadge } from '@/types/api';
import { HeroBanner } from './HeroBanner';
import { AdvantageBar } from './AdvantageBar';
import { TripleBanner } from './TripleBanner';
import { FeaturedCategories } from './FeaturedCategories';
import { ProductGrid } from '../ProductGrid';
import { CategoryProductRow } from './CategoryProductRow';
import { BrandCarousel } from './BrandCarousel';
import { TrustBadges } from './TrustBadges';
import { Newsletter } from './Newsletter';
import { SeoTextBlock } from './SeoTextBlock';
import { CategoryShowcaseSection } from './CategoryShowcaseSection';
import { CategoryVitrinSection } from './CategoryVitrinSection';
import { AllProductsSection } from './AllProductsSection';

// Rotate through these background colors for product_grid sections
const ROW_COLORS = [
  'bg-accent',
  'bg-primary-800',
  'bg-emerald-600',
  'bg-blue-600',
  'bg-orange-500',
  'bg-purple-600',
];

interface Props {
  section: HomepageSection;
  colorIndex?: number;
}

export function HomepageSectionRenderer({ section, colorIndex = 0 }: Props) {
  const { type, data, title, subtitle } = section;

  switch (type) {
    case 'hero_banner': {
      const banners = (data.banners ?? []) as Banner[];
      const categories = (data.categories ?? []) as Category[];
      return <HeroBanner banners={banners} categories={categories} />;
    }

    case 'advantage_bar': {
      const items = data.items as { icon: string; text: string }[] | undefined;
      return <AdvantageBar items={items ?? undefined} />;
    }

    case 'banner_group': {
      const banners = (data.banners ?? []) as Banner[];
      return <TripleBanner banners={banners} />;
    }

    case 'featured_categories': {
      const categories = (data.categories ?? []) as Category[];
      if (categories.length === 0) return null;
      return <FeaturedCategories categories={categories} />;
    }

    case 'product_grid': {
      const products = (data.products ?? []) as ProductListItem[];
      if (products.length === 0) return null;
      const columns = (data.columns as 4 | 5 | 6) ?? 5;
      const href = (data.href as string) ?? undefined;
      const mode = (data.mode as 'grid' | 'carousel') ?? 'grid';

      // Use lazimbana-style CategoryProductRow for carousel or when there's a title
      if (title) {
        return (
          <CategoryProductRow
            title={title}
            subtitle={subtitle ?? undefined}
            products={products}
            href={href}
            bgColor={ROW_COLORS[colorIndex % ROW_COLORS.length]}
          />
        );
      }

      // Fallback to standard grid
      return (
        <ProductGrid
          title={title ?? ''}
          subtitle={subtitle ?? undefined}
          products={products}
          href={href}
          columns={columns}
          mode={mode}
        />
      );
    }

    case 'category_showcase': {
      const category = data.category as Category | null;
      const children = (data.children ?? []) as Category[];
      const bannerImage = (data.bannerImage as string) ?? null;
      if (!category) return null;
      return (
        <CategoryShowcaseSection
          title={title ?? category.name}
          category={category}
          children={children}
          bannerImage={bannerImage}
        />
      );
    }

    case 'text_block': {
      const content = (data.content as string) ?? '';
      const expandable = (data.expandable as boolean) ?? false;
      return (
        <SeoTextBlock
          title={title ?? undefined}
          content={content}
          expandable={expandable}
        />
      );
    }

    case 'category_vitrin': {
      const vitrinSections = (data.sections ?? []) as { category: Category; products: ProductListItem[] }[];
      if (vitrinSections.length === 0) return null;
      return <CategoryVitrinSection sections={vitrinSections} />;
    }

    case 'brand_carousel': {
      const brands = (data.brands ?? []) as Brand[];
      if (brands.length === 0) return null;
      return <BrandCarousel brands={brands} />;
    }

    case 'trust_badges': {
      const badges = (data.badges ?? []) as TrustBadge[];
      return <TrustBadges badges={badges} />;
    }

    case 'all_products': {
      return <AllProductsSection />;
    }

    case 'newsletter': {
      const nlTitle = (data.title as string) ?? undefined;
      const nlSubtitle = (data.subtitle as string) ?? undefined;
      return <Newsletter title={nlTitle} subtitle={nlSubtitle} />;
    }

    default:
      return null;
  }
}
