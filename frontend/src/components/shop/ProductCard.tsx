'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Heart, Eye } from 'lucide-react';
import type { ProductListItem } from '@/types/api';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCartStore } from '@/store/cart';
import { FavoriteButton } from './FavoriteButton';

interface ProductCardProps {
  product: ProductListItem;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const discount = product.comparePrice
    ? calculateDiscount(product.price, product.comparePrice)
    : 0;

  const isOutOfStock =
    product.stockQuantity <= 0 ||
    product.stockStatus === 'out_of_stock' ||
    product.price <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      comparePrice: product.comparePrice ?? undefined,
      quantity: 1,
      image: product.mainImage ?? undefined,
    });
  };

  return (
    <Link
      href={`/urun/${product.slug}`}
      className={`group flex flex-col bg-white transition-shadow hover:shadow-lg ${isOutOfStock ? 'opacity-60' : ''}`}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-white">
        {product.mainImage ? (
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            className="object-contain transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-secondary-200">
            <ShoppingCart className="h-12 w-12" />
          </div>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <Badge variant="default" className="text-xs">Stokta Yok</Badge>
          </div>
        )}

        {/* Discount badge - round */}
        {discount > 0 && !isOutOfStock && (
          <div className="absolute left-2 top-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
              -%{discount}
            </span>
          </div>
        )}

        {/* New badge */}
        {product.isNew && !isOutOfStock && !discount && (
          <div className="absolute left-2 top-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-900 text-[10px] font-bold text-white">
              Yeni
            </span>
          </div>
        )}

        {/* Hover action icons - slide up */}
        {!isOutOfStock && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 group-hover:animate-slide-up">
            <FavoriteButton productId={product.id} size="sm" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md text-secondary-600 hover:text-accent hover:bg-accent-50 transition-colors" />
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md text-secondary-600 hover:text-accent hover:bg-accent-50 transition-colors"
              aria-label="Sepete ekle"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md text-secondary-600 hover:text-accent hover:bg-accent-50 transition-colors">
              <Eye className="h-4 w-4" />
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex w-full flex-col px-2 pb-4 pt-3">
        {product.categoryName && (
          <span className="text-[10px] font-medium text-secondary-400 sm:text-[11px]">
            {product.categoryName}
          </span>
        )}
        <h3 className="mt-0.5 line-clamp-2 text-sm text-secondary-800 group-hover:text-accent transition-colors sm:text-[15px]">
          {product.name}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          {product.comparePrice && product.comparePrice > product.price && (
            <span className="text-xs text-secondary-400 line-through">
              {formatPrice(product.comparePrice)}
            </span>
          )}
          <span className={`text-sm font-bold sm:text-base ${product.comparePrice && product.comparePrice > product.price ? 'text-accent' : 'text-accent'}`}>
            {formatPrice(product.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col bg-white">
      <Skeleton className="aspect-[3/4] w-full" />
      <div className="mt-3 space-y-2 px-2 w-full">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-1 h-5 w-20" />
      </div>
    </div>
  );
}
