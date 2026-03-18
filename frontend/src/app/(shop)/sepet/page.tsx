'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Trash2, ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { useCustomerAuthStore } from '@/store/customer-auth';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { QuantityPicker } from '@/components/shop/product/QuantityPicker';
import { useSettings } from '@/hooks/useSettings';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const totalItems = useCartStore((s) => s.totalItems);
  const syncWithServer = useCartStore((s) => s.syncWithServer);
  const customer = useCustomerAuthStore((s) => s.customer);

  useEffect(() => {
    syncWithServer();
  }, [syncWithServer]);

  const settings = useSettings();
  const freeShippingLimit = parseFloat(settings.shipping?.free_shipping_limit ?? '500');
  const defaultShippingCost = parseFloat(settings.shipping?.default_shipping_cost ?? '0');

  const subtotal = totalPrice();
  const shippingFree = subtotal >= freeShippingLimit;
  const shippingCost = shippingFree ? 0 : defaultShippingCost;
  const total = subtotal + shippingCost;

  if (items.length === 0) {
    return (
      <div className="container-main flex flex-col items-center justify-center py-20 text-center">
        <ShoppingCart className="h-20 w-20 text-secondary-200" />
        <h1 className="mt-6 text-2xl font-bold text-secondary-900">Sepetiniz Boş</h1>
        <p className="mt-2 text-secondary-500">
          Henüz sepetinize ürün eklemediniz.
        </p>
        <Link href="/" className="mt-6">
          <Button>
            <ShoppingBag className="h-4 w-4" />
            Alışverişe Başla
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-main py-6">
      <h1 className="text-2xl font-bold text-secondary-900">
        Sepetim ({totalItems()} ürün)
      </h1>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Cart items */}
        <div className="flex-1 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 rounded-xl border border-secondary-200 bg-white p-4"
            >
              {/* Image */}
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-secondary-50">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-secondary-300">
                    <ShoppingCart className="h-8 w-8" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/urun/${item.id}`}
                  className="text-sm font-medium text-secondary-900 hover:text-primary-600 transition-colors line-clamp-2"
                >
                  {item.name}
                </Link>

                {item.variantInfo && Object.keys(item.variantInfo).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.entries(item.variantInfo).map(([key, val]) => (
                      <span
                        key={key}
                        className="rounded bg-secondary-100 px-1.5 py-0.5 text-xs text-secondary-600"
                      >
                        {key}: {val}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <QuantityPicker
                    value={item.quantity}
                    onChange={(q) => updateQuantity(item.id, q)}
                    className="scale-90 origin-left"
                  />

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-secondary-900">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-secondary-400 hover:text-danger transition-colors"
                      aria-label="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Alışverişe Devam Et
          </Link>
        </div>

        {/* Order summary */}
        <div className="w-full lg:w-80">
          <div className="sticky top-32 rounded-xl border border-secondary-200 bg-white p-5">
            <h2 className="text-lg font-bold text-secondary-900">Sipariş Özeti</h2>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary-600">Ara Toplam</span>
                <span className="font-medium text-secondary-900">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600">Kargo</span>
                <span className="font-medium text-secondary-900">
                  {shippingFree ? (
                    <span className="text-success">Ücretsiz</span>
                  ) : (
                    formatPrice(shippingCost)
                  )}
                </span>
              </div>
              {!shippingFree && (
                <p className="text-xs text-secondary-400">
                  {formatPrice(freeShippingLimit - subtotal)} daha ekleyin, ücretsiz kargo kazanın!
                </p>
              )}
            </div>

            <div className="mt-4 border-t border-secondary-100 pt-4">
              <div className="flex justify-between">
                <span className="font-bold text-secondary-900">Toplam</span>
                <span className="text-lg font-bold text-primary-600">{formatPrice(total)}</span>
              </div>
            </div>

            <Link href={customer ? '/siparis' : '/giris?redirect=/siparis'} className="block mt-4">
              <Button className="w-full" size="lg">
                {customer ? 'Siparişi Tamamla' : 'Giriş Yap ve Devam Et'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
