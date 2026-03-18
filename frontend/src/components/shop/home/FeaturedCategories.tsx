'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Category } from '@/types/api';

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || ''
).replace(/\/api$/, '');

function resolveUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

interface FeaturedCategoriesProps {
  categories: Category[];
}

export function FeaturedCategories({ categories }: FeaturedCategoriesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const itemW = el.querySelector('[data-cat-item]')?.clientWidth ?? 100;
    el.scrollBy({
      left: dir === 'left' ? -(itemW + 16) * 3 : (itemW + 16) * 3,
      behavior: 'smooth',
    });
  };

  if (categories.length === 0) return null;

  return (
    <section className="bg-white py-3 border-b border-secondary-100">
      <div className="container-main relative">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md border border-secondary-200 hover:shadow-lg transition-all"
            aria-label="Önceki"
          >
            <ChevronLeft className="h-4 w-4 text-secondary-600" />
          </button>
        )}

        {/* Round category icons — lazimbana style */}
        <div
          ref={scrollRef}
          className="flex items-center justify-center gap-4 sm:gap-6 overflow-x-auto scrollbar-hide scroll-smooth py-1"
        >
          {categories.map((cat) => {
            const imgSrc = resolveUrl(cat.imageUrl);
            return (
              <Link
                key={cat.id}
                href={`/kategori/${cat.slug}`}
                data-cat-item=""
                className="group flex flex-col items-center gap-2 flex-shrink-0"
              >
                {/* Circle image */}
                <div className="relative h-[70px] w-[70px] sm:h-[80px] sm:w-[80px] overflow-hidden rounded-full border-2 border-secondary-200 bg-white transition-all group-hover:border-accent group-hover:shadow-md">
                  {imgSrc ? (
                    <Image
                      src={imgSrc}
                      alt={cat.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                      sizes="80px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary-50">
                      <span className="text-lg font-bold text-secondary-400">
                        {cat.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                {/* Name */}
                <span className="text-center text-[11px] sm:text-xs font-medium text-secondary-600 group-hover:text-accent transition-colors max-w-[80px] line-clamp-1">
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md border border-secondary-200 hover:shadow-lg transition-all"
            aria-label="Sonraki"
          >
            <ChevronRight className="h-4 w-4 text-secondary-600" />
          </button>
        )}
      </div>
    </section>
  );
}
