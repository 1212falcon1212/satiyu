import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { ProductListItem } from '@/types/api';
import { ProductCard } from '@/components/shop/ProductCard';
import { MountainDivider } from './SvgDecorations';

interface SpecialProductsProps {
  title?: string;
  subtitle?: string;
  products: ProductListItem[];
}

export function SpecialProducts({
  title = 'Sizin İçin Özel Ürünler',
  subtitle = 'Kamp ve outdoor tutkunları için seçilmiş ürünler',
  products,
}: SpecialProductsProps) {
  if (products.length === 0) return null;

  return (
    <>
      <MountainDivider className="text-white h-8 sm:h-12 -mb-px" />
      <section className="bg-white py-10 sm:py-14">
        <div className="container-main">
          {/* Header */}
          <div className="mb-8 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              <Sparkles className="h-3.5 w-3.5" />
              Özel Seçim
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold text-secondary-900 lg:text-3xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-secondary-500">{subtitle}</p>
            )}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {products.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* CTA */}
          <div className="mt-8 text-center">
            <Link
              href="/one-cikanlar"
              className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              Tümünü Gör <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <MountainDivider className="text-white h-8 sm:h-12 -mt-px" flip />
    </>
  );
}
