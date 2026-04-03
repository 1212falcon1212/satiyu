'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Category } from '@/types/api';
import { storageUrl } from '@/lib/utils';

interface MenuItemData {
  id: number;
  parentId: number | null;
  label: string;
  type: 'category' | 'custom_link';
  url: string | null;
  openNewTab: boolean;
  categoryId: number | null;
  categorySlug: string | null;
  depth: number;
  children?: MenuItemData[];
}

interface CategoryNavBarProps {
  categories: Category[];
}

export function CategoryNavBar({ categories }: CategoryNavBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredCatId, setHoveredCatId] = useState<number | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
  const [menuLoaded, setMenuLoaded] = useState(false);

  // Fetch menu items from API
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '')}/api/menu`)
      .then((res) => res.json())
      .then((data) => {
        setMenuItems(data.data || []);
        setMenuLoaded(true);
      })
      .catch(() => {
        setMenuLoaded(true);
      });
  }, []);

  const rootCategories = categories.filter((c) => c.parentId === null || c.depth === 0);

  // Determine which items to show in the nav bar
  const useMenuApi = menuLoaded && menuItems.length > 0;

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

  // If no menu items and no root categories, hide
  if (!useMenuApi && rootCategories.length === 0) return null;

  // Build the nav items to render (only root level)
  const navItems: {
    key: string;
    label: string;
    href: string;
    openNewTab: boolean;
    categoryId: number | null;
    icon?: string;
    type: 'category' | 'custom_link';
    menuChildren?: MenuItemData[];
  }[] = useMenuApi
    ? menuItems.map((item) => ({
        key: `menu-${item.id}`,
        label: item.label,
        href: item.url || '#',
        openNewTab: item.openNewTab,
        categoryId: item.categoryId,
        type: item.type,
        menuChildren: item.children ?? [],
      }))
    : rootCategories.map((cat) => ({
        key: `cat-${cat.id}`,
        label: cat.name,
        href: `/kategori/${cat.slug}`,
        openNewTab: false,
        categoryId: cat.id,
        icon: cat.icon,
        type: 'category' as const,
        menuChildren: [],
      }));

  return (
    <nav className="hidden lg:block border-b border-secondary-100 bg-white relative z-40">
      <div className="container-main">
        <div
          ref={scrollRef}
          className="flex items-center justify-center gap-0 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {navItems.map((navItem) => {
            const hasCategoryId = navItem.type === 'category' && navItem.categoryId !== null;
            const subcats = hasCategoryId ? getSubcategories(navItem.categoryId!) : [];
            const isHovered = hoveredCatId !== null && navItem.categoryId === hoveredCatId;

            // Find category for icon (only in fallback mode)
            const cat = !useMenuApi && navItem.categoryId
              ? rootCategories.find((c) => c.id === navItem.categoryId)
              : null;

            return (
              <div
                key={navItem.key}
                className="flex-shrink-0"
                onMouseEnter={() => hasCategoryId ? handleMouseEnter(navItem.categoryId!) : undefined}
                onMouseLeave={hasCategoryId ? handleMouseLeave : undefined}
              >
                <Link
                  href={navItem.href}
                  target={navItem.openNewTab ? '_blank' : undefined}
                  rel={navItem.openNewTab ? 'noopener noreferrer' : undefined}
                  className={`flex items-center gap-1 px-[8px] py-2.5 text-[11.5px] font-semibold transition-colors whitespace-nowrap ${
                    isHovered
                      ? 'text-accent'
                      : 'text-secondary-700 hover:text-accent'
                  }`}
                >
                  {cat?.icon && (
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
                  <span>{navItem.label}</span>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Mega menu dropdown -- only for category-type items with subcategories */}
        {hoveredCatId !== null && (() => {
          const navItem = navItems.find((n) => n.categoryId === hoveredCatId && n.type === 'category');
          if (!navItem) return null;

          // Use menu children if available, otherwise fall back to category subcategories
          const menuKids = navItem.menuChildren ?? [];
          const subcats = getSubcategories(hoveredCatId);
          if (subcats.length === 0 && menuKids.length === 0) return null;

          // Find the matching category for the "see all" link
          const cat = categories.find((c) => c.id === hoveredCatId);

          // Find the position of the hovered category element
          const catElements = scrollRef.current?.children;
          let leftOffset = 0;
          let alignRight = false;
          if (catElements && scrollRef.current) {
            for (let i = 0; i < catElements.length; i++) {
              const el = catElements[i] as HTMLElement;
              const link = el.querySelector('a');
              if (link?.textContent?.includes(navItem.label)) {
                leftOffset = el.offsetLeft;
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
              onMouseEnter={() => handleMouseEnter(hoveredCatId)}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className="absolute min-w-[280px] max-w-[560px] bg-white shadow-xl rounded-b-lg border border-secondary-100 border-t-2 border-t-accent"
                style={alignRight ? { right: 0 } : { left: leftOffset }}
              >
                <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-1">
                  {/* Use menu children if available, otherwise category subcats */}
                  {menuKids.length > 0 ? menuKids.map((kid) => (
                    <div key={kid.id} className="py-1">
                      <Link
                        href={kid.url || (kid.categorySlug ? `/kategori/${kid.categorySlug}` : '#')}
                        className="block text-sm font-semibold text-secondary-900 hover:text-accent transition-colors py-1"
                      >
                        {kid.label}
                      </Link>
                      {kid.children && kid.children.length > 0 && (
                        <div className="mt-0.5 space-y-0.5">
                          {kid.children.slice(0, 6).map((grandchild) => (
                            <Link
                              key={grandchild.id}
                              href={grandchild.url || (grandchild.categorySlug ? `/kategori/${grandchild.categorySlug}` : '#')}
                              className="block text-xs text-secondary-500 hover:text-accent transition-colors py-0.5"
                            >
                              {grandchild.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )) : subcats.map((sub) => {
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
                {cat && (
                  <div className="border-t border-secondary-100 px-4 py-2">
                    <Link
                      href={`/kategori/${cat.slug}`}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      Tüm {cat.name} Kategorisini Gör →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </nav>
  );
}
