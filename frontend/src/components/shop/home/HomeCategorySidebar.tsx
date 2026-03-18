'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Category } from '@/types/api';

interface HomeCategorySidebarProps {
  categories: Category[];
}

export function HomeCategorySidebar({ categories }: HomeCategorySidebarProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const roots = categories
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const hoveredCategory = roots.find((c) => c.id === hoveredId);
  const children = hoveredCategory?.children ?? [];

  const clearTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openCategory = useCallback((id: number, el: HTMLElement) => {
    clearTimer();
    setHoveredId(id);
    // Calculate flyout top relative to the sidebar wrapper
    if (sidebarRef.current) {
      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const itemRect = el.getBoundingClientRect();
      setFlyoutTop(itemRect.top - sidebarRect.top);
    }
  }, [clearTimer]);

  const scheduleClose = useCallback(() => {
    clearTimer();
    closeTimer.current = setTimeout(() => setHoveredId(null), 200);
  }, [clearTimer]);

  return (
    <div
      ref={sidebarRef}
      className="relative hidden md:flex flex-col w-[280px] flex-shrink-0 h-full"
    >
      <div className="flex flex-col bg-white border border-secondary-200 rounded-lg h-full shadow-sm">
        {/* Header */}
        <div className="bg-accent px-5 py-4 rounded-t-lg flex-shrink-0">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Kategoriler
          </h3>
        </div>

        {/* Category list - evenly distributed */}
        <ul
          className="flex flex-col justify-between flex-1 divide-y divide-secondary-100"
          onMouseLeave={scheduleClose}
        >
          {roots.map((cat) => {
            const hasChildren = cat.children && cat.children.length > 0;
            const isHovered = hoveredId === cat.id;

            return (
              <li key={cat.id} className="flex-1 flex min-h-0">
                <Link
                  href={`/kategori/${cat.slug}`}
                  className={`flex items-center justify-between w-full px-5 text-[15px] transition-colors ${
                    isHovered
                      ? 'bg-secondary-50 text-accent'
                      : 'text-secondary-700 hover:bg-secondary-50 hover:text-accent'
                  }`}
                  onMouseEnter={(e) => openCategory(cat.id, e.currentTarget)}
                >
                  <span className="font-medium">{cat.name}</span>
                  {hasChildren && (
                    <ChevronRight className="h-4 w-4 text-secondary-400 flex-shrink-0" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Flyout - positioned outside the sidebar, at the hovered row's Y */}
      {hoveredId !== null && children.length > 0 && (
        <div
          className="absolute z-50 w-[480px] bg-white border border-secondary-100 rounded-lg shadow-xl p-6"
          style={{ left: '100%', top: flyoutTop, marginLeft: '2px' }}
          onMouseEnter={clearTimer}
          onMouseLeave={scheduleClose}
        >
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-accent">
            {hoveredCategory?.name}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/kategori/${child.slug}`}
                className="rounded-lg px-3 py-2.5 text-sm text-secondary-700 hover:bg-accent-50 hover:text-accent transition-colors"
              >
                {child.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
