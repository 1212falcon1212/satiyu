'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, X, Trash2 } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function MiniCart() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = useCartStore((s) => s.items);
  const totalItems = useCartStore((s) => s.totalItems);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const removeItem = useCartStore((s) => s.removeItem);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const count = mounted ? totalItems() : 0;
  const price = mounted ? totalPrice() : 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-2 p-2 text-secondary-600 hover:text-secondary-900 transition-colors"
        aria-label="Sepet"
      >
        <div className="relative">
          <ShoppingCart className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </div>
        {count > 0 && (
          <span className="hidden sm:block text-xs font-semibold text-secondary-900">
            {formatPrice(price)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-secondary-200 bg-white shadow-xl z-50">
          <div className="flex items-center justify-between border-b border-secondary-100 px-4 py-3">
            <span className="text-sm font-semibold text-secondary-900">
              Sepetim ({count})
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-secondary-400 hover:text-secondary-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!mounted || items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-secondary-500">
              Sepetiniz boş
            </div>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto">
                {items.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 border-b border-secondary-50 px-4 py-3 last:border-0"
                  >
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-secondary-100">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="h-full w-full bg-secondary-200" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-secondary-900">
                        {item.name}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {item.quantity} x {formatPrice(item.price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="flex-shrink-0 p-1 text-secondary-400 hover:text-danger transition-colors"
                      aria-label="Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-secondary-100 px-4 py-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-secondary-600">Toplam</span>
                  <span className="text-sm font-bold text-secondary-900">
                    {formatPrice(totalPrice())}
                  </span>
                </div>
                <Link href="/sepet" onClick={() => setOpen(false)}>
                  <Button className="w-full bg-accent hover:bg-accent-600 text-white" size="sm">
                    Sepete Git
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
