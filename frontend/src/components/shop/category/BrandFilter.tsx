'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Search } from 'lucide-react';
import type { Brand } from '@/types/api';

interface BrandFilterProps {
  brands: Brand[];
  selected: number[];
  onChange: (ids: number[]) => void;
}

export function BrandFilter({ brands, selected, onChange }: BrandFilterProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);

  const toggle = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  if (brands.length === 0) return null;

  // Check if brands have logos
  const hasLogos = brands.some((b) => b.logoUrl);

  return (
    <div>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-secondary-900 border-b-2 border-accent pb-2">
        Marka
      </h4>

      {brands.length > 6 && (
        <div className="relative mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Marka ara..."
            className="h-9 w-full rounded-sm border border-secondary-200 pl-8 pr-3 text-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary-400" />
        </div>
      )}

      {hasLogos ? (
        /* Logo grid layout */
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
          {filtered.map((brand) => {
            const isSelected = selected.includes(brand.id);
            const logoSrc = brand.logoUrl
              ? brand.logoUrl.startsWith('http')
                ? brand.logoUrl
                : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${brand.logoUrl}`
              : null;

            return (
              <button
                key={brand.id}
                type="button"
                onClick={() => toggle(brand.id)}
                className={`flex items-center justify-center p-3 border rounded-sm transition-colors ${
                  isSelected
                    ? 'border-accent bg-accent-50'
                    : 'border-secondary-200 hover:border-secondary-300'
                }`}
              >
                {logoSrc ? (
                  <Image
                    src={logoSrc}
                    alt={brand.name}
                    width={80}
                    height={40}
                    className="h-8 w-auto object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="text-xs font-medium text-secondary-700">{brand.name}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* Checkbox list */
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {filtered.map((brand) => (
            <label
              key={brand.id}
              className="flex cursor-pointer items-center gap-2 py-1.5 text-sm hover:text-accent transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.includes(brand.id)}
                onChange={() => toggle(brand.id)}
                className="h-3.5 w-3.5 rounded-sm border-secondary-300 text-accent focus:ring-accent"
              />
              <span className="text-secondary-700">{brand.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
