import { ProductCardSkeleton } from '@/components/shop/ProductCard';

export default function Loading() {
  return (
    <div className="container-main py-6">
      <div className="mb-4 h-4 w-32 rounded bg-secondary-200 animate-pulse" />
      <div className="mb-6">
        <div className="h-8 w-48 rounded bg-secondary-200 animate-pulse" />
        <div className="mt-2 h-4 w-24 rounded bg-secondary-100 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
