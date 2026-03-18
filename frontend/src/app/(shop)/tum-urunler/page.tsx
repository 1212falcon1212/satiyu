import type { Metadata } from 'next';
import Link from 'next/link';
import { Package, ChevronRight } from 'lucide-react';
import { fetchApi } from '@/lib/api-server';
import type { ProductListItem, Brand, Category, PaginatedResponse } from '@/types/api';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductFilterPanel } from '@/components/shop/ProductFilterPanel';
import { Pagination } from '@/components/shop/Pagination';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Tüm Ürünler - Giyim Mağazası',
  description: 'Giyim Mağazası\'nın tüm moda ve giyim ürünleri. Geniş ürün yelpazesi uygun fiyatlarla.',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const sortOptions = [
  { value: '', label: 'Varsayılan' },
  { value: 'price_asc', label: 'Fiyat (Artan)' },
  { value: 'price_desc', label: 'Fiyat (Azalan)' },
  { value: 'newest', label: 'En Yeni' },
];

async function fetchAllProducts(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  qs.set('per_page', '20');
  if (params.page) qs.set('page', params.page);
  if (params.brands) qs.set('brand_id', params.brands);
  if (params.minPrice) qs.set('price_min', params.minPrice);
  if (params.maxPrice) qs.set('price_max', params.maxPrice);

  const sort = params.sort || '';
  if (sort === 'price_asc') { qs.set('sort', 'price'); qs.set('order', 'asc'); }
  else if (sort === 'price_desc') { qs.set('sort', 'price'); qs.set('order', 'desc'); }
  else if (sort === 'newest') { qs.set('sort', 'created_at'); qs.set('order', 'desc'); }

  return fetchApi<PaginatedResponse<ProductListItem>>(
    `/products?${qs.toString()}`,
    { revalidate: 60, tags: ['products'] }
  );
}

async function getBrands() {
  try {
    const res = await fetchApi<{ data: Brand[] }>('/brands', { revalidate: 3600, tags: ['brands'] });
    return res.data;
  } catch { return []; }
}

async function getCategories() {
  try {
    const res = await fetchApi<{ data: Category[] }>('/categories', { revalidate: 3600, tags: ['categories'] });
    return res.data;
  } catch { return []; }
}

function buildSortHref(sortValue: string, sp: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  if (sortValue) p.set('sort', sortValue);
  if (sp.brands) p.set('brands', sp.brands);
  if (sp.minPrice) p.set('minPrice', sp.minPrice);
  if (sp.maxPrice) p.set('maxPrice', sp.maxPrice);
  const qs = p.toString();
  return `/tum-urunler${qs ? `?${qs}` : ''}`;
}

export default async function AllProductsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const currentSort = sp.sort || '';

  const [results, brands, categories] = await Promise.all([
    fetchAllProducts(sp).catch(() => null),
    getBrands(),
    getCategories(),
  ]);

  if (!results) {
    return (
      <div className="container-main py-12 text-center">
        <p className="text-secondary-500">Ürünler yüklenirken bir hata oluştu.</p>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
    <div className="container-main py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-sm text-secondary-400">
        <Link href="/" className="hover:text-primary-600 transition-colors">Ana Sayfa</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-secondary-700">Tüm Ürünler</span>
      </nav>

      <div className="mt-4 lg:flex lg:gap-6">
        {/* Filter sidebar */}
        <ProductFilterPanel brands={brands} categories={categories} />

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="mb-3">
            <h1 className="flex items-center gap-2 text-xl font-bold text-secondary-900 lg:text-2xl">
              <Package className="h-6 w-6 text-primary-600" />
              Tüm Ürünler
            </h1>
            <p className="mt-0.5 text-sm text-secondary-500">
              {results.meta.total} ürün bulundu
            </p>
          </div>

          {/* Sort */}
          <div className="mb-4 flex items-center gap-1 overflow-x-auto pb-1">
            <span className="text-xs text-secondary-400 mr-1 shrink-0">Sırala:</span>
            {sortOptions.map((opt) => (
              <Link
                key={opt.value}
                href={buildSortHref(opt.value, sp)}
                className={cn(
                  'whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  currentSort === opt.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                )}
              >
                {opt.label}
              </Link>
            ))}
          </div>

          {results.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-secondary-300" />
              <p className="mt-4 text-lg font-medium text-secondary-900">Ürün bulunamadı</p>
              <p className="mt-1 text-sm text-secondary-500">
                Farklı filtreler deneyebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {results.data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <Pagination
            currentPage={results.meta.current_page}
            lastPage={results.meta.last_page}
            total={results.meta.total}
          />
        </div>
      </div>
    </div>
    </div>
  );
}
