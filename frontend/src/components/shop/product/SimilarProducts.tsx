import type { ProductListItem } from '@/types/api';
import { ProductCard } from '@/components/shop/ProductCard';

interface SimilarProductsProps {
  products: ProductListItem[];
}

export function SimilarProducts({ products }: SimilarProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="mt-12 bg-white rounded-2xl p-6">
      <h2 className="mb-6 text-xl font-bold text-secondary-900">Benzer Ürünler</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {products.slice(0, 5).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
