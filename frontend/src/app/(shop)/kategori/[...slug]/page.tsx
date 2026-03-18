import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-server';
import type { CategoryDetailResponse, Brand } from '@/types/api';
import { ProductCard } from '@/components/shop/ProductCard';
import { Pagination } from '@/components/shop/Pagination';
import { FilterPanel } from '@/components/shop/category/FilterPanel';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import { LayoutGrid, Grid3X3, Grid2X2 } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

async function getCategoryData(slug: string, searchParams: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  if (searchParams.page) qs.set('page', searchParams.page);
  if (searchParams.sort) qs.set('sort', searchParams.sort);
  if (searchParams.brands) qs.set('brands', searchParams.brands);
  if (searchParams.minPrice) qs.set('min_price', searchParams.minPrice);
  if (searchParams.maxPrice) qs.set('max_price', searchParams.maxPrice);
  if (searchParams.per_page) qs.set('per_page', searchParams.per_page);
  else qs.set('per_page', '20');

  const query = qs.toString();
  const path = `/categories/${slug}${query ? `?${query}` : ''}`;

  const res = await fetchApi<CategoryDetailResponse>(path, {
    revalidate: 300,
    tags: ['categories', `category-${slug}`],
  });
  return res.data;
}

async function getBrands() {
  try {
    const res = await fetchApi<{ data: Brand[] }>('/brands', {
      revalidate: 3600,
      tags: ['brands'],
    });
    return res.data;
  } catch {
    return [];
  }
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const lastSlug = slug[slug.length - 1];

  try {
    const data = await getCategoryData(lastSlug, {});
    const title = data.category.metaTitle || `${data.category.name} - Giyim Mağazası`;
    const description = data.category.metaDescription || data.category.description || `${data.category.name} kategorisindeki ürünler`;
    const url = `${SITE_URL}/kategori/${slug.join('/')}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        type: 'website',
        siteName: 'Giyim Mağazası',
        ...(data.category.imageUrl && { images: [{ url: data.category.imageUrl }] }),
      },
    };
  } catch {
    return { title: 'Kategori - Giyim Mağazası' };
  }
}

const sortOptions = [
  { value: '', label: 'Varsayılan' },
  { value: 'price_asc', label: 'Fiyat (Artan)' },
  { value: 'price_desc', label: 'Fiyat (Azalan)' },
  { value: 'newest', label: 'Yeni Eklenen' },
  { value: 'bestseller', label: 'Çok Satan' },
];

const perPageOptions = [9, 12, 18, 24];

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const lastSlug = slug[slug.length - 1];

  let data;
  try {
    data = await getCategoryData(lastSlug, sp);
  } catch {
    notFound();
  }

  const brands = await getBrands();
  const { category, children: subcategories, ancestors, products } = data;
  const currentSort = sp.sort || '';
  const currentPage = products.meta.current_page;
  const currentPerPage = sp.per_page || '20';
  const currentCols = sp.cols || '3';

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (overrides.sort ?? sp.sort) params.set('sort', (overrides.sort ?? sp.sort)!);
    if (sp.brands) params.set('brands', sp.brands);
    if (sp.minPrice) params.set('minPrice', sp.minPrice);
    if (sp.maxPrice) params.set('maxPrice', sp.maxPrice);
    if (overrides.per_page ?? sp.per_page) params.set('per_page', (overrides.per_page ?? sp.per_page)!);
    if (overrides.cols ?? sp.cols) params.set('cols', (overrides.cols ?? sp.cols)!);
    const qs = params.toString();
    return `/kategori/${lastSlug}${qs ? `?${qs}` : ''}`;
  }

  const gridColsClass = {
    '2': 'grid-cols-2',
    '3': 'grid-cols-2 sm:grid-cols-3',
    '4': 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4',
  }[currentCols] || 'grid-cols-2 sm:grid-cols-3';

  return (
    <div className="bg-white min-h-screen">
      <div className="container-main py-6">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Ana Sayfa', href: '/' },
            ...ancestors.map((a) => ({ label: a.name, href: `/kategori/${a.slug}` })),
            { label: category.name },
          ]}
        />

        <div className="mt-4 lg:flex lg:gap-6">
          {/* Filter sidebar */}
          <FilterPanel
            category={category}
            subcategories={subcategories}
            ancestors={ancestors}
            brands={brands}
          />

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Title */}
            <h1 className="text-xl font-bold text-secondary-900 lg:text-2xl">
              {category.name}
            </h1>

            {/* Toolbar */}
            <div className="mt-3 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-secondary-100 pb-3">
              <div className="flex items-center gap-3">
                {/* Grid view switcher */}
                <div className="hidden sm:flex items-center gap-1 border border-secondary-200 rounded-sm">
                  {(['2', '3', '4'] as const).map((cols) => (
                    <Link
                      key={cols}
                      href={buildUrl({ cols })}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center transition-colors',
                        currentCols === cols
                          ? 'bg-secondary-900 text-white'
                          : 'text-secondary-400 hover:text-secondary-700'
                      )}
                    >
                      {cols === '2' && <Grid2X2 className="h-4 w-4" />}
                      {cols === '3' && <Grid3X3 className="h-4 w-4" />}
                      {cols === '4' && <LayoutGrid className="h-4 w-4" />}
                    </Link>
                  ))}
                </div>

                <span className="text-sm text-secondary-500">
                  {products.meta.total} ürün
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Sort */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary-400 shrink-0">Sırala:</span>
                  <div className="flex gap-1 overflow-x-auto">
                    {sortOptions.map((opt) => (
                      <Link
                        key={opt.value}
                        href={buildUrl({ sort: opt.value || undefined })}
                        className={cn(
                          'whitespace-nowrap rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
                          currentSort === opt.value
                            ? 'bg-secondary-900 text-white'
                            : 'border border-secondary-200 text-secondary-600 hover:border-secondary-300'
                        )}
                      >
                        {opt.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Per page */}
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs text-secondary-400 shrink-0">Göster:</span>
                  <div className="flex gap-1">
                    {perPageOptions.map((pp) => (
                      <Link
                        key={pp}
                        href={buildUrl({ per_page: String(pp) })}
                        className={cn(
                          'h-7 min-w-[1.75rem] flex items-center justify-center rounded-sm text-xs font-medium transition-colors',
                          String(pp) === currentPerPage
                            ? 'bg-secondary-900 text-white'
                            : 'border border-secondary-200 text-secondary-600 hover:border-secondary-300'
                        )}
                      >
                        {pp}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Subcategory chips */}
            {subcategories.length > 0 && (
              <div className="mb-4 hidden flex-wrap gap-2 lg:flex">
                {subcategories.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/kategori/${sub.slug}`}
                    className="rounded-sm border border-secondary-200 bg-white px-3 py-1.5 text-xs font-medium text-secondary-700 hover:border-accent hover:text-accent transition-colors"
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Product grid */}
            {products.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-lg font-medium text-secondary-900">Ürün bulunamadı</p>
                <p className="mt-1 text-sm text-secondary-500">
                  Farklı filtreler deneyebilir veya diğer kategorilere göz atabilirsiniz.
                </p>
              </div>
            ) : (
              <div className={`grid gap-3 sm:gap-4 ${gridColsClass}`}>
                {products.data.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              lastPage={products.meta.last_page}
              total={products.meta.total}
            />
          </div>
        </div>

        {/* BreadcrumbList JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: SITE_URL },
                ...ancestors.map((a, i) => ({
                  '@type': 'ListItem',
                  position: i + 2,
                  name: a.name,
                  item: `${SITE_URL}/kategori/${a.slug}`,
                })),
                {
                  '@type': 'ListItem',
                  position: ancestors.length + 2,
                  name: category.name,
                  item: `${SITE_URL}/kategori/${lastSlug}`,
                },
              ],
            }),
          }}
        />
      </div>
    </div>
  );
}
