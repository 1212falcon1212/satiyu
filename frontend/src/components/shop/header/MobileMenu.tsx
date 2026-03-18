'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, ChevronDown, ChevronRight, Search, ShoppingCart, User } from 'lucide-react';
import type { Category } from '@/types/api';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart';
import { useSettings } from '@/hooks/useSettings';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
}

function CategoryAccordion({ category, depth = 0, onClose }: { category: Category; depth?: number; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={`/kategori/${category.slug}`}
          onClick={onClose}
          className={cn(
            'flex-1 flex items-center gap-2 py-2.5 text-sm text-secondary-700 hover:text-primary-600 transition-colors',
            depth > 0 && 'text-secondary-600'
          )}
          style={{ paddingLeft: `${depth * 16 + 16}px` }}
        >
          {category.name}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-2.5 text-secondary-400 hover:text-secondary-600"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {category.children!.map((child) => (
            <CategoryAccordion
              key={child.id}
              category={child}
              depth={depth + 1}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MobileMenu({ open, onClose, categories }: MobileMenuProps) {
  const [mounted, setMounted] = useState(false);
  const totalItems = useCartStore((s) => s.totalItems);
  const count = mounted ? totalItems() : 0;
  const settings = useSettings();
  const siteName = settings.general?.site_name || 'Moda';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] transform bg-white shadow-xl transition-transform duration-300 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-secondary-100 px-4 py-3">
            <span className="font-display text-lg font-bold text-primary-900">{siteName}</span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-secondary-500 hover:text-secondary-700"
              aria-label="Kapat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick links */}
          <div className="flex items-center gap-1 border-b border-secondary-100 px-4 py-3">
            <Link
              href="/arama"
              onClick={onClose}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700"
            >
              <Search className="h-4 w-4" /> Ara
            </Link>
            <Link
              href="/sepet"
              onClick={onClose}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700"
            >
              <ShoppingCart className="h-4 w-4" /> Sepet {count > 0 && `(${count})`}
            </Link>
            <Link
              href="/hesabim"
              onClick={onClose}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700"
            >
              <User className="h-4 w-4" /> Hesap
            </Link>
          </div>

          {/* Categories */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary-400">
                Kategoriler
              </p>
            </div>
            <div className="divide-y divide-secondary-50">
              {categories.map((cat) => (
                <CategoryAccordion
                  key={cat.id}
                  category={cat}
                  onClose={onClose}
                />
              ))}
              <div className="flex items-center">
                <Link
                  href="/one-cikanlar"
                  onClick={onClose}
                  className="flex-1 flex items-center gap-2 py-2.5 text-sm font-medium text-accent hover:text-accent-700 transition-colors"
                  style={{ paddingLeft: '16px' }}
                >
                  <span className="text-base leading-none">★</span>
                  Öne Çıkan Ürünler
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
