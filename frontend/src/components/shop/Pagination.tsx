'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
}

export function Pagination({ currentPage, lastPage, total }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createPageUrl = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) {
        params.delete('page');
      } else {
        params.set('page', String(page));
      }
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, searchParams]
  );

  if (lastPage <= 1) return null;

  const pages: (number | 'ellipsis')[] = [];
  const delta = 2;

  for (let i = 1; i <= lastPage; i++) {
    if (
      i === 1 ||
      i === lastPage ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis');
    }
  }

  return (
    <nav className="flex items-center justify-center gap-1 py-8" aria-label="Sayfalama">
      <button
        type="button"
        onClick={() => router.push(createPageUrl(currentPage - 1))}
        disabled={currentPage <= 1}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-secondary-200 text-secondary-600 transition-colors hover:bg-secondary-50 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Önceki sayfa"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((page, i) =>
        page === 'ellipsis' ? (
          <span
            key={`ellipsis-${i}`}
            className="flex h-9 w-9 items-center justify-center text-sm text-secondary-400"
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => router.push(createPageUrl(page))}
            className={cn(
              'flex h-9 min-w-[36px] items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors',
              page === currentPage
                ? 'bg-primary-600 text-white'
                : 'border border-secondary-200 text-secondary-700 hover:bg-secondary-50'
            )}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => router.push(createPageUrl(currentPage + 1))}
        disabled={currentPage >= lastPage}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-secondary-200 text-secondary-600 transition-colors hover:bg-secondary-50 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Sonraki sayfa"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <span className="ml-3 text-xs text-secondary-400">
        Toplam {total} ürün
      </span>
    </nav>
  );
}
