'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ProductListItem, Category } from '@/types/api';
import { ProductCard } from '../ProductCard';

interface VitrinCategory {
  category: Category;
  products: ProductListItem[];
}

interface CategoryVitrinSectionProps {
  sections: VitrinCategory[];
}

export function CategoryVitrinSection({ sections }: CategoryVitrinSectionProps) {
  if (sections.length === 0) return null;

  return (
    <>
      {sections.map((item) => {
        const { category, products } = item;
        if (products.length === 0) return null;

        // 2 columns, 6 rows = max 12 products
        const displayProducts = products.slice(0, 12);

        return (
          <section key={category.id} className="py-4">
            <div className="container-main">
              <div className="rounded-lg border border-secondary-200 bg-white overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-secondary-100">
                  <h2 className="text-base font-bold text-accent">
                    {category.showcaseTitle || category.name}
                  </h2>
                  <Link
                    href={`/kategori/${category.slug}`}
                    className="flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-dark transition-colors"
                  >
                    Tümünü Gör <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* 2-column 6-row grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {displayProducts.map((product) => (
                    <div
                      key={product.id}
                      className="border-r border-b border-secondary-100"
                    >
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
