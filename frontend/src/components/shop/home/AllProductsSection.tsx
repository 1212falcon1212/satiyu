'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import type { ProductListItem } from '@/types/api';
import { ProductCard } from '../ProductCard';

export function AllProductsSection() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const seedRef = useRef(Math.floor(Math.random() * 999999));

  const PER_PAGE = 36; // 6 cols x 6 rows
  const LOAD_MORE = 12; // 6 cols x 2 rows

  const fetchProducts = useCallback(async (pageNum: number, perPage: number, append: boolean) => {
    setLoading(true);
    try {
      const { data } = await api.get('/homepage/random-products', {
        params: { page: pageNum, per_page: perPage, seed: seedRef.current },
      });
      const items: ProductListItem[] = data.data ?? [];
      const meta = data.meta ?? {};

      if (append) {
        setProducts((prev) => [...prev, ...items]);
      } else {
        setProducts(items);
      }
      setHasMore(meta.has_more ?? false);
      setPage(pageNum);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchProducts(1, PER_PAGE, false);
  }, [fetchProducts]);

  const loadMore = () => {
    if (loading || !hasMore) return;
    // Calculate next page based on items loaded
    const nextOffset = products.length;
    const nextPage = Math.floor(nextOffset / LOAD_MORE) + 1;
    // Fetch next batch
    fetchProducts(nextPage, LOAD_MORE, true);
  };

  if (initialLoading) {
    return (
      <section className="py-4">
        <div className="container-main">
          <div className="rounded-lg border border-secondary-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-secondary-100">
              <div className="h-5 w-32 bg-secondary-200 rounded animate-pulse" />
            </div>
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-secondary-400" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-4">
      <div className="container-main">
        <div className="rounded-lg border border-secondary-200 bg-white overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3 border-b border-secondary-100">
            <h2 className="text-base font-bold text-secondary-900">Tüm Ürünler</h2>
          </div>

          {/* Product grid — 4 columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="border-r border-b border-secondary-100"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center py-4 border-t border-secondary-100">
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg border border-secondary-300 bg-white px-6 py-2.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50 hover:border-secondary-400 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Yükleniyor...
                  </>
                ) : (
                  'Daha Fazla Yükle'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
