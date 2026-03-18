'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import type { Category } from '@/types/api';

interface MegaMenuProps {
  category: Category;
  onClose: () => void;
}

export function MegaMenu({ category, onClose }: MegaMenuProps) {
  const children = category.children || [];

  if (children.length === 0) return null;

  return (
    <div
      className="absolute left-0 right-0 top-full z-40 border-t border-accent-600/20 bg-white shadow-xl"
      onMouseLeave={onClose}
    >
      <div className="container-main py-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {children.map((child) => (
            <div key={child.id}>
              <Link
                href={`/kategori/${child.slug}`}
                onClick={onClose}
                className="group flex items-center gap-3"
              >
                {child.imageUrl && (
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-secondary-100">
                    <Image
                      src={child.imageUrl}
                      alt={child.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                )}
                <span className="text-sm font-medium text-secondary-700 group-hover:text-accent-600 transition-colors">
                  {child.name}
                </span>
              </Link>
              {child.children && child.children.length > 0 && (
                <ul className="mt-2 space-y-1 pl-[52px]">
                  {child.children.slice(0, 5).map((sub) => (
                    <li key={sub.id}>
                      <Link
                        href={`/kategori/${sub.slug}`}
                        onClick={onClose}
                        className="text-xs text-secondary-500 hover:text-accent-600 transition-colors"
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-secondary-100 pt-4">
          <Link
            href={`/kategori/${category.slug}`}
            onClick={onClose}
            className="text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors"
          >
            Tüm {category.name} &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

interface CategoryNavClientProps {
  categories: Category[];
}

export function CategoryNavClient({ categories }: CategoryNavClientProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeCategory = categories.find((c) => c.id === activeId) || null;

  const handleMouseEnter = (id: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveId(id);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setActiveId(null), 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <nav className="relative hidden md:block bg-gradient-to-r from-accent-700 via-accent-600 to-accent-700">
      <div className="container-main">
        <ul className="flex items-center justify-center gap-0.5 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => {
            const hasChildren = cat.children && cat.children.length > 0;
            const isActive = activeId === cat.id;

            return (
              <li key={cat.id}>
                <Link
                  href={`/kategori/${cat.slug}`}
                  className={`flex items-center gap-1 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors rounded ${
                    isActive
                      ? 'bg-accent-800/40 text-white'
                      : 'text-white/90 hover:bg-accent-800/30 hover:text-white'
                  }`}
                  onMouseEnter={() => handleMouseEnter(cat.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  {cat.name}
                  {hasChildren && (
                    <ChevronDown className={`h-3 w-3 transition-transform ${isActive ? 'rotate-180' : ''}`} />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {activeCategory && activeCategory.children && activeCategory.children.length > 0 && (
        <div
          onMouseEnter={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          <MegaMenu
            category={activeCategory}
            onClose={() => setActiveId(null)}
          />
        </div>
      )}
    </nav>
  );
}
