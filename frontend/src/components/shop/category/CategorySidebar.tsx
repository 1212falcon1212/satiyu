import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Category } from '@/types/api';

interface CategorySidebarProps {
  current: Category;
  subcategories: Category[];
  ancestors: Category[];
}

export function CategorySidebar({ current, subcategories, ancestors }: CategorySidebarProps) {
  return (
    <div>
      {/* Title */}
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-secondary-900 border-b-2 border-accent pb-2">
        Ürün Kategorileri
      </h3>

      {/* Breadcrumb ancestors */}
      {ancestors.length > 0 && (
        <div className="mb-3 space-y-1">
          {ancestors.map((a) => (
            <Link
              key={a.id}
              href={`/kategori/${a.slug}`}
              className="flex items-center gap-1 text-xs text-secondary-500 hover:text-accent transition-colors"
            >
              <ChevronRight className="h-3 w-3 rotate-180" />
              {a.name}
            </Link>
          ))}
        </div>
      )}

      {/* Current category */}
      <h4 className="mb-3 text-sm font-bold text-accent">{current.name}</h4>

      {/* Subcategories */}
      {subcategories.length > 0 && (
        <ul className="space-y-0.5">
          {subcategories.map((child) => (
            <li key={child.id}>
              <Link
                href={`/kategori/${child.slug}`}
                className="flex items-center justify-between py-2 text-sm text-secondary-700 hover:text-accent transition-colors"
              >
                <span>{child.name}</span>
                {child.productCount > 0 && (
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-secondary-100 px-1.5 text-[10px] font-semibold text-secondary-500">
                    {child.productCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
