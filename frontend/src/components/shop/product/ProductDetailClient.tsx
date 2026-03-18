'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingCart, Check, Truck, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Product, ProductVariant } from '@/types/api';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsPanel } from '@/components/ui/tabs';
import { VariantSelector } from './VariantSelector';
import { QuantityPicker } from './QuantityPicker';
import { ProductGallery } from './ProductGallery';
import { ProductReviews } from './ProductReviews';
import { useCartStore } from '@/store/cart';
import { useSettings } from '@/hooks/useSettings';
import { FavoriteButton } from '@/components/shop/FavoriteButton';
import { InstallmentTable } from './InstallmentTable';

interface ProductDetailClientProps {
  product: Product;
  productSlug: string;
}

export function ProductDetailClient({ product, productSlug }: ProductDetailClientProps) {
  const addItem = useCartStore((s) => s.addItem);
  const settings = useSettings();
  const freeShippingLimit = settings.shipping?.free_shipping_limit ?? '500';
  const havaleEnabled = settings.payment?.bank_transfer_enabled === 'true';
  const havaleRate = parseFloat(settings.payment?.havale_discount_rate ?? '0');

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants.length > 0
      ? product.variants.find((v) => v.isActive && v.stockQuantity > 0) || product.variants[0]
      : null
  );
  const [quantity, setQuantity] = useState(1);

  const activePrice = selectedVariant?.price ?? product.price;
  const activeComparePrice = selectedVariant?.comparePrice ?? product.comparePrice;
  const activeStock = selectedVariant?.stockQuantity ?? product.stockQuantity;
  const activeSku = selectedVariant?.sku ?? product.sku;
  const discount = activeComparePrice ? calculateDiscount(activePrice, activeComparePrice) : 0;

  const descRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const imgs = node.querySelectorAll('img');
    imgs.forEach((img) => {
      img.onerror = () => { img.style.display = 'none'; };
      if (img.complete && img.naturalWidth === 0) { img.style.display = 'none'; }
    });
  }, []);

  const galleryImages = useMemo(() => {
    if (selectedVariant?.images && selectedVariant.images.length > 0) {
      return selectedVariant.images;
    }
    return product.images;
  }, [selectedVariant, product.images]);

  const handleAddToCart = () => {
    const variantInfo: Record<string, string> = {};
    if (selectedVariant) {
      for (const vv of selectedVariant.variantValues) {
        variantInfo[vv.typeName] = vv.optionValue;
      }
    }

    addItem({
      productId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      price: activePrice,
      comparePrice: activeComparePrice ?? undefined,
      quantity,
      image: galleryImages[0]?.imageUrl,
      sku: activeSku ?? undefined,
      variantInfo: Object.keys(variantInfo).length > 0 ? variantInfo : undefined,
    });

    toast.success('Ürün sepete eklendi', {
      description: `${product.name} x${quantity}`,
    });
  };

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery - WoodMart style with left thumbnails */}
        <ProductGallery images={galleryImages} productName={product.name} />

        {/* Details */}
        <div>
          {/* Breadcrumb-like category link */}
          {product.category && (
            <Link
              href={`/kategori/${product.category.slug}`}
              className="inline-block text-xs font-medium text-secondary-400 uppercase tracking-wider hover:text-accent transition-colors"
            >
              {product.category.name}
            </Link>
          )}

          {/* Name */}
          <h1 className="mt-2 text-2xl font-bold text-secondary-900 lg:text-3xl leading-tight">
            {product.name}
          </h1>

          {/* Brand */}
          {product.brand && (
            <Link
              href={`/arama?brands=${product.brand.id}`}
              className="mt-1 inline-block text-sm text-secondary-500 hover:text-accent transition-colors"
            >
              {product.brand.name}
            </Link>
          )}

          {/* Short description */}
          {product.shortDescription && (
            <p className="mt-4 text-sm text-secondary-600 leading-relaxed">
              {product.shortDescription}
            </p>
          )}

          {/* Price */}
          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-accent">{formatPrice(activePrice)}</span>
            {activeComparePrice && activeComparePrice > activePrice && (
              <span className="text-lg text-secondary-400 line-through">{formatPrice(activeComparePrice)}</span>
            )}
            {discount > 0 && (
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-white">
                -%{discount}
              </span>
            )}
          </div>

          {/* Havale price */}
          {havaleEnabled && havaleRate > 0 && activeStock > 0 && (
            <p className="mt-1 text-sm font-medium text-secondary-600">
              Havale ile <span className="font-bold text-secondary-900">{formatPrice(activePrice * (1 - havaleRate / 100))}</span>
            </p>
          )}

          {/* Divider */}
          <div className="my-5 border-t border-secondary-100" />

          {/* Variants */}
          {product.variants.length > 0 && (
            <div className="mb-5">
              <VariantSelector
                variants={product.variants}
                selected={selectedVariant}
                onSelect={setSelectedVariant}
              />
            </div>
          )}

          {/* Quantity + Add to cart */}
          <div className="flex items-center gap-3">
            <QuantityPicker
              value={quantity}
              onChange={setQuantity}
              max={activeStock}
            />
            <Button
              onClick={handleAddToCart}
              disabled={activeStock <= 0}
              size="lg"
              className="flex-1 min-w-0 bg-accent hover:bg-accent-600 text-white text-sm sm:text-base uppercase tracking-wider font-semibold"
            >
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="truncate">Sepete Ekle</span>
            </Button>
          </div>

          {/* Wishlist + Share row */}
          <div className="mt-4 flex items-center gap-4 border-b border-secondary-100 pb-5">
            <FavoriteButton productId={product.id} size="md" className="!bg-transparent !shadow-none" />
            <span className="text-sm text-secondary-500">Favorilere Ekle</span>
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: product.name, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link kopyalandı');
                }
              }}
              className="ml-auto flex items-center gap-2 text-secondary-500 hover:text-secondary-700 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              <span className="text-sm">Paylaş</span>
            </button>
          </div>

          {/* Meta info */}
          <div className="mt-4 space-y-2 text-sm">
            {activeSku && (
              <p className="text-secondary-500">
                <span className="font-medium text-secondary-700">SKU:</span> {activeSku}
              </p>
            )}
            {product.category && (
              <p className="text-secondary-500">
                <span className="font-medium text-secondary-700">Kategori:</span>{' '}
                <Link href={`/kategori/${product.category.slug}`} className="hover:text-accent transition-colors">
                  {product.category.name}
                </Link>
              </p>
            )}
            {product.brand && (
              <p className="text-secondary-500">
                <span className="font-medium text-secondary-700">Marka:</span>{' '}
                <Link href={`/arama?brands=${product.brand.id}`} className="hover:text-accent transition-colors">
                  {product.brand.name}
                </Link>
              </p>
            )}
          </div>

          {/* Stock + Shipping */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center gap-2">
              {activeStock > 0 ? (
                <>
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm text-success font-medium">Stokta var</span>
                  {activeStock <= 5 && (
                    <span className="text-xs text-warning font-medium">— Son {activeStock} ürün!</span>
                  )}
                </>
              ) : (
                <span className="text-sm text-danger font-medium">Stokta yok</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-secondary-500">
              <Truck className="h-4 w-4" />
              <span className="text-xs">
                {freeShippingLimit} TL ve üzeri siparişlerde <span className="font-semibold text-secondary-700">ücretsiz kargo</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — WoodMart style */}
      <div className="mt-14">
        <Tabs defaultValue="description">
          <TabsList className="flex w-full justify-center gap-0 overflow-x-auto border-b-2 border-secondary-200 bg-transparent p-0 scrollbar-hide">
            <TabsTrigger
              value="description"
              className="relative flex-shrink-0 bg-transparent px-4 py-4 text-sm font-bold uppercase tracking-wider text-secondary-400 shadow-none hover:text-secondary-700 sm:px-8 data-[state=active]:text-secondary-900 data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:after:absolute data-[state=active]:after:bottom-[-2px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[3px] data-[state=active]:after:bg-accent rounded-none border-none"
            >
              Açıklama
            </TabsTrigger>
            <TabsTrigger
              value="attributes"
              className="relative flex-shrink-0 bg-transparent px-4 py-4 text-sm font-bold uppercase tracking-wider text-secondary-400 shadow-none hover:text-secondary-700 sm:px-8 data-[state=active]:text-secondary-900 data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:after:absolute data-[state=active]:after:bottom-[-2px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[3px] data-[state=active]:after:bg-accent rounded-none border-none"
            >
              Özellikler
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="relative flex-shrink-0 bg-transparent px-4 py-4 text-sm font-bold uppercase tracking-wider text-secondary-400 shadow-none hover:text-secondary-700 sm:px-8 data-[state=active]:text-secondary-900 data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:after:absolute data-[state=active]:after:bottom-[-2px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[3px] data-[state=active]:after:bg-accent rounded-none border-none"
            >
              Yorumlar{product.reviewStats?.count ? ` (${product.reviewStats.count})` : ''}
            </TabsTrigger>
            {/* <TabsTrigger
              value="installments"
              className="relative flex-shrink-0 bg-transparent px-4 py-4 text-sm font-bold uppercase tracking-wider text-secondary-400 shadow-none hover:text-secondary-700 sm:px-8 data-[state=active]:text-secondary-900 data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:after:absolute data-[state=active]:after:bottom-[-2px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[3px] data-[state=active]:after:bg-accent rounded-none border-none"
            >
              Taksitler
            </TabsTrigger> */}
          </TabsList>

          <div className="mx-auto max-w-4xl py-8">
            <TabsPanel value="description">
              {product.description ? (
                <div
                  ref={descRef}
                  className="prose max-w-none text-secondary-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              ) : (
                <p className="text-sm text-secondary-500">Açıklama bulunmuyor.</p>
              )}
            </TabsPanel>

            <TabsPanel value="attributes">
              {product.attributes.length > 0 ? (
                <table className="w-full text-sm">
                  <tbody>
                    {product.attributes.map((attr, i) => (
                      <tr key={attr.id} className={i % 2 === 0 ? 'bg-secondary-50' : 'bg-white'}>
                        <td className="px-4 py-3 font-semibold text-secondary-700 w-1/3">{attr.name}</td>
                        <td className="px-4 py-3 text-secondary-900">{attr.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-secondary-500">Özellik bilgisi bulunmuyor.</p>
              )}
            </TabsPanel>

            <TabsPanel value="reviews">
              <ProductReviews productSlug={productSlug} />
            </TabsPanel>

            {/* <TabsPanel value="installments">
              <InstallmentTable price={activeComparePrice && activeComparePrice > activePrice ? activeComparePrice : activePrice} />
            </TabsPanel> */}
          </div>
        </Tabs>
      </div>
    </>
  );
}
