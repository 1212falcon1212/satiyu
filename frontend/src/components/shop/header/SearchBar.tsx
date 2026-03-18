'use client';

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Search, X, ShoppingCart, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { ProductListItem } from '@/types/api';

interface SearchBarProps {
  inline?: boolean;
}

export function SearchBar({ inline = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchResults = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setTotal(0);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get('/search', {
        params: { q: q.trim(), per_page: 6 },
      });
      const items: ProductListItem[] = data.data ?? [];
      const count: number = data.meta?.total ?? items.length;
      setResults(items);
      setTotal(count);
      setShowDropdown(items.length > 0);
    } catch {
      setResults([]);
      setTotal(0);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    clearTimeout(timerRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      setTotal(0);
      setShowDropdown(false);
      return;
    }
    timerRef.current = setTimeout(() => fetchResults(value), 300);
  };

  const goToSearch = useCallback(() => {
    const q = query.trim();
    if (q.length >= 2) {
      setShowDropdown(false);
      setExpanded(false);
      router.push(`/arama?q=${encodeURIComponent(q)}`);
    }
  }, [query, router]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      goToSearch();
    },
    [goToSearch]
  );

  const handleSelect = () => {
    setShowDropdown(false);
    setExpanded(false);
    setQuery('');
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        if (!inline) setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [inline]);

  // Focus input when expanded
  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  // Cleanup timer
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!inline) setExpanded(false);
        setShowDropdown(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [inline]);

  const dropdownContent = (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-secondary-200 bg-white shadow-xl max-h-[60vh] overflow-y-auto">
      {results.map((p) => (
        <Link
          key={p.id}
          href={`/urun/${p.slug}`}
          onClick={handleSelect}
          className="flex items-center gap-3 px-4 py-3 hover:bg-secondary-50 transition-colors"
        >
          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-secondary-100">
            {p.mainImage ? (
              <Image
                src={p.mainImage}
                alt={p.name}
                fill
                className="object-cover"
                sizes="48px"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-secondary-300">
                <ShoppingCart className="h-4 w-4" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-secondary-900">{p.name}</p>
            <p className="text-xs text-secondary-500">{p.brandName ?? p.categoryName}</p>
          </div>
          <span className="flex-shrink-0 text-sm font-bold text-accent">
            {formatPrice(p.price)}
          </span>
        </Link>
      ))}
      {total > results.length && (
        <button
          type="button"
          onClick={goToSearch}
          className="flex w-full items-center justify-center gap-1 border-t border-secondary-100 py-3 text-sm font-medium text-accent hover:bg-accent-50 transition-colors"
        >
          Tüm sonuçları gör ({total} ürün)
        </button>
      )}
    </div>
  );

  // Inline mode: always-visible search bar
  if (inline) {
    return (
      <div ref={dropdownRef} className="relative w-full">
        <form onSubmit={handleSubmit} className="relative flex">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
              placeholder="Ürün, kategori veya marka ara..."
              className="h-11 w-full rounded-l-lg border border-r-0 border-secondary-300 bg-secondary-50 pl-11 pr-10 text-sm text-secondary-900 placeholder:text-secondary-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-secondary-400" />
            )}
            {!loading && query.length > 0 && (
              <button
                type="button"
                onClick={() => { setQuery(''); setResults([]); setShowDropdown(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="flex h-11 items-center gap-2 rounded-r-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-dark transition-colors flex-shrink-0"
          >
            <Search className="h-4 w-4" />
            <span className="hidden xl:inline">Ara</span>
          </button>
        </form>
        {showDropdown && dropdownContent}
      </div>
    );
  }

  // Icon mode: expands to overlay
  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="p-2 text-secondary-600 hover:text-secondary-900 transition-colors"
        aria-label="Ara"
      >
        <Search className="h-5 w-5" />
      </button>

      {expanded && (
        <div className="fixed inset-x-0 top-0 z-50 bg-white shadow-lg">
          <div className="container-main py-4">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-secondary-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => handleChange(e.target.value)}
                  onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
                  placeholder="Ürün, kategori veya marka ara..."
                  autoFocus
                  className="h-12 w-full rounded-lg border border-secondary-200 bg-secondary-50 pl-12 pr-12 text-sm text-secondary-900 placeholder:text-secondary-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
                />
                {loading && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-secondary-400" />
                )}
                {!loading && query.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setQuery(''); setResults([]); setShowDropdown(false); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setExpanded(false); setShowDropdown(false); }}
                className="p-2 text-secondary-500 hover:text-secondary-700"
                aria-label="Kapat"
              >
                <X className="h-6 w-6" />
              </button>
            </form>
            {showDropdown && (
              <div className="mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-secondary-200 bg-white shadow-lg">
                {results.map((p) => (
                  <Link
                    key={p.id}
                    href={`/urun/${p.slug}`}
                    onClick={handleSelect}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-secondary-50 transition-colors"
                  >
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-secondary-100">
                      {p.mainImage ? (
                        <Image
                          src={p.mainImage}
                          alt={p.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-secondary-300">
                          <ShoppingCart className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-secondary-900">{p.name}</p>
                      <p className="text-xs text-secondary-500">{p.brandName ?? p.categoryName}</p>
                    </div>
                    <span className="flex-shrink-0 text-sm font-bold text-accent">
                      {formatPrice(p.price)}
                    </span>
                  </Link>
                ))}
                {total > results.length && (
                  <button
                    type="button"
                    onClick={goToSearch}
                    className="flex w-full items-center justify-center gap-1 border-t border-secondary-100 py-3 text-sm font-medium text-accent hover:bg-accent-50 transition-colors"
                  >
                    Tüm sonuçları gör ({total} ürün)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
