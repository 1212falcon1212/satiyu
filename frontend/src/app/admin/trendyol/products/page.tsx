'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Send,
  Search,
  Check,
  X,
  Image as ImageIcon,
  Tag,
  FolderTree,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Layers,
  AlertTriangle,
  ListChecks,
  Save,
  Trash2,
  Store,
  Activity,
} from 'lucide-react';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AttributeMappingWizard from '@/components/admin/trendyol/AttributeMappingWizard';
import BatchNotifications from '@/components/admin/trendyol/BatchNotifications';
import StockSyncNotifications from '@/components/admin/trendyol/StockSyncNotifications';
import BulkPriceUpdateDialog, { type PriceOverrides } from '@/components/admin/trendyol/BulkPriceUpdateDialog';

// ─── Types ──────────────────────────────────────────────────────
interface LocalProductVariant {
  id: number;
  barcode: string | null;
  sku: string | null;
  price: number;
  comparePrice: number | null;
  stockQuantity: number;
  values: Array<{
    typeName: string;
    value: string;
  }>;
}

interface LocalProduct {
  id: number;
  name: string;
  barcode: string | null;
  sku: string | null;
  price: number;
  comparePrice: number | null;
  stockQuantity: number;
  mainImage: string | null;
  categoryName: string | null;
  brandName: string | null;
  categoryId: number | null;
  brandId: number | null;
  hasCategoryMapping: boolean;
  hasBrandMapping: boolean;
  hasBarcode: boolean;
  hasImages: boolean;
  hasVariants: boolean;
  variantCount: number;
  variants: LocalProductVariant[];
  marketplaceStatus: 'pending' | 'approved' | 'rejected' | 'on_sale' | null;
  marketplaceProductId: string | null;
  errorMessage: string | null;
  lastSyncedAt: string | null;
}

interface LocalProductsResponse {
  data: LocalProduct[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

interface CategoryOption {
  id: number;
  name: string;
}

// ─── Status Config ──────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'; icon: React.ElementType }> = {
  not_sent: { label: 'Gönderilmedi', variant: 'outline', icon: Package },
  pending: { label: 'Beklemede', variant: 'warning', icon: Clock },
  approved: { label: 'Onaylandı', variant: 'success', icon: CheckCircle2 },
  rejected: { label: 'Reddedildi', variant: 'danger', icon: XCircle },
  on_sale: { label: 'Satışta', variant: 'info', icon: ShoppingBag },
};

const MP_STATUS_OPTIONS = [
  { value: 'all', label: 'Tüm Durumlar' },
  { value: 'not_sent', label: 'Gönderilmedi' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'approved', label: 'Onaylandı' },
  { value: 'rejected', label: 'Reddedildi' },
  { value: 'on_sale', label: 'Satışta' },
];

const READINESS_OPTIONS = [
  { value: 'all', label: 'Tüm Ürünler' },
  { value: 'ready', label: 'Hazır' },
  { value: 'not_ready', label: 'Hazır Değil' },
];

const STOCK_OPTIONS = [
  { value: 'all', label: 'Tüm Stok' },
  { value: 'in_stock', label: 'Stoklu' },
  { value: 'out_of_stock', label: 'Stoksuz' },
];

const VARIANT_OPTIONS = [
  { value: 'all', label: 'Tüm Ürünler' },
  { value: 'yes', label: 'Varyantli' },
  { value: 'no', label: 'Varyantsiz' },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);
}

// ─── Tab Wrapper ────────────────────────────────────────────────
export default function TrendyolProductsPage() {
  const [activeTab, setActiveTab] = useState<'local' | 'trendyol'>('local');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-secondary-200">
        <button
          onClick={() => setActiveTab('local')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === 'local'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
          )}
        >
          <Package className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
          Yerel Ürünler
        </button>
        <button
          onClick={() => setActiveTab('trendyol')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === 'trendyol'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
          )}
        >
          <Store className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
          Trendyol Ürünleri
        </button>
      </div>

      {activeTab === 'local' ? <LocalProductsTab /> : <TrendyolProductsTab />}
    </div>
  );
}

// ─── Local Products Tab ─────────────────────────────────────────
function LocalProductsTab() {
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState('');
  const [mpStatus, setMpStatus] = useState('all');
  const [readiness, setReadiness] = useState('all');
  const [hasVariants, setHasVariants] = useState('all');
  const [stockStatus, setStockStatus] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showWizard, setShowWizard] = useState(false);
  const [bulkSelectLoading, setBulkSelectLoading] = useState(false);
  const [expandedProductIds, setExpandedProductIds] = useState<Set<number>>(new Set());
  const [showBulkPriceDialog, setShowBulkPriceDialog] = useState(false);
  const [priceOverrides, setPriceOverrides] = useState<PriceOverrides | null>(null);
  const [minStockInput, setMinStockInput] = useState<number>(0);

  // Fetch Trendyol settings (kritik stok)
  const { data: settingsData } = useQuery<{ min_stock: number }>({
    queryKey: ['trendyol-settings'],
    queryFn: async () => {
      const { data } = await api.get('/admin/trendyol/settings');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Sync local input with fetched settings
  React.useEffect(() => {
    if (settingsData) {
      setMinStockInput(settingsData.min_stock);
    }
  }, [settingsData]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (minStock: number) => {
      const { data } = await api.put('/admin/trendyol/settings', { min_stock: minStock });
      return data;
    },
    onSuccess: () => {
      toast.success('Kritik stok ayarı kaydedildi');
      queryClient.invalidateQueries({ queryKey: ['trendyol-settings'] });
    },
    onError: () => {
      toast.error('Ayar kaydedilemedi');
    },
  });

  const resetStatusesMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/trendyol/reset-statuses');
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message || 'Durumlar sıfırlandı');
      queryClient.invalidateQueries({ queryKey: ['trendyol-local-products'] });
      queryClient.invalidateQueries({ queryKey: ['trendyol-batch-results'] });
    },
    onError: () => {
      toast.error('Sıfırlama başarısız');
    },
  });

  // Fetch categories for filter
  const { data: categoriesData } = useQuery<{ data: CategoryOption[] }>({
    queryKey: ['admin-categories-list'],
    queryFn: async () => {
      const { data } = await api.get('/admin/categories');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const categories = useMemo(() => {
    const raw = categoriesData?.data ?? [];
    const flat: CategoryOption[] = [];
    const traverse = (items: any[], parentPath = '') => {
      for (const item of items) {
        const fullPath = parentPath ? `${parentPath} > ${item.name}` : item.name;
        if (item.children?.length) {
          traverse(item.children, fullPath);
        } else {
          flat.push({ id: item.id, name: fullPath });
        }
      }
    };
    traverse(raw);
    return flat.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [categoriesData]);

  // Fetch products
  const { data, isLoading } = useQuery<LocalProductsResponse>({
    queryKey: ['trendyol-local-products', { search, mpStatus, readiness, hasVariants, stockStatus, categoryId, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 20 };
      if (search.trim()) params.search = search.trim();
      if (mpStatus !== 'all') params.mp_status = mpStatus;
      if (readiness !== 'all') params.readiness = readiness;
      if (hasVariants !== 'all') params.has_variants = hasVariants;
      if (stockStatus !== 'all') params.stock_status = stockStatus;
      if (categoryId !== 'all') params.category_id = categoryId;
      const { data } = await api.get('/admin/trendyol/local-products', { params });
      return data;
    },
  });

  const products = data?.data ?? [];
  const meta = data?.meta;

  // Fetch all IDs matching current filters (for bulk select)
  const fetchAllIds = useCallback(async (filterOverrides?: Record<string, string>) => {
    const params: Record<string, string> = {};
    const catId = filterOverrides?.category_id ?? categoryId;
    if (catId !== 'all') params.category_id = catId;
    if (search.trim()) params.search = search.trim();
    if (mpStatus !== 'all') params.mp_status = mpStatus;
    if (readiness !== 'all') params.readiness = readiness;
    if (hasVariants !== 'all') params.has_variants = hasVariants;
    if (stockStatus !== 'all') params.stock_status = stockStatus;
    const { data } = await api.get<{ ids: number[]; total: number }>('/admin/trendyol/local-product-ids', { params });
    return data;
  }, [categoryId, search, mpStatus, readiness, hasVariants, stockStatus]);

  const handleSelectAll = useCallback(async () => {
    setBulkSelectLoading(true);
    try {
      const result = await fetchAllIds();
      setSelectedIds(new Set(result.ids));
      toast.info(`${result.total} ürün seçildi`);
    } catch {
      toast.error('Ürün ID\'leri alınamadı');
    } finally {
      setBulkSelectLoading(false);
    }
  }, [fetchAllIds]);

  const handleSelectAllInCategory = useCallback(async () => {
    if (categoryId === 'all') return;
    setBulkSelectLoading(true);
    try {
      const result = await fetchAllIds({ category_id: categoryId });
      setSelectedIds(new Set(result.ids));
      const catName = categories.find((c) => String(c.id) === categoryId)?.name ?? '';
      toast.info(`${catName} kategorisindeki ${result.total} ürün seçildi`);
    } catch {
      toast.error('Ürün ID\'leri alınamadı');
    } finally {
      setBulkSelectLoading(false);
    }
  }, [fetchAllIds, categoryId, categories]);

  // Send products mutation
  const sendMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      const { data } = await api.post('/admin/trendyol/products/send', { product_ids: productIds });
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message || 'Ürünler gönderildi');
      if (result.batchId) {
        toast.info(`Batch ID: ${result.batchId}`, { duration: 8000 });
      }
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['trendyol-local-products'] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Ürün gönderimi başarısız';
      toast.error(msg);
    },
  });

  // Update price/stock mutation — override fiyatları varsa onları kullanır
  const priceStockMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      const items = productIds.map((id) => {
        const p = products.find((pr) => pr.id === id);
        // Ürün seviyesinde override varsa onu kullan
        const overridePrice = priceOverrides?.products[id];
        return {
          product_id: id,
          price: overridePrice ?? p?.price,
          stock: p?.stockQuantity,
          // Varyant override'ları varsa onları da gönder
          variant_overrides: priceOverrides?.variants ?? undefined,
        };
      });
      const { data } = await api.post('/admin/trendyol/products/price-stock', { items });
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message || 'Fiyat/stok güncellendi');
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['trendyol-local-products'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Güncelleme başarısız');
    },
  });

  // Selection helpers
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }, [products, selectedIds.size]);

  const toggleExpand = useCallback((id: number) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Check if we have off-page selections (bulk select mode)
  const hasOffPageSelections = useMemo(() => {
    return Array.from(selectedIds).some((id) => !products.find((p) => p.id === id));
  }, [selectedIds, products]);

  // Readiness check - which selected products on current page can be sent
  // Any product with barcode, category, brand and images can be (re)sent
  const readyToSend = useMemo(() => {
    return products.filter(
      (p) =>
        selectedIds.has(p.id) &&
        p.hasBarcode &&
        p.hasCategoryMapping &&
        p.hasBrandMapping &&
        p.hasImages
    );
  }, [products, selectedIds]);

  // Already sent selected products (for price/stock update)
  const sentSelected = useMemo(() => {
    return products.filter(
      (p) => selectedIds.has(p.id) && p.marketplaceStatus && p.marketplaceStatus !== 'rejected'
    );
  }, [products, selectedIds]);

  const handleSend = () => {
    if (!hasOffPageSelections && readyToSend.length === 0) {
      toast.warning('Gönderilebilecek hazır ürün yok. Barkod, kategori eşleşmesi, marka eşleşmesi ve görsel gereklidir.');
      return;
    }
    setShowWizard(true);
  };

  const handlePriceStockUpdate = () => {
    if (sentSelected.length === 0) {
      toast.warning('Fiyat/stok güncellenecek gönderilmiş ürün seçilmedi.');
      return;
    }
    priceStockMutation.mutate(sentSelected.map((p) => p.id));
  };

  const resetPage = () => setPage(1);
  const isAnyLoading = sendMutation.isPending || priceStockMutation.isPending || resetStatusesMutation.isPending;
  const hasActiveFilters = readiness !== 'all' || hasVariants !== 'all' || stockStatus !== 'all' || categoryId !== 'all' || mpStatus !== 'all' || search.trim() !== '';
  const selectedCategoryName = categoryId !== 'all' ? categories.find((c) => String(c.id) === categoryId)?.name : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Trendyol Ürün Gönderim</h1>
          <p className="mt-1 text-sm text-secondary-500">
            Ürünlerinizi Trendyol pazaryerine gönderin ve yönetin
          </p>
        </div>
        <div className="flex items-center gap-2">
          {meta && <Badge variant="outline">{meta.total} ürün</Badge>}
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => {
              if (window.confirm('Tüm Trendyol gönderim durumları ve raporları sıfırlanacak. Emin misiniz?')) {
                resetStatusesMutation.mutate();
              }
            }}
            disabled={resetStatusesMutation.isPending}
          >
            {resetStatusesMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Durumları Sıfırla
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-secondary-200 bg-white p-4 space-y-3">
        {/* Row 1: Search + MP Status */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              placeholder="Ürün adı, barkod veya SKU ara..."
              className="h-10 w-full rounded-lg border border-secondary-200 bg-secondary-50 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <select
            value={mpStatus}
            onChange={(e) => { setMpStatus(e.target.value); resetPage(); }}
            className="h-10 rounded-lg border border-secondary-200 bg-secondary-50 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {MP_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Row 2: Category + Readiness + Variant + Stock */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
          <select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); resetPage(); }}
            className="h-10 flex-1 rounded-lg border border-secondary-200 bg-secondary-50 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:max-w-[280px]"
          >
            <option value="all">Tüm Kategoriler</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={readiness}
            onChange={(e) => { setReadiness(e.target.value); resetPage(); }}
            className="h-10 rounded-lg border border-secondary-200 bg-secondary-50 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {READINESS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={hasVariants}
            onChange={(e) => { setHasVariants(e.target.value); resetPage(); }}
            className="h-10 rounded-lg border border-secondary-200 bg-secondary-50 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {VARIANT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={stockStatus}
            onChange={(e) => { setStockStatus(e.target.value); resetPage(); }}
            className="h-10 rounded-lg border border-secondary-200 bg-secondary-50 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {STOCK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearch('');
                setMpStatus('all');
                setReadiness('all');
                setHasVariants('all');
                setStockStatus('all');
                setCategoryId('all');
                resetPage();
              }}
              className="h-10 rounded-lg border border-secondary-200 px-3 text-sm text-secondary-500 hover:bg-secondary-50 hover:text-secondary-700 transition-colors whitespace-nowrap"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>

        {/* Row 3: Kritik Stok Ayarı */}
        <div className="flex items-center gap-3 border-t border-secondary-100 pt-3">
          <label className="text-sm font-medium text-secondary-600 whitespace-nowrap">Kritik Stok</label>
          <input
            type="number"
            min={0}
            value={minStockInput}
            onChange={(e) => setMinStockInput(Math.max(0, parseInt(e.target.value) || 0))}
            className="h-9 w-24 rounded-lg border border-secondary-200 bg-secondary-50 px-3 text-sm text-center focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveSettingsMutation.mutate(minStockInput)}
            disabled={saveSettingsMutation.isPending || minStockInput === (settingsData?.min_stock ?? 0)}
          >
            {saveSettingsMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Kaydet
          </Button>
          <span className="text-xs text-secondary-400">
            Stoku bu değerin altındaki ürünler Trendyol&apos;a gönderilmez
          </span>
        </div>
      </div>

      {/* Batch Notifications */}
      <BatchNotifications />

      {/* Trendyol Price Override Banner */}
      {priceOverrides && (Object.keys(priceOverrides.products).length > 0 || Object.keys(priceOverrides.variants).length > 0) && (
        <div className="flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-orange-700">
            <span className="font-semibold">Trendyol gönderim fiyatları hazır:</span>{' '}
            {Object.keys(priceOverrides.products).length + Object.keys(priceOverrides.variants).length} ürün/varyant için yeni fiyatlar tabloda gösteriliyor.
            <span className="ml-1 text-xs text-orange-500">(Sitedeki fiyatlar değişmedi)</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                const affectedProductIds = new Set<number>();
                // Override'lı ürün ID'lerini topla
                for (const pid of Object.keys(priceOverrides.products)) {
                  affectedProductIds.add(Number(pid));
                }
                // Override'lı varyantların ürün ID'lerini bul
                for (const vid of Object.keys(priceOverrides.variants)) {
                  const variantId = Number(vid);
                  const ownerProduct = products.find((p) =>
                    p.variants.some((v) => v.id === variantId)
                  );
                  if (ownerProduct) affectedProductIds.add(ownerProduct.id);
                }
                if (affectedProductIds.size === 0) {
                  toast.warning('Override\'lı ürün bulunamadı');
                  return;
                }
                priceStockMutation.mutate(Array.from(affectedProductIds));
              }}
              disabled={priceStockMutation.isPending}
            >
              {priceStockMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Trendyol&apos;a Gönder
            </Button>
            <button
              onClick={() => setPriceOverrides(null)}
              className="flex-shrink-0 rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors"
            >
              Temizle
            </button>
          </div>
        </div>
      )}

      {/* Legend — moved above table */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-secondary-200 bg-white px-4 py-3">
        <p className="text-xs font-medium text-secondary-500 uppercase tracking-wider">Hazırlik Göstergeleri</p>
        <span className="flex items-center gap-1.5 text-sm text-secondary-600">
          <Tag className="h-3.5 w-3.5 text-emerald-500" /> Barkod
        </span>
        <span className="flex items-center gap-1.5 text-sm text-secondary-600">
          <FolderTree className="h-3.5 w-3.5 text-emerald-500" /> Kategori Eşleşmesi
        </span>
        <span className="flex items-center gap-1.5 text-sm text-secondary-600">
          <Tag className="h-3.5 w-3.5 text-emerald-500" /> Marka Eşleşmesi
        </span>
        <span className="flex items-center gap-1.5 text-sm text-secondary-600">
          <ImageIcon className="h-3.5 w-3.5 text-emerald-500" /> Görsel
        </span>
        <span className="text-secondary-300">|</span>
        <span className="flex items-center gap-1.5 text-sm text-secondary-600">
          <Check className="h-3.5 w-3.5 text-emerald-500" /> Hazır
        </span>
        <span className="flex items-center gap-1.5 text-sm text-secondary-600">
          <X className="h-3.5 w-3.5 text-red-400" /> Eksik
        </span>
      </div>

      {/* Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary-200 bg-primary-50 p-4 sm:flex-row sm:items-center">
          <span className="text-sm font-medium text-primary-700">
            {selectedIds.size} ürün seçildi
            {hasOffPageSelections && (
              <span className="ml-1 text-xs font-normal text-primary-500">(sayfa disi secimler dahil)</span>
            )}
          </span>
          <div className="flex-1" />
          <div className="flex flex-wrap items-center gap-2">
            {(readyToSend.length > 0 || hasOffPageSelections) && (
              <Button
                onClick={handleSend}
                disabled={isAnyLoading}
                size="sm"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Trendyol&apos;a Gönder {hasOffPageSelections ? `(${selectedIds.size})` : `(${readyToSend.length})`}
              </Button>
            )}
            {sentSelected.length > 0 && !hasOffPageSelections && (
              <Button
                onClick={handlePriceStockUpdate}
                disabled={isAnyLoading}
                size="sm"
                variant="outline"
              >
                {priceStockMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Fiyat/Stok Güncelle ({sentSelected.length})
              </Button>
            )}
            <Button
              onClick={() => setShowBulkPriceDialog(true)}
              disabled={isAnyLoading}
              size="sm"
              variant="outline"
            >
              <Tag className="h-4 w-4" />
              Toplu Fiyat Güncelle ({selectedIds.size})
            </Button>
            <Button
              onClick={() => setSelectedIds(new Set())}
              size="sm"
              variant="ghost"
            >
              <X className="h-4 w-4" />
              Seçimi Kaldır
            </Button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="overflow-hidden rounded-xl border border-secondary-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-200 bg-secondary-50">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedIds.size === products.length && !hasOffPageSelections}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Ürün</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Barkod / SKU</th>
                <th className="px-4 py-3 text-right font-medium text-secondary-600">Fiyat</th>
                <th className="px-4 py-3 text-center font-medium text-secondary-600">Stok</th>
                <th className="px-4 py-3 text-center font-medium text-secondary-600">Varyant</th>
                <th className="px-4 py-3 text-center font-medium text-secondary-600">Hazırlik</th>
                <th className="px-4 py-3 text-center font-medium text-secondary-600">Durum</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-secondary-100">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-6 animate-pulse rounded bg-secondary-100" />
                    </td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-secondary-500">
                    <Package className="mx-auto h-10 w-10 text-secondary-300 mb-2" />
                    <p>Ürün bulunamadı</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const status = product.marketplaceStatus || 'not_sent';
                  const config = STATUS_CONFIG[status];
                  const StatusIcon = config.icon;
                  const isExpanded = expandedProductIds.has(product.id);

                  return (
                    <React.Fragment key={product.id}>
                    <tr
                      className={cn(
                        'border-b border-secondary-100 transition-colors hover:bg-secondary-50',
                        selectedIds.has(product.id) && 'bg-primary-50/50'
                      )}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-secondary-100">
                            {product.mainImage ? (
                              <Image
                                src={product.mainImage}
                                alt={product.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-secondary-300">
                                <Package className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-secondary-900 max-w-[250px]">{product.name}</p>
                            <p className="text-xs text-secondary-400">
                              {product.categoryName}
                              {product.brandName && ` · ${product.brandName}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Barcode / SKU */}
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-mono text-xs text-secondary-700">{product.barcode || '—'}</p>
                          {product.sku && (
                            <p className="font-mono text-xs text-secondary-400">{product.sku}</p>
                          )}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-right">
                        {product.comparePrice ? (
                          <>
                            <span className="font-semibold text-secondary-900">{formatPrice(product.comparePrice)}</span>
                            <p className="text-[11px] text-secondary-400">Site: {formatPrice(product.price)}</p>
                          </>
                        ) : (
                          <span className="font-semibold text-secondary-900">{formatPrice(product.price)}</span>
                        )}
                        {/* Varyantsız ürün override */}
                        {!product.hasVariants && priceOverrides?.products[product.id] != null && (
                          <div className="mt-0.5 flex items-center justify-end gap-1">
                            <span className="inline-flex items-center rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                              Yeni Fiyat
                            </span>
                            <span className="text-xs font-bold text-orange-700">
                              {formatPrice(priceOverrides.products[product.id])}
                            </span>
                          </div>
                        )}
                        {/* Varyantlı ürün — override fiyat aralığını göster */}
                        {product.hasVariants && priceOverrides && product.variants.some((v) => priceOverrides.variants[v.id] != null) && (() => {
                          const overridePrices = product.variants
                            .map((v) => priceOverrides.variants[v.id])
                            .filter((p): p is number => p != null);
                          const min = Math.min(...overridePrices);
                          const max = Math.max(...overridePrices);
                          return (
                            <div className="mt-0.5 flex items-center justify-end gap-1">
                              <span className="inline-flex items-center rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                                Yeni Fiyat
                              </span>
                              <span className="text-xs font-bold text-orange-700">
                                {min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3 text-center">
                        <div>
                          <span className={cn(
                            'font-medium',
                            product.stockQuantity > 0 ? 'text-emerald-600' : 'text-red-500'
                          )}>
                            {product.stockQuantity}
                          </span>
                          {product.hasVariants && (
                            <p className="text-[10px] text-secondary-400">{product.variantCount} varyant</p>
                          )}
                        </div>
                      </td>

                      {/* Variant */}
                      <td className="px-4 py-3 text-center">
                        {product.hasVariants ? (
                          <button
                            onClick={() => toggleExpand(product.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            <Layers className="h-3 w-3" />
                            Evet ({product.variantCount})
                            <ChevronDown className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-180')} />
                          </button>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-secondary-100 px-2 py-0.5 text-xs font-medium text-secondary-500">
                            Hayır
                          </span>
                        )}
                      </td>

                      {/* Readiness */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <ReadinessIcon ok={product.hasBarcode} title="Barkod" icon={Tag} />
                          <ReadinessIcon ok={product.hasCategoryMapping} title="Kategori Eşleşmesi" icon={FolderTree} />
                          <ReadinessIcon ok={product.hasBrandMapping} title="Marka Eşleşmesi" icon={Tag} />
                          <ReadinessIcon ok={product.hasImages} title="Görsel" icon={ImageIcon} />
                        </div>
                        {product.errorMessage && (
                          <p className="mt-1 text-xs text-red-500 text-center truncate max-w-[160px]" title={product.errorMessage}>
                            {product.errorMessage}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <Badge variant={config.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </td>
                    </tr>

                    {/* Expanded variant details */}
                    {isExpanded && product.variants.length > 0 && (
                      <tr className="border-b border-secondary-100">
                        <td colSpan={8} className="px-4 py-3 bg-blue-50/50">
                          <div className="pl-8">
                            <p className="text-xs font-semibold text-secondary-600 mb-2">Varyant Detaylari</p>
                            <table className="w-full text-xs border border-secondary-200 rounded-lg overflow-hidden">
                              <thead>
                                <tr className="bg-secondary-100">
                                  <th className="px-3 py-1.5 text-left font-medium text-secondary-600">Ozellik</th>
                                  <th className="px-3 py-1.5 text-left font-medium text-secondary-600">Barkod</th>
                                  <th className="px-3 py-1.5 text-left font-medium text-secondary-600">SKU</th>
                                  <th className="px-3 py-1.5 text-right font-medium text-secondary-600">Fiyat</th>
                                  <th className="px-3 py-1.5 text-center font-medium text-secondary-600">Stok</th>
                                </tr>
                              </thead>
                              <tbody>
                                {product.variants.map((variant) => (
                                  <tr key={variant.id} className="border-t border-secondary-200 bg-white">
                                    <td className="px-3 py-1.5">
                                      {variant.values.length > 0
                                        ? variant.values.map((v) => `${v.typeName}: ${v.value}`).join(', ')
                                        : <span className="text-secondary-400">—</span>
                                      }
                                    </td>
                                    <td className="px-3 py-1.5 font-mono">
                                      {variant.barcode ? (
                                        <span className="text-secondary-700">{variant.barcode}</span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-red-500">
                                          <AlertTriangle className="h-3 w-3" />
                                          Eksik
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-1.5 font-mono text-secondary-500">
                                      {variant.sku || '—'}
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-medium text-secondary-900">
                                      {variant.comparePrice ? (
                                        <>
                                          {formatPrice(variant.comparePrice)}
                                          <p className="text-[10px] text-secondary-400 font-normal">Site: {formatPrice(variant.price)}</p>
                                        </>
                                      ) : (
                                        formatPrice(variant.price)
                                      )}
                                      {priceOverrides?.variants[variant.id] != null && (
                                        <div className="mt-0.5 flex items-center justify-end gap-1">
                                          <span className="inline-flex items-center rounded bg-orange-100 px-1 py-0.5 text-[9px] font-semibold text-orange-700">
                                            Yeni Fiyat
                                          </span>
                                          <span className="text-[11px] font-bold text-orange-700">
                                            {formatPrice(priceOverrides.variants[variant.id])}
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-3 py-1.5 text-center">
                                      <span className={cn(
                                        'font-medium',
                                        variant.stockQuantity > 0 ? 'text-emerald-600' : 'text-red-500'
                                      )}>
                                        {variant.stockQuantity}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination + Bulk Selection */}
        <div className="flex flex-col gap-3 border-t border-secondary-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {meta && meta.last_page > 1 && (
              <p className="text-sm text-secondary-500">
                Toplam {meta.total} ürün, Sayfa {meta.current_page} / {meta.last_page}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk select: all in category */}
            {categoryId !== 'all' && meta && meta.total > products.length && (
              <button
                onClick={handleSelectAllInCategory}
                disabled={bulkSelectLoading}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 text-xs font-medium text-primary-700 hover:bg-primary-100 transition-colors disabled:opacity-50"
              >
                {bulkSelectLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ListChecks className="h-3 w-3" />}
                {selectedCategoryName} - Tüm Ürünleri Sec ({meta.total})
              </button>
            )}

            {/* Bulk select: ALL products */}
            {meta && (
              <button
                onClick={handleSelectAll}
                disabled={bulkSelectLoading}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                title="Dikkat: Tüm ürünleri seçmek büyük işlem hacmi oluşturabilir"
              >
                {bulkSelectLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
                Tüm Ürünleri Sec (önerilmez)
              </button>
            )}

            {/* Pagination buttons */}
            {meta && meta.last_page > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-secondary-200 text-secondary-600 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                  disabled={page === meta.last_page}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-secondary-200 text-secondary-600 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Price Update Dialog */}
      <BulkPriceUpdateDialog
        isOpen={showBulkPriceDialog}
        onClose={() => setShowBulkPriceDialog(false)}
        selectedProductIds={Array.from(selectedIds)}
        onApply={(overrides) => {
          setPriceOverrides((prev) => {
            if (!prev) return overrides;
            return {
              products: { ...prev.products, ...overrides.products },
              variants: { ...prev.variants, ...overrides.variants },
            };
          });
        }}
      />

      {/* Attribute Mapping Wizard */}
      <AttributeMappingWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        selectedProductIds={hasOffPageSelections ? Array.from(selectedIds) : readyToSend.map((p) => p.id)}
        priceOverrides={priceOverrides ? { ...priceOverrides.products, ...priceOverrides.variants } : null}
        defaultMinStock={settingsData?.min_stock ?? 0}
        onSuccess={(result) => {
          toast.success(result.message || 'Ürünler gönderildi');
          if (result.batchId) {
            toast.info(`Batch ID: ${result.batchId}`, { duration: 8000 });
          }
          setSelectedIds(new Set());
          queryClient.invalidateQueries({ queryKey: ['trendyol-local-products'] });
        }}
      />
    </div>
  );
}

// ─── Readiness Icon ─────────────────────────────────────────────
function ReadinessIcon({ ok, title, icon: Icon }: { ok: boolean; title: string; icon: React.ElementType }) {
  return (
    <span
      title={`${title}: ${ok ? 'Hazır' : 'Eksik'}`}
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded-md',
        ok ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-400'
      )}
    >
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
    </span>
  );
}

// ─── Trendyol Products Tab ──────────────────────────────────────
interface TrendyolProduct {
  title: string;
  barcode: string;
  quantity: number;
  salePrice: number;
  listPrice: number;
  images: Array<{ url: string }>;
  stockCode: string;
  approved: boolean;
  onSale: boolean;
  categoryName: string;
}

interface TrendyolProductsResponse {
  data: TrendyolProduct[];
  meta: {
    page: number;
    totalPages: number;
    totalElements: number;
  };
}

function TrendyolProductsTab() {
  const queryClient = useQueryClient();
  const [tPage, setTPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [barcodeFilter, setBarcodeFilter] = useState('');

  const { data, isLoading } = useQuery<TrendyolProductsResponse>({
    queryKey: ['trendyol-api-products', { page: tPage, barcode: barcodeFilter }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: tPage, size: 50 };
      if (barcodeFilter.trim()) params.barcode = barcodeFilter.trim();
      const { data } = await api.get('/admin/trendyol/trendyol-products', { params });
      return data;
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/trendyol/import-products');
      return data;
    },
    onSuccess: (data) => {
      const s = data.stats;
      toast.success(
        `Import tamamlandı: ${s.matched} eşleşti, ${s.created} yeni, ${s.updated} güncellendi, ${s.unmatched} eşleşmedi`
      );
      queryClient.invalidateQueries({ queryKey: ['trendyol-local-products'] });
      queryClient.invalidateQueries({ queryKey: ['trendyol-products'] });
    },
    onError: () => {
      toast.error('Import sırasında bir hata oluştu.');
    },
  });

  const stockSyncMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/trendyol/stock-sync');
      return data;
    },
    onSuccess: (data) => {
      const log = data.log;
      const batchIds = log.batch_request_ids ?? [];
      toast.success(
        `${data.message}${batchIds.length > 0 ? ` (${batchIds.length} batch)` : ''}`
      );
      queryClient.invalidateQueries({ queryKey: ['trendyol-stock-sync-results'] });
    },
    onError: () => {
      toast.error('Stok sync sırasında bir hata oluştu.');
    },
  });

  const products = data?.data ?? [];
  const meta = data?.meta;

  const handleSearch = () => {
    setBarcodeFilter(searchInput);
    setTPage(0);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-secondary-900">Trendyol&apos;daki Ürünler</h2>
          <p className="text-sm text-secondary-500">
            Trendyol API&apos;den çekilen ürün listesi
          </p>
        </div>
        <div className="flex items-center gap-2">
          {meta && (
            <Badge variant="outline">{meta.totalElements} ürün</Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => stockSyncMutation.mutate()}
            disabled={stockSyncMutation.isPending}
          >
            {stockSyncMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-1.5" />
            )}
            {stockSyncMutation.isPending ? 'Senkronize ediliyor...' : 'Stok Senkronize Et'}
          </Button>
          <Button
            size="sm"
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            {importMutation.isPending ? 'Eşleştiriliyor...' : 'Ürünleri Eşleştir'}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Barkod veya stok kodu ile ara..."
            className="h-10 w-full rounded-lg border border-secondary-200 bg-secondary-50 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <Button size="sm" onClick={handleSearch} className="h-10">
          <Search className="h-4 w-4 mr-1" />
          Ara
        </Button>
        {barcodeFilter && (
          <Button
            size="sm"
            variant="outline"
            className="h-10"
            onClick={() => { setSearchInput(''); setBarcodeFilter(''); setTPage(0); }}
          >
            <X className="h-4 w-4 mr-1" />
            Temizle
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-secondary-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-100 bg-secondary-50/50">
                <th className="px-4 py-3 text-left font-medium text-secondary-600 w-12">Görsel</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Ürün Adı</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Barkod</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Stok Kodu</th>
                <th className="px-4 py-3 text-right font-medium text-secondary-600">Stok</th>
                <th className="px-4 py-3 text-right font-medium text-secondary-600">Satış Fiyatı</th>
                <th className="px-4 py-3 text-right font-medium text-secondary-600">Liste Fiyatı</th>
                <th className="px-4 py-3 text-center font-medium text-secondary-600">Durum</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Kategori</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary-500" />
                    <p className="mt-2 text-sm text-secondary-500">Ürünler yükleniyor...</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-secondary-500">
                    Ürün bulunamadı
                  </td>
                </tr>
              ) : (
                products.map((p, i) => (
                  <tr key={`${p.barcode}-${i}`} className="hover:bg-secondary-50/50">
                    <td className="px-4 py-3">
                      {p.images?.[0]?.url ? (
                        <Image
                          src={p.images[0].url}
                          alt={p.title}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-md object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-secondary-100 flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-secondary-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-secondary-900 max-w-[250px] truncate" title={p.title}>
                      {p.title}
                    </td>
                    <td className="px-4 py-3 text-secondary-600 font-mono text-xs">{p.barcode}</td>
                    <td className="px-4 py-3 text-secondary-600 font-mono text-xs">{p.stockCode}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'font-medium',
                        p.quantity === 0 ? 'text-red-500' : p.quantity < 5 ? 'text-amber-500' : 'text-secondary-900'
                      )}>
                        {p.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-secondary-900">
                      {formatPrice(p.salePrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-secondary-500">
                      {formatPrice(p.listPrice)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {p.approved && (
                          <Badge variant="success" className="text-xs">Onaylı</Badge>
                        )}
                        {p.onSale && (
                          <Badge variant="info" className="text-xs">Satışta</Badge>
                        )}
                        {!p.approved && !p.onSale && (
                          <Badge variant="outline" className="text-xs">Pasif</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-secondary-600 text-xs max-w-[150px] truncate" title={p.categoryName}>
                      {p.categoryName || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-secondary-100 px-4 py-3">
            <p className="text-sm text-secondary-500">
              Sayfa {meta.page + 1} / {meta.totalPages} ({meta.totalElements} ürün)
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={meta.page === 0}
                onClick={() => setTPage(meta.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={meta.page >= meta.totalPages - 1}
                onClick={() => setTPage(meta.page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Stock Sync Notifications */}
      <StockSyncNotifications />
    </div>
  );
}
