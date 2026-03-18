'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag } from 'lucide-react';
import { useCustomerAuthStore } from '@/store/customer-auth';
import { ProductCard, ProductCardSkeleton } from '@/components/shop/ProductCard';
import api from '@/lib/api';
import type { ProductListItem } from '@/types/api';

export default function FavoritesPage() {
  const { customer, token } = useCustomerAuthStore();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer || !token) return;

    const fetchFavorites = async () => {
      try {
        const { data } = await api.get('/customer/favorites', {
          headers: { Authorization: `Bearer ${token}` },
          params: { per_page: 50 },
        });
        setProducts(data.data ?? []);
      } catch {
        // Keep empty on failure
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [customer, token]);

  if (!customer) return null;

  return (
    <div>
      <h1 className="text-xl font-bold text-secondary-900 sm:text-2xl">Favorilerim</h1>
      <p className="mt-1 text-sm text-secondary-500">Beğendiğiniz ürünleri burada görüntüleyebilirsiniz.</p>

      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-secondary-200 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <Heart className="h-8 w-8 text-red-300" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-secondary-900">
              Henüz favoriniz yok
            </h2>
            <p className="mt-1 text-sm text-secondary-500">
              Beğendiğiniz ürünleri kalp ikonuna tıklayarak favorilerinize ekleyin.
            </p>
            <Link
              href="/tum-urunler"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              Alışverişe Başla
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
