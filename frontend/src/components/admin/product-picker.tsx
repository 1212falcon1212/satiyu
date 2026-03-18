'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Search, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api$/, '');

interface ProductItem {
  id: number;
  name: string;
  price: number;
  mainImage: string | null;
  categoryName: string | null;
  stockQuantity: number;
}

interface ProductPickerProps {
  value: number[];
  onChange: (ids: number[]) => void;
  categoryId: number | null;
  max?: number;
  label?: string;
  hint?: string;
}

function resolveImg(url: string | null) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

export function ProductPicker({
  value,
  onChange,
  categoryId,
  max = 10,
  label,
  hint,
}: ProductPickerProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch products belonging to this category (and its subcategories)
  const { data: products, isLoading } = useQuery<ProductItem[]>({
    queryKey: ['admin', 'products', 'by-category', categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data } = await api.get(
        `/admin/products?filter[category_tree]=${categoryId}&per_page=200&sort=name`
      );
      const raw = data.data ?? data;
      return (Array.isArray(raw) ? raw : []).map(
        (p: Record<string, unknown>) => ({
          id: p.id as number,
          name: p.name as string,
          price: p.price as number,
          mainImage: (p.mainImage as string) ?? null,
          categoryName: (p.categoryName as string) ?? null,
          stockQuantity: (p.stockQuantity as number) ?? 0,
        })
      );
    },
    enabled: !!categoryId,
    staleTime: 30000,
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    if (!debouncedSearch) return products;
    const q = debouncedSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, debouncedSearch]);

  // Separate selected (in order) and unselected
  const selectedProducts = useMemo(() => {
    if (!products) return [];
    return value
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean) as ProductItem[];
  }, [value, products]);

  const unselectedProducts = useMemo(() => {
    const selectedSet = new Set(value);
    return filtered.filter((p) => !selectedSet.has(p.id));
  }, [filtered, value]);

  const toggleProduct = (id: number) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      if (value.length >= max) return;
      onChange([...value, id]);
    }
  };

  if (!categoryId) {
    return (
      <div className="rounded-lg border border-dashed border-secondary-300 bg-secondary-50 p-6 text-center">
        <p className="text-xs text-secondary-400">
          Önce kategoriyi kaydedin, sonra vitrin ürünlerini seçebilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-secondary-700">
            {label}
          </label>
          <span className="text-xs text-secondary-400">
            {value.length}/{max} seçili
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ürünlerde ara..."
          className="h-8 w-full rounded-lg border border-secondary-200 bg-secondary-50 pl-8 pr-3 text-xs text-secondary-700 placeholder:text-secondary-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
      </div>

      {/* Product list */}
      <div className="max-h-72 overflow-y-auto rounded-lg border border-secondary-200">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-secondary-400" />
          </div>
        ) : filtered.length === 0 && selectedProducts.length === 0 ? (
          <div className="py-8 text-center text-xs text-secondary-400">
            {search
              ? 'Aramayla eşleşen ürün bulunamadı.'
              : 'Bu kategoride ürün bulunmuyor.'}
          </div>
        ) : (
          <div className="divide-y divide-secondary-100">
            {/* Selected first */}
            {!debouncedSearch &&
              selectedProducts.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  selected
                  disabled={false}
                  onToggle={() => toggleProduct(product.id)}
                />
              ))}

            {/* Then unselected */}
            {unselectedProducts.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                selected={false}
                disabled={value.length >= max}
                onToggle={() => toggleProduct(product.id)}
              />
            ))}
          </div>
        )}
      </div>

      {hint && (
        <p className="text-xs text-secondary-400">{hint}</p>
      )}
    </div>
  );
}

function ProductRow({
  product,
  selected,
  disabled,
  onToggle,
}: {
  product: ProductItem;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!selected && disabled}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
        selected
          ? 'bg-primary-50/50'
          : disabled
            ? 'opacity-40 cursor-not-allowed'
            : 'hover:bg-secondary-50'
      )}
    >
      {/* Checkbox */}
      <div
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
          selected
            ? 'border-primary-600 bg-primary-600 text-white'
            : 'border-secondary-300 bg-white'
        )}
      >
        {selected && <Check className="h-3 w-3" />}
      </div>

      {/* Image */}
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-secondary-100 bg-secondary-50">
        {product.mainImage ? (
          <Image
            src={resolveImg(product.mainImage)}
            alt={product.name}
            fill
            className="object-contain"
            sizes="36px"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-secondary-300">
            ?
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs font-medium text-secondary-800">
          {product.name}
        </span>
        <span className="text-[10px] text-secondary-400">
          {product.categoryName ? `${product.categoryName} · ` : ''}
          ₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          {product.stockQuantity <= 0 && ' · Stok yok'}
        </span>
      </div>

      {/* Selection order badge */}
      {selected && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
          {/* We don't have index here easily, just show check */}
        </span>
      )}
    </button>
  );
}
