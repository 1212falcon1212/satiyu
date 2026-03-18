'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useFavoritesStore } from '@/store/favorites';
import { useCustomerAuthStore } from '@/store/customer-auth';

export function HeaderFavorites() {
  const [mounted, setMounted] = useState(false);
  const ids = useFavoritesStore((s) => s.ids);
  const customer = useCustomerAuthStore((s) => s.customer);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !customer) return null;

  const count = ids.length;

  return (
    <Link
      href="/hesabim/favorilerim"
      className="relative flex items-center justify-center p-2 text-secondary-600 hover:text-secondary-900 transition-colors"
      aria-label="Favorilerim"
    >
      <Heart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary-900 px-1 text-[10px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
