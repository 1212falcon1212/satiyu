'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { formatPrice, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';
import {
  Plus,
  Pencil,
  ExternalLink,
  Search,
  X,
  SlidersHorizontal,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  PackageOpen,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { revalidateCache } from '@/lib/revalidate';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  stockQuantity: number;
  isActive: boolean;
  isFeatured: boolean;
  showOnHomepage: boolean;
  mainImage: string | null;
  categoryName: string | null;
  brandName: string | null;
  [key: string]: unknown;
}

interface PaginatedResponse {
  data: Product[];
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
  };
}

interface SelectOption {
  id: number;
  name: string;
  slug?: string;
  children?: SelectOption[];
}

interface Filters {
  search: string;
  category_id: string;
  brand_id: string;
  stock_status: string;
  is_featured: string;
  show_on_homepage: string;
  is_active: string;
}

const defaultFilters: Filters = {
  search: '',
  category_id: '',
  brand_id: '',
  stock_status: '',
  is_featured: '',
  show_on_homepage: '',
  is_active: '',
};

type BulkPriceAction = 'set' | 'increase' | 'decrease';
type BulkPriceScope = 'selected' | 'filtered';

interface BulkPriceForm {
  action: BulkPriceAction;
  value: string;
  targets: { price: boolean; compare_price: boolean };
  scope: BulkPriceScope;
}

const defaultBulkPriceForm: BulkPriceForm = {
  action: 'set',
  value: '',
  targets: { price: true, compare_price: true },
  scope: 'selected',
};

type SortDirection = 'asc' | 'desc' | null;

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Bulk price dialog
  const [showBulkPrice, setShowBulkPrice] = useState(false);
  const [bulkPriceForm, setBulkPriceForm] = useState<BulkPriceForm>(defaultBulkPriceForm);

  // Sorting state
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const toggleHomepageMutation = useMutation({
    mutationFn: async ({ id, showOnHomepage }: { id: number; showOnHomepage: boolean }) => {
      await api.put(`/admin/products/${id}`, { show_on_homepage: showOnHomepage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      revalidateCache(['products']);
      toast.success('Ürün güncellendi.');
    },
    onError: () => {
      toast.error('Güncelleme başarısız oldu.');
    },
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters((f) => ({ ...f, search: searchInput }));
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search]);

  const { data: brands } = useQuery<SelectOption[]>({
    queryKey: ['admin', 'brands-list'],
    queryFn: async () => {
      const { data } = await api.get('/brands');
      return data.data;
    },
    staleTime: 60_000,
  });

  const { data: categories } = useQuery<SelectOption[]>({
    queryKey: ['admin', 'categories-list'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data.data;
    },
    staleTime: 60_000,
  });

  // Build query params
  const buildParams = useCallback(() => {
    const params: Record<string, string | number> = {
      page,
      per_page: perPage,
      include: 'category,brand,images',
      sort: '-created_at',
    };
    if (filters.search) params['filter[name]'] = filters.search;
    if (filters.category_id) params['filter[category_tree]'] = filters.category_id;
    if (filters.brand_id) params['filter[brand_id]'] = filters.brand_id;
    if (filters.stock_status) params['filter[stock_status]'] = filters.stock_status;
    if (filters.is_featured) params['filter[is_featured]'] = filters.is_featured;
    if (filters.show_on_homepage) params['filter[show_on_homepage]'] = filters.show_on_homepage;
    if (filters.is_active) params['filter[is_active]'] = filters.is_active;
    return params;
  }, [page, perPage, filters]);

  const { data: response, isLoading, error } = useQuery<PaginatedResponse>({
    queryKey: ['admin', 'products', page, perPage, filters],
    queryFn: async () => {
      const { data } = await api.get('/admin/products', { params: buildParams() });
      return data;
    },
  });

  const products = response?.data ?? [];
  const total = response?.meta?.total ?? 0;

  const activeFilterCount = Object.entries(filters).filter(
    ([key, val]) => val !== '' && key !== 'search'
  ).length;

  const clearFilters = () => {
    setFilters(defaultFilters);
    setSearchInput('');
    setPage(1);
  };

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  // Flatten categories for select
  const flatCategories: { id: number; name: string; depth: number }[] = [];
  const flattenCats = (cats: SelectOption[], depth = 0) => {
    for (const cat of cats) {
      flatCategories.push({ id: cat.id, name: cat.name, depth });
      if (cat.children?.length) flattenCats(cat.children, depth + 1);
    }
  };
  if (categories) flattenCats(categories);

  // Selection handlers
  const isAllOnPageSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllOnPageSelected) {
        products.forEach((p) => next.delete(p.id));
      } else {
        products.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Bulk price mutation
  const bulkPriceMutation = useMutation({
    mutationFn: async (payload: {
      action: BulkPriceAction;
      value: number;
      is_percentage: boolean;
      targets: string[];
      product_ids?: number[];
      filters?: Record<string, string | number>;
    }) => {
      const { data } = await api.post('/admin/products/bulk-price', payload);
      return data;
    },
    onSuccess: (data) => {
      const count = data?.data?.updated_count ?? 0;
      toast.success(`${count} ürünün fiyatı güncellendi.`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      revalidateCache(['products']);
      setShowBulkPrice(false);
      setSelectedIds(new Set());
      setBulkPriceForm(defaultBulkPriceForm);
    },
    onError: () => {
      toast.error('Toplu fiyat güncelleme başarısız oldu.');
    },
  });

  const handleBulkPriceSubmit = () => {
    const numValue = parseFloat(bulkPriceForm.value);
    if (isNaN(numValue) || numValue < 0) {
      toast.error('Geçerli bir değer giriniz.');
      return;
    }

    const targets: string[] = [];
    if (bulkPriceForm.targets.price) targets.push('price');
    if (bulkPriceForm.targets.compare_price) targets.push('compare_price');

    if (targets.length === 0) {
      toast.error('En az bir hedef seçmelisiniz.');
      return;
    }

    const isPercentage = bulkPriceForm.action !== 'set';

    const payload: {
      action: BulkPriceAction;
      value: number;
      is_percentage: boolean;
      targets: string[];
      product_ids?: number[];
      filters?: Record<string, string | number>;
    } = {
      action: bulkPriceForm.action,
      value: numValue,
      is_percentage: isPercentage,
      targets,
    };

    if (bulkPriceForm.scope === 'selected') {
      payload.product_ids = Array.from(selectedIds);
    } else {
      const filterPayload: Record<string, string | number> = {};
      if (filters.category_id) filterPayload.category_id = Number(filters.category_id);
      if (filters.brand_id) filterPayload.brand_id = Number(filters.brand_id);
      if (filters.search) filterPayload.name = filters.search;
      if (filters.is_active) filterPayload.is_active = Number(filters.is_active);
      if (filters.stock_status) filterPayload.stock_status = filters.stock_status;
      payload.filters = filterPayload;
    }

    bulkPriceMutation.mutate(payload);
  };

  // Sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <ChevronsUpDown className="h-4 w-4 text-secondary-400" />;
    if (sortDirection === 'asc') return <ChevronUp className="h-4 w-4 text-primary-600" />;
    return <ChevronDown className="h-4 w-4 text-primary-600" />;
  };

  const sortedProducts = (() => {
    if (!sortKey || !sortDirection) return products;
    return [...products].sort((a, b) => {
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
  })();

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // Column definitions
  const columns = [
    { key: 'checkbox', header: '', sortable: false, className: 'w-10' },
    { key: 'image', header: 'Görsel', sortable: false, className: 'w-16' },
    { key: 'name', header: 'Ürün Adı', sortable: true },
    { key: 'price', header: 'Fiyat', sortable: true },
    { key: 'stockQuantity', header: 'Stok', sortable: true },
    { key: 'category', header: 'Kategori', sortable: false },
    { key: 'brand', header: 'Marka', sortable: false },
    { key: 'showOnHomepage', header: 'Ana Sayfa', sortable: false },
    { key: 'isActive', header: 'Durum', sortable: false },
    { key: 'actions', header: 'İşlemler', sortable: false },
  ];

  const renderCell = (product: Product, key: string) => {
    switch (key) {
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={selectedIds.has(product.id)}
            onChange={() => toggleSelect(product.id)}
            className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
          />
        );
      case 'image':
        return (
          <div className="h-10 w-10 overflow-hidden rounded-lg bg-secondary-100">
            {product.mainImage ? (
              <img
                src={product.mainImage}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-secondary-400">
                Yok
              </div>
            )}
          </div>
        );
      case 'name':
        return (
          <div className="max-w-[300px]">
            <p className="font-medium text-secondary-900 truncate">{product.name}</p>
          </div>
        );
      case 'price':
        return (
          <div>
            <p className="font-medium text-secondary-900">{formatPrice(product.price)}</p>
            {product.comparePrice && product.comparePrice > product.price && (
              <p className="text-xs text-secondary-400 line-through">
                {formatPrice(product.comparePrice)}
              </p>
            )}
          </div>
        );
      case 'stockQuantity':
        return (
          <Badge
            variant={
              product.stockQuantity > 10
                ? 'success'
                : product.stockQuantity > 0
                ? 'warning'
                : 'danger'
            }
          >
            {product.stockQuantity}
          </Badge>
        );
      case 'category':
        return (
          <span className="text-sm text-secondary-600">{product.categoryName ?? '-'}</span>
        );
      case 'brand':
        return (
          <span className="text-sm text-secondary-600">{product.brandName ?? '-'}</span>
        );
      case 'showOnHomepage':
        return (
          <Switch
            checked={product.showOnHomepage}
            onCheckedChange={(checked) =>
              toggleHomepageMutation.mutate({ id: product.id, showOnHomepage: checked })
            }
            disabled={toggleHomepageMutation.isPending}
          />
        );
      case 'isActive':
        return (
          <Badge variant={product.isActive ? 'success' : 'outline'}>
            {product.isActive ? 'Aktif' : 'Pasif'}
          </Badge>
        );
      case 'actions':
        return (
          <div className="flex items-center gap-1">
            <Link
              href={`/admin/products/${product.id}`}
              className="rounded p-1.5 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-700 transition-colors"
              aria-label="Düzenle"
            >
              <Pencil className="h-4 w-4" />
            </Link>
            <Link
              href={`/urun/${product.slug}`}
              target="_blank"
              className="rounded p-1.5 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-700 transition-colors"
              aria-label="Görüntüle"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        );
      default:
        return null;
    }
  };

  if (error) {
    return (
      <Alert variant="error" title="Hata">
        Ürünler yüklenirken bir hata oluştu.
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">Ürünler</h1>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="h-4 w-4" />
            Yeni Ürün
          </Button>
        </Link>
      </div>

      {/* Search + Filter toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
          <input
            type="text"
            placeholder="Ürün adı ile ara..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-secondary-200 bg-white py-2 pl-10 pr-10 text-sm text-secondary-900 placeholder:text-secondary-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                updateFilter('search', '');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtreler
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
              {activeFilterCount}
            </span>
          )}
        </Button>
        {(activeFilterCount > 0 || filters.search) && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 text-danger">
            <X className="h-4 w-4" />
            Temizle
          </Button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-secondary-200 bg-secondary-50 p-4 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary-500">Kategori</label>
            <select
              value={filters.category_id}
              onChange={(e) => updateFilter('category_id', e.target.value)}
              className="w-full rounded-md border border-secondary-200 bg-white px-2.5 py-1.5 text-sm text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Tümü</option>
              {flatCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {'—'.repeat(cat.depth)} {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary-500">Marka</label>
            <select
              value={filters.brand_id}
              onChange={(e) => updateFilter('brand_id', e.target.value)}
              className="w-full rounded-md border border-secondary-200 bg-white px-2.5 py-1.5 text-sm text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Tümü</option>
              {brands?.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary-500">Stok Durumu</label>
            <select
              value={filters.stock_status}
              onChange={(e) => updateFilter('stock_status', e.target.value)}
              className="w-full rounded-md border border-secondary-200 bg-white px-2.5 py-1.5 text-sm text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Tümü</option>
              <option value="in_stock">Stokta Var</option>
              <option value="out_of_stock">Stokta Yok</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary-500">Öne Çıkan</label>
            <select
              value={filters.is_featured}
              onChange={(e) => updateFilter('is_featured', e.target.value)}
              className="w-full rounded-md border border-secondary-200 bg-white px-2.5 py-1.5 text-sm text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Tümü</option>
              <option value="1">Evet</option>
              <option value="0">Hayır</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary-500">Ana Sayfada Göster</label>
            <select
              value={filters.show_on_homepage}
              onChange={(e) => updateFilter('show_on_homepage', e.target.value)}
              className="w-full rounded-md border border-secondary-200 bg-white px-2.5 py-1.5 text-sm text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Tümü</option>
              <option value="1">Evet</option>
              <option value="0">Hayır</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary-500">Durum</label>
            <select
              value={filters.is_active}
              onChange={(e) => updateFilter('is_active', e.target.value)}
              className="w-full rounded-md border border-secondary-200 bg-white px-2.5 py-1.5 text-sm text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Tümü</option>
              <option value="1">Aktif</option>
              <option value="0">Pasif</option>
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="w-full space-y-4">
        {isLoading ? (
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
        ) : sortedProducts.length === 0 ? (
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
              <p className="text-sm font-medium">Aramanıza uygun ürün bulunamadı.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-secondary-200">
            <table className="w-full">
              <thead className="bg-secondary-50">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500',
                        col.sortable && 'cursor-pointer select-none hover:text-secondary-700',
                        col.className
                      )}
                      onClick={() => {
                        if (col.sortable) handleSort(col.key);
                      }}
                    >
                      {col.key === 'checkbox' ? (
                        <input
                          type="checkbox"
                          checked={isAllOnPageSelected}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          {col.header}
                          {col.sortable && getSortIcon(col.key)}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200 bg-white">
                {sortedProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={cn(
                      'hover:bg-secondary-50 transition-colors',
                      selectedIds.has(product.id) && 'bg-primary-50/50'
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn('px-4 py-3 text-sm text-secondary-700', col.className)}
                      >
                        {renderCell(product, col.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="w-20"
            />
            <span>Toplam {total} kayıt</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
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
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Floating action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-4 rounded-xl border border-secondary-200 bg-white px-6 py-3 shadow-lg">
            <span className="text-sm font-medium text-secondary-700">
              {selectedIds.size} ürün seçili
            </span>
            <div className="h-5 w-px bg-secondary-200" />
            <Button
              size="sm"
              onClick={() => {
                setBulkPriceForm({ ...defaultBulkPriceForm, scope: 'selected' });
                setShowBulkPrice(true);
              }}
            >
              <DollarSign className="h-4 w-4" />
              Toplu Fiyat Güncelle
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={async () => {
                if (!confirm(`${selectedIds.size} ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
                try {
                  const { data } = await api.post('/admin/products/bulk-delete', { product_ids: Array.from(selectedIds) });
                  toast.success(data.message);
                  setSelectedIds(new Set());
                  queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
                } catch {
                  toast.error('Silme işlemi başarısız.');
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Toplu Sil
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X className="h-4 w-4" />
              Temizle
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Price Dialog */}
      <Dialog isOpen={showBulkPrice} onClose={() => setShowBulkPrice(false)} className="max-w-md">
        <DialogClose onClose={() => setShowBulkPrice(false)} />
        <DialogHeader>
          <DialogTitle>Toplu Fiyat Güncelle</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-5">
          {/* Action */}
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary-700">İşlem</label>
            <div className="space-y-2">
              {([
                { value: 'set', label: 'Sabit tutar belirle' },
                { value: 'increase', label: 'Yüzde artır' },
                { value: 'decrease', label: 'Yüzde azalt' },
              ] as const).map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bulk-action"
                    value={opt.value}
                    checked={bulkPriceForm.action === opt.value}
                    onChange={() =>
                      setBulkPriceForm((f) => ({ ...f, action: opt.value, value: '' }))
                    }
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-secondary-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Targets */}
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary-700">Hedef</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkPriceForm.targets.compare_price}
                  onChange={(e) =>
                    setBulkPriceForm((f) => ({
                      ...f,
                      targets: { ...f.targets, compare_price: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-secondary-700">Fiyat (compare_price)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkPriceForm.targets.price}
                  onChange={(e) =>
                    setBulkPriceForm((f) => ({
                      ...f,
                      targets: { ...f.targets, price: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-secondary-700">İndirimli Fiyat (price)</span>
              </label>
            </div>
          </div>

          {/* Value */}
          <div>
            <Input
              label={`Değer ${bulkPriceForm.action === 'set' ? '(₺)' : '(%)'}`}
              type="number"
              min="0"
              step="0.01"
              placeholder={bulkPriceForm.action === 'set' ? '0.00' : '0'}
              value={bulkPriceForm.value}
              onChange={(e) => setBulkPriceForm((f) => ({ ...f, value: e.target.value }))}
            />
          </div>

          {/* Scope */}
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary-700">Kapsam</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="bulk-scope"
                  value="selected"
                  checked={bulkPriceForm.scope === 'selected'}
                  onChange={() => setBulkPriceForm((f) => ({ ...f, scope: 'selected' }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  disabled={selectedIds.size === 0}
                />
                <span className="text-sm text-secondary-700">
                  Seçili ürünler ({selectedIds.size})
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="bulk-scope"
                  value="filtered"
                  checked={bulkPriceForm.scope === 'filtered'}
                  onChange={() => setBulkPriceForm((f) => ({ ...f, scope: 'filtered' }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-secondary-700">
                  Filtredeki tüm ürünler ({total})
                </span>
              </label>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowBulkPrice(false)}>
            İptal
          </Button>
          <Button
            onClick={handleBulkPriceSubmit}
            loading={bulkPriceMutation.isPending}
            disabled={
              !bulkPriceForm.value ||
              (!bulkPriceForm.targets.price && !bulkPriceForm.targets.compare_price) ||
              (bulkPriceForm.scope === 'selected' && selectedIds.size === 0)
            }
          >
            Uygula
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
