'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Category } from '@/types/api';
import { getCategoryIconPath } from '@/lib/category-icons';

interface CategoryNavProps {
  categories: Category[];
}

function CategoryIcon({ slug, className, invert }: { slug: string; className?: string; invert?: boolean }) {
  const src = getCategoryIconPath(slug);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      className={className}
      style={invert ? { filter: 'brightness(0) invert(1)' } : undefined}
      loading="lazy"
    />
  );
}

export function CategoryNav({ categories }: CategoryNavProps) {
  const [openId, setOpenId] = useState<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const roots = categories
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const clearOpenTimer = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  const open = useCallback(
    (id: number) => {
      clearCloseTimer();
      clearOpenTimer();
      openTimer.current = setTimeout(() => setOpenId(id), 150);
    },
    [clearCloseTimer, clearOpenTimer]
  );

  const scheduleClose = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpenId(null), 200);
  }, [clearCloseTimer, clearOpenTimer]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
      clearOpenTimer();
    };
  }, [clearCloseTimer, clearOpenTimer]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  if (roots.length === 0) return null;

  const activeCategory = roots.find((c) => c.id === openId);
  const children = activeCategory?.children ?? [];

  return (
    <nav
      ref={navRef}
      className="sticky top-16 md:top-[72px] z-20 hidden border-b border-secondary-100 bg-white md:block"
    >
      <div className="mx-auto max-w-7xl px-2">
        <ul className="flex items-stretch justify-center gap-1">
          {roots.map((cat) => {
            const isOpen = openId === cat.id;

            return (
              <li key={cat.id} className="flex">
                <Link
                  href={`/kategori/${cat.slug}`}
                  className={`
                    flex items-center gap-1.5 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors
                    lg:text-[13px]
                    ${isOpen
                      ? 'border-b-2 border-primary-900 text-primary-900'
                      : 'border-b-2 border-transparent text-secondary-600 hover:text-primary-900'
                    }
                  `}
                  onMouseEnter={() => open(cat.id)}
                  onMouseLeave={scheduleClose}
                >
                  <CategoryIcon slug={cat.slug} className="h-5 w-5 object-contain" />
                  <span>{cat.name}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex">
            <Link
              href="/one-cikanlar"
              className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 border-transparent text-accent hover:text-accent-700 transition-colors lg:text-[13px]"
              onMouseEnter={scheduleClose}
            >
              <span className="text-sm leading-none">&#9733;</span>
              <span>Trend</span>
            </Link>
          </li>
        </ul>
      </div>

      {/* Dropdown Panel */}
      {openId !== null && children.length > 0 && (
        <div
          className="absolute inset-x-0 top-full z-50 border-t border-secondary-100 bg-white shadow-lg"
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
        >
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
              {children.map((child) => (
                <Link
                  key={child.id}
                  href={`/kategori/${child.slug}`}
                  onClick={() => setOpenId(null)}
                  className="group flex flex-col items-center gap-2 rounded-lg p-2 text-center transition-colors hover:bg-secondary-50"
                >
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-secondary-200 bg-secondary-50 transition-colors group-hover:border-accent-300 group-hover:bg-accent-50">
                    <CategoryIcon slug={child.slug} className="h-9 w-9 object-contain" />
                  </div>
                  <span className="text-xs font-medium leading-tight text-secondary-700 group-hover:text-primary-900">
                    {child.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
