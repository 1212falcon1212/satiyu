import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Category, ProductListItem, Banner } from '@/types/api';
import { storageUrl } from '@/lib/utils';
import { ProductCard } from '@/components/shop/ProductCard';
import { TreeLine } from './SvgDecorations';

interface CategoryShowcaseProps {
  category: Category;
  products: ProductListItem[];
  banner?: Banner;
  index: number;
}

export function CategoryShowcase({ category, products, banner, index }: CategoryShowcaseProps) {
  if (products.length === 0) return null;

  const isReversed = index % 2 === 1;

  return (
    <section className="relative overflow-hidden bg-white py-10">
      <TreeLine className="text-primary-900" />

      <div className="container-main">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-secondary-900 lg:text-3xl">
            {category.name}
          </h2>
          <Link
            href={`/kategori/${category.slug}`}
            className="flex items-center gap-1.5 rounded-full bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100"
          >
            Tümünü Gör <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Two-column layout */}
        <div className={`flex flex-col gap-6 lg:flex-row ${isReversed ? 'lg:flex-row-reverse' : ''}`}>
          {/* Banner column */}
          <div className="lg:w-1/3">
            {banner ? (
              <Link
                href={banner.linkUrl || `/kategori/${category.slug}`}
                className="group relative block h-full min-h-[240px] overflow-hidden rounded-2xl lg:min-h-full"
              >
                <Image
                  src={storageUrl(banner.imageUrl)}
                  alt={banner.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-display text-lg font-bold text-white">
                    {banner.title}
                  </h3>
                </div>
              </Link>
            ) : (
              <div className="flex h-full min-h-[240px] items-end rounded-2xl bg-gradient-to-br from-primary-700 to-primary-900 p-6 lg:min-h-full">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-sm text-primary-200">
                    {category.description || 'En iyi ürünleri keşfet'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Products column */}
          <div className="lg:w-2/3">
            <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {products.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
