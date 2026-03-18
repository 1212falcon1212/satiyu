'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductListItem } from '@/types/api';
import { ProductCard, ProductCardSkeleton } from './ProductCard';

interface ProductGridProps {
  title: string;
  subtitle?: string;
  description?: string;
  products: ProductListItem[];
  href?: string;
  columns?: 4 | 5 | 6;
  mode?: 'grid' | 'carousel';
}

export function ProductGrid({
  title,
  subtitle,
  description,
  products,
  href,
  columns = 5,
  mode = 'grid',
}: ProductGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const w = scrollRef.current.clientWidth;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -w : w, behavior: 'smooth' });
  };

  return (
    <section className="bg-white py-10">
      <div className="container-main">
        {/* Section header - centered WoodMart style */}
        <div className="section-header">
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
          <h2 className="section-title">{title}</h2>
          {description && <p className="section-desc">{description}</p>}
        </div>

        {mode === 'carousel' ? (
          <div className="relative overflow-hidden">
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex-shrink-0"
                  style={{ width: 'calc((100% - 64px) / 5)', scrollSnapAlign: 'start' }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
            {products.length > 4 && (
              <>
                <button
                  type="button"
                  onClick={() => scroll('left')}
                  className="absolute -left-3 top-1/3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg text-secondary-700 hover:text-accent transition-colors hidden lg:flex"
                  aria-label="Önceki"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scroll('right')}
                  className="absolute -right-3 top-1/3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg text-secondary-700 hover:text-accent transition-colors hidden lg:flex"
                  aria-label="Sonraki"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        ) : (
          <div className={`grid grid-cols-2 gap-4 sm:gap-5 sm:grid-cols-3 md:grid-cols-4 ${columns === 6 ? 'xl:grid-cols-6' : columns === 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {href && (
          <div className="mt-8 text-center">
            <Link
              href={href}
              className="inline-flex items-center gap-2 border-2 border-secondary-900 px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-secondary-900 transition-colors hover:bg-secondary-900 hover:text-white"
            >
              Tümünü Gör <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export function ProductGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <section className="container-main py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto h-8 w-48 rounded bg-secondary-200 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: count }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
