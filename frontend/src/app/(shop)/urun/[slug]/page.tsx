import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchApi } from '@/lib/api-server';
import type { Product, ProductListItem, PaginatedResponse } from '@/types/api';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/breadcrumb';
import { ProductDetailClient } from '@/components/shop/product/ProductDetailClient';
import { SimilarProducts } from '@/components/shop/product/SimilarProducts';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string): Promise<Product> {
  const res = await fetchApi<{ data: Product }>(`/products/${slug}`, {
    revalidate: 300,
    tags: ['products', `product-${slug}`],
  });
  return res.data;
}

async function getSimilarProducts(categoryId: number, excludeId: number): Promise<ProductListItem[]> {
  try {
    const res = await fetchApi<PaginatedResponse<ProductListItem>>(
      `/products?category_id=${categoryId}&per_page=5&exclude=${excludeId}`,
      { revalidate: 600, tags: ['products'] }
    );
    return res.data;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await getProduct(slug);
    const image = product.images.find((i) => i.isMain) || product.images[0];

    return {
      title: product.metaTitle || `${product.name} - Giyim Mağazası`,
      description: product.metaDescription || product.shortDescription || product.name,
      openGraph: {
        title: product.name,
        description: product.shortDescription || product.name,
        images: image ? [{ url: image.imageUrl, alt: image.altText || product.name }] : [],
      },
    };
  } catch {
    return { title: 'Ürün - Giyim Mağazası' };
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  let product: Product;
  try {
    product = await getProduct(slug);
  } catch {
    notFound();
  }

  const similarProducts = product.categoryId
    ? await getSimilarProducts(product.categoryId, product.id)
    : [];

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Ana Sayfa', href: '/' },
  ];
  if (product.category) {
    breadcrumbItems.push({
      label: product.category.name,
      href: `/kategori/${product.category.slug}`,
    });
  }
  breadcrumbItems.push({ label: product.name });

  // JSON-LD structured data
  const mainImage = product.images.find((i) => i.isMain) || product.images[0];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description || product.name,
    image: mainImage?.imageUrl,
    sku: product.sku,
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency || 'TRY',
      availability: product.stockQuantity > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="container-main py-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="mt-6">
        <ProductDetailClient product={product} productSlug={slug} />
      </div>

      <SimilarProducts products={similarProducts} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
