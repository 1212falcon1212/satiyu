'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useFavoritesStore } from '@/store/favorites';
import { useCustomerAuthStore } from '@/store/customer-auth';

interface FavoriteButtonProps {
  productId: number;
  className?: string;
  size?: 'sm' | 'md';
}

export function FavoriteButton({ productId, className = '', size = 'sm' }: FavoriteButtonProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const toggle = useFavoritesStore((s) => s.toggle);
  const ids = useFavoritesStore((s) => s.ids);
  const customer = useCustomerAuthStore((s) => s.customer);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const favorited = ids.includes(productId);

  const sizeClasses = size === 'sm'
    ? 'h-8 w-8'
    : 'h-10 w-10';

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!customer) {
      const redirect = typeof window !== 'undefined' ? window.location.pathname : '/';
      router.push(`/giris?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    toggle(productId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur-sm transition-colors hover:bg-white ${sizeClasses} ${className}`}
      aria-label={favorited ? 'Favorilerden çıkar' : 'Favorilere ekle'}
    >
      <Heart
        className={`${iconSize} transition-colors ${
          favorited
            ? 'fill-red-500 text-red-500'
            : 'text-secondary-300 hover:text-red-400'
        }`}
      />
    </button>
  );
}
