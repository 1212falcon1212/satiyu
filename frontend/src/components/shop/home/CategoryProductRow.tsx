'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ProductListItem } from '@/types/api';
import { ProductCard } from '../ProductCard';

interface CategoryProductRowProps {
  title: string;
  subtitle?: string;
  products: ProductListItem[];
  href?: string;
  bgColor?: string;
}

export function CategoryProductRow({
  title,
  subtitle,
  products,
  href,
}: CategoryProductRowProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-4">
      <div className="container-main">
        <div className="rounded-lg border border-secondary-200 bg-white overflow-hidden">
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-secondary-100">
            <h2 className="text-base font-bold text-accent">
              {subtitle && (
                <span className="text-secondary-900">{subtitle} </span>
              )}
              {title}
            </h2>
            {href && (
              <Link
                href={href}
                className="flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-dark transition-colors"
              >
                Tümünü Gör <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {/* Product grid — lazimbana style: bordered cells */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="border-r border-b border-secondary-100 last:border-r-0 [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r sm:[&:nth-child(3n)]:border-r-0 md:[&:nth-child(3n)]:border-r md:[&:nth-child(4n)]:border-r-0 lg:[&:nth-child(4n)]:border-r lg:[&:nth-child(5n)]:border-r-0 xl:[&:nth-child(5n)]:border-r xl:[&:nth-child(6n)]:border-r-0"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
