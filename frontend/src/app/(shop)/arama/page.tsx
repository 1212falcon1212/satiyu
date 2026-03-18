import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { fetchApi } from '@/lib/api-server';
import type { ProductListItem, Brand, Category, PaginatedResponse } from '@/types/api';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductFilterPanel } from '@/components/shop/ProductFilterPanel';
import { Pagination } from '@/components/shop/Pagination';
import { cn } from '@/lib/utils';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

async function fetchProducts(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  if (params.q) qs.set('search', params.q);
  if (params.page) qs.set('page', params.page);
  if (params.brands) qs.set('brand_id', params.brands);
  if (params.category_id) qs.set('category_id', params.category_id);
  if (params.minPrice) qs.set('price_min', params.minPrice);
  if (params.maxPrice) qs.set('price_max', params.maxPrice);
  qs.set('per_page', '20');

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

async function getBrandName(brandId: string, brands: Brand[]): Promise<string | null> {
  const brand = brands.find((b) => String(b.id) === brandId);
  return brand?.name ?? null;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const q = sp.q || '';
  if (q) return { title: `"${q}" arama sonuçları - Giyim Mağazası` };
  if (sp.brands) {
    try {
      const res = await fetchApi<{ data: Brand[] }>('/brands', { revalidate: 3600, tags: ['brands'] });
      const brand = res.data.find((b) => String(b.id) === sp.brands);
      if (brand) return { title: `${brand.name} Ürünleri - Giyim Mağazası` };
    } catch { /* empty */ }
  }
  return { title: 'Arama - Giyim Mağazası' };
}

const sortOptions = [
  { value: '', label: 'Varsayılan' },
  { value: 'price_asc', label: 'Fiyat (Artan)' },
  { value: 'price_desc', label: 'Fiyat (Azalan)' },
  { value: 'newest', label: 'Yeni Eklenen' },
];

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const query = sp.q || '';
  const brandId = sp.brands || '';
  const currentSort = sp.sort || '';
  const hasFilter = query.length >= 2 || brandId || sp.minPrice || sp.maxPrice;

  const [brands, categories] = await Promise.all([getBrands(), getCategories()]);

  if (!hasFilter) {
    let popular: ProductListItem[] = [];
    try {
      const res = await fetchApi<PaginatedResponse<ProductListItem>>(
        '/products?per_page=10&sort=created_at&order=desc',
        { revalidate: 300, tags: ['products'] }
      );
      popular = res.data;
    } catch { /* empty */ }

    return (
      <div className="bg-white min-h-screen">
      <div className="container-main py-6">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Search className="h-16 w-16 text-secondary-300" />
          <h1 className="mt-4 font-display text-xl font-bold text-secondary-900">Ürün Ara</h1>
          <p className="mt-2 text-sm text-secondary-500">
            Aramak istediğiniz ürünü, kategoriyi veya markayı yazın.
          </p>
        </div>
        {popular.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 font-display text-lg font-bold text-secondary-900">Popüler Ürünler</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {popular.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    );
  }

  // Build page title
  let pageTitle = '';
  if (brandId) {
    const brandName = await getBrandName(brandId, brands);
    pageTitle = brandName ? `${brandName} Ürünleri` : 'Marka Ürünleri';
  }
  if (query) {
    pageTitle = `\u201c${query}\u201d için arama sonuçları`;
  }
  if (!pageTitle) {
    pageTitle = 'Arama Sonuçları';
  }

  let results: PaginatedResponse<ProductListItem>;
  try {
    results = await fetchProducts(sp);
  } catch {
    return (
      <div className="container-main py-12 text-center">
        <p className="text-secondary-500">Arama sırasında bir hata oluştu.</p>
      </div>
    );
  }

  function buildSortHref(sortValue: string) {
    const p = new URLSearchParams();
    if (query) p.set('q', query);
    if (brandId) p.set('brands', brandId);
    if (sp.minPrice) p.set('minPrice', sp.minPrice);
    if (sp.maxPrice) p.set('maxPrice', sp.maxPrice);
    if (sortValue) p.set('sort', sortValue);
    return `/arama?${p.toString()}`;
  }

  return (
    <div className="bg-white min-h-screen">
    <div className="container-main py-6">
      <div className="mt-4 lg:flex lg:gap-6">
        {/* Filter sidebar */}
        <ProductFilterPanel brands={brands} categories={categories} />

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="mb-3">
            <h1 className="text-xl font-bold text-secondary-900">{pageTitle}</h1>
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
                href={buildSortHref(opt.value)}
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
              <Search className="h-12 w-12 text-secondary-300" />
              <p className="mt-4 text-lg font-medium text-secondary-900">Sonuç bulunamadı</p>
              <p className="mt-1 text-sm text-secondary-500">
                Farklı anahtar kelimeler veya filtreler deneyebilirsiniz.
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
