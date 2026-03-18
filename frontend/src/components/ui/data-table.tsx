'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';
import { Button } from './button';
import { Select } from './select';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  page?: number;
  perPage?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  keyExtractor?: (item: T) => string | number;
}

type SortDirection = 'asc' | 'desc' | null;

function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'Kayıt bulunamadı.',
  page = 1,
  perPage = 10,
  total,
  onPageChange,
  onPerPageChange,
  keyExtractor,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison =
        typeof aVal === 'string' && typeof bVal === 'string'
          ? aVal.localeCompare(bVal, 'tr')
          : Number(aVal) - Number(bVal);

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  const totalItems = total ?? data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <ChevronsUpDown className="h-4 w-4 text-secondary-400" />;
    if (sortDirection === 'asc') return <ChevronUp className="h-4 w-4 text-primary-600" />;
    return <ChevronDown className="h-4 w-4 text-primary-600" />;
  };

  if (isLoading) {
    return (
      <div className="w-full overflow-hidden rounded-lg border border-secondary-200">
        <table className="w-full">
          <thead className="bg-secondary-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-200">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <Skeleton className="h-5 w-full max-w-[200px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-lg border border-secondary-200">
        <table className="w-full">
          <thead className="bg-secondary-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="flex flex-col items-center justify-center py-12 text-secondary-500">
          <PackageOpen className="h-10 w-10 text-secondary-300 mb-3" />
          <p className="text-sm font-medium">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="overflow-x-auto rounded-lg border border-secondary-200">
        <table className="w-full">
          <thead className="bg-secondary-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500',
                    col.sortable !== false && 'cursor-pointer select-none hover:text-secondary-700',
                    col.className
                  )}
                  onClick={() => {
                    if (col.sortable !== false) handleSort(col.key);
                  }}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable !== false && getSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-200 bg-white">
            {sortedData.map((item, index) => (
              <tr
                key={keyExtractor ? keyExtractor(item) : index}
                className="hover:bg-secondary-50 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-sm text-secondary-700', col.className)}>
                    {col.render
                      ? col.render(item)
                      : (item[col.key] as ReactNode) ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(onPageChange || onPerPageChange) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-secondary-500">
            <span>Sayfa başına:</span>
            <Select
              selectSize="sm"
              options={[
                { value: 10, label: '10' },
                { value: 25, label: '25' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
              ]}
              value={perPage}
              onChange={(e) => onPerPageChange?.(Number(e.target.value))}
              className="w-20"
            />
            <span>
              Toplam {totalItems} kayıt
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-secondary-700">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DataTable };
