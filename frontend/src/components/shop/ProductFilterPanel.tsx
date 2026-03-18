'use client';

import { useCallback, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Brand, Category } from '@/types/api';
import { BrandFilter } from './category/BrandFilter';
import { PriceRangeFilter } from './category/PriceRangeFilter';

interface ProductFilterPanelProps {
  brands: Brand[];
  categories?: Category[];
}

export function ProductFilterPanel({ brands, categories }: ProductFilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const selectedBrands = searchParams.get('brands')
    ? searchParams.get('brands')!.split(',').map(Number)
    : [];
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === '') {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  const handleBrandChange = (ids: number[]) => {
    updateParams({ brands: ids.length > 0 ? ids.join(',') : null });
  };

  const handlePriceApply = (min: string, max: string) => {
    updateParams({
      minPrice: min || null,
      maxPrice: max || null,
    });
  };

  const hasActiveFilters = selectedBrands.length > 0 || minPrice || maxPrice;

  const clearAll = () => {
    updateParams({ brands: null, minPrice: null, maxPrice: null });
  };

  const rootCategories = categories?.filter((c) => !c.parentId).slice(0, 8);

  const filterContent = (
    <div className="space-y-6">
      {/* Category navigation */}
      {rootCategories && rootCategories.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-secondary-900">Kategoriler</h4>
          <ul className="space-y-1">
            {rootCategories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/kategori/${cat.slug}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-secondary-700 transition-colors hover:bg-secondary-50 hover:text-primary-600"
                >
                  <span>{cat.name}</span>
                  {cat.productCount > 0 && (
                    <span className="text-xs text-secondary-400">({cat.productCount})</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Brand filter */}
      {rootCategories && rootCategories.length > 0 && (
        <div className="border-t border-secondary-100 pt-4" />
      )}
      <BrandFilter
        brands={brands}
        selected={selectedBrands}
        onChange={handleBrandChange}
      />

      {/* Price range */}
      <div className="border-t border-secondary-100 pt-4">
        <PriceRangeFilter
          minPrice={minPrice}
          maxPrice={maxPrice}
          onApply={handlePriceApply}
        />
      </div>

      {/* Clear all */}
      {hasActiveFilters && (
        <div className="border-t border-secondary-100 pt-4">
          <button
            type="button"
            onClick={clearAll}
            className="w-full rounded-lg border border-secondary-200 px-3 py-2 text-xs font-medium text-secondary-600 transition-colors hover:bg-secondary-50"
          >
            Filtreleri Temizle
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile filter button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-secondary-200 px-3 py-2 text-sm font-medium text-secondary-700 lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filtreler
        {hasActiveFilters && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
            {selectedBrands.length + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0)}
          </span>
        )}
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 flex-shrink-0">
        <div className="sticky top-32 rounded-xl border border-secondary-200 bg-white p-4">
          {filterContent}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-80 max-w-[85vw] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-secondary-100 px-4 py-3">
              <span className="text-sm font-semibold">Filtreler</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1 text-secondary-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 56px)' }}>
              {filterContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
