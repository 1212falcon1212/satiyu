'use client';

import { useCallback, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Category, Brand } from '@/types/api';
import { CategorySidebar } from './CategorySidebar';
import { BrandFilter } from './BrandFilter';
import { PriceRangeFilter } from './PriceRangeFilter';

interface FilterPanelProps {
  category: Category;
  subcategories: Category[];
  ancestors: Category[];
  brands: Brand[];
}

export function FilterPanel({ category, subcategories, ancestors, brands }: FilterPanelProps) {
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

  const filterContent = (
    <div className="space-y-6">
      <CategorySidebar current={category} subcategories={subcategories} ancestors={ancestors} />

      <div className="border-t border-secondary-100 pt-4">
        <BrandFilter
          brands={brands}
          selected={selectedBrands}
          onChange={handleBrandChange}
        />
      </div>

      <div className="border-t border-secondary-100 pt-4">
        <PriceRangeFilter
          minPrice={minPrice}
          maxPrice={maxPrice}
          onApply={handlePriceApply}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile filter button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="flex items-center gap-2 rounded-sm border border-secondary-200 px-3 py-2 text-sm font-medium text-secondary-700 lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filtreler
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-72 flex-shrink-0">
        <div className="sticky top-[80px] p-5">
          {filterContent}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-80 max-w-[85vw] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-secondary-100 px-4 py-3">
              <span className="text-sm font-bold uppercase tracking-wider">Filtreler</span>
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
