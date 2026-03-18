'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Category } from '@/types/api';
import { storageUrl } from '@/lib/utils';

interface CategoryNavBarProps {
  categories: Category[];
}

export function CategoryNavBar({ categories }: CategoryNavBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredCatId, setHoveredCatId] = useState<number | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const rootCategories = categories.filter((c) => c.parentId === null || c.depth === 0);

  const getSubcategories = useCallback(
    (parentId: number): Category[] => {
      const parent = categories.find((c) => c.id === parentId);
      if (parent?.children && parent.children.length > 0) {
        return parent.children;
      }
      return categories.filter((c) => c.parentId === parentId);
    },
    [categories]
  );

  const handleMouseEnter = (catId: number) => {
    clearTimeout(closeTimerRef.current);
    setHoveredCatId(catId);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setHoveredCatId(null);
    }, 150);
  };

  useEffect(() => {
    return () => clearTimeout(closeTimerRef.current);
  }, []);

  if (rootCategories.length === 0) return null;

  return (
    <nav className="hidden lg:block border-b border-secondary-100 bg-white relative z-40">
      <div className="px-4">
        <div
          ref={scrollRef}
          className="flex items-center justify-between"
        >
          {rootCategories.map((cat) => {
            const subcats = getSubcategories(cat.id);
            const isHovered = hoveredCatId === cat.id;

            return (
              <div
                key={cat.id}
                className="flex-shrink-0"
                onMouseEnter={() => handleMouseEnter(cat.id)}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  href={`/kategori/${cat.slug}`}
                  className={`flex items-center gap-1 px-[8px] py-2.5 text-[11.5px] font-semibold transition-colors whitespace-nowrap ${
                    isHovered
                      ? 'text-accent'
                      : 'text-secondary-700 hover:text-accent'
                  }`}
                >
                  {cat.icon && (
                    <div className="relative h-4 w-4 flex-shrink-0">
                      <Image
                        src={storageUrl(cat.icon)}
                        alt=""
                        fill
                        className="object-contain"
                        sizes="16px"
                        unoptimized
                      />
                    </div>
                  )}
                  <span>{cat.name}</span>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Mega menu dropdown — rendered outside scroll container */}
        {hoveredCatId !== null && (() => {
          const cat = rootCategories.find((c) => c.id === hoveredCatId);
          if (!cat) return null;
          const subcats = getSubcategories(cat.id);
          if (subcats.length === 0) return null;

          // Find the position of the hovered category element
          const catElements = scrollRef.current?.children;
          let leftOffset = 0;
          let alignRight = false;
          if (catElements && scrollRef.current) {
            const containerRect = scrollRef.current.getBoundingClientRect();
            for (let i = 0; i < catElements.length; i++) {
              const el = catElements[i] as HTMLElement;
              const link = el.querySelector('a');
              if (link?.textContent?.includes(cat.name)) {
                leftOffset = el.offsetLeft;
                // Check if dropdown would overflow right edge
                const dropdownWidth = 320;
                const elRight = el.getBoundingClientRect().left + dropdownWidth;
                if (elRight > window.innerWidth - 16) {
                  alignRight = true;
                }
                break;
              }
            }
          }

          return (
            <div
              className="absolute top-full left-0 right-0 z-[9999]"
              onMouseEnter={() => handleMouseEnter(cat.id)}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className="absolute min-w-[280px] max-w-[560px] bg-white shadow-xl rounded-b-lg border border-secondary-100 border-t-2 border-t-accent"
                style={alignRight ? { right: 0 } : { left: leftOffset }}
              >
                <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-1">
                  {subcats.map((sub) => {
                    const subChildren = getSubcategories(sub.id);
                    return (
                      <div key={sub.id} className="py-1">
                        <Link
                          href={`/kategori/${sub.slug}`}
                          className="block text-sm font-semibold text-secondary-900 hover:text-accent transition-colors py-1"
                        >
                          {sub.name}
                        </Link>
                        {subChildren.length > 0 && (
                          <div className="mt-0.5 space-y-0.5">
                            {subChildren.slice(0, 6).map((child) => (
                              <Link
                                key={child.id}
                                href={`/kategori/${child.slug}`}
                                className="block text-xs text-secondary-500 hover:text-accent transition-colors py-0.5"
                              >
                                {child.name}
                              </Link>
                            ))}
                            {subChildren.length > 6 && (
                              <Link
                                href={`/kategori/${sub.slug}`}
                                className="block text-xs font-medium text-accent py-0.5"
                              >
                                Tümünü Gör ({subChildren.length})
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-secondary-100 px-4 py-2">
                  <Link
                    href={`/kategori/${cat.slug}`}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    Tüm {cat.name} Kategorisini Gör →
                  </Link>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </nav>
  );
}
