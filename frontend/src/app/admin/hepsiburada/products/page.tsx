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
  DollarSign,
  Activity,
  Store,
} from 'lucide-react';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AttributeMappingWizard from '@/components/admin/hepsiburada/AttributeMappingWizard';
import BatchNotifications from '@/components/admin/hepsiburada/BatchNotifications';
import StockSyncNotifications from '@/components/admin/hepsiburada/StockSyncNotifications';
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
  { value: 'all', label: 'Tüm Hazırlık' },
  { value: 'ready', label: 'Hazır' },
  { value: 'not_ready', label: 'Hazır Değil' },
];

const STOCK_OPTIONS = [
  { value: 'all', label: 'Tüm Stok' },
  { value: 'in_stock', label: 'Stokta' },
  { value: 'out_of_stock', label: 'Stok Yok' },
];

const VARIANT_OPTIONS = [
  { value: 'all', label: 'Tüm Ürünler' },
  { value: 'yes', label: 'Varyantlı' },
  { value: 'no', label: 'Varyantsız' },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);
}

// ─── Tab Wrapper ────────────────────────────────────────────────
export default function HepsiburadaProductsPage() {
  const [activeTab, setActiveTab] = useState<'local' | 'hepsiburada'>('local');

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
          onClick={() => setActiveTab('hepsiburada')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === 'hepsiburada'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
          )}
        >
          <Store className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
          Hepsiburada Ürünleri
        </button>
      </div>

      {activeTab === 'local' ? <LocalProductsTab /> : <HepsiburadaListingsTab />}
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
  const [stockStatus, setStockStatus] = useState('all');
  const [hasVariants, setHasVariants] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkSelectLoading, setBulkSelectLoading] = useState(false);
  const [expandedProductIds, setExpandedProductIds] = useState<Set<number>>(new Set());
  const [minStockInput, setMinStockInput] = useState<number>(0);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardProductIds, setWizardProductIds] = useState<number[]>([]);

  // Bulk price update state
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [priceOverrides, setPriceOverrides] = useState<PriceOverrides | null>(null);

  // Fetch HB settings (kritik stok)
  const { data: settingsData } = useQuery<{ min_stock: number }>({
    queryKey: ['hepsiburada-settings'],
    queryFn: async () => {
      const { data } = await api.get('/admin/hepsiburada/settings');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    if (settingsData) {
      setMinStockInput(settingsData.min_stock);
    }
  }, [settingsData]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (minStock: number) => {
      const { data } = await api.put('/admin/hepsiburada/settings', { min_stock: minStock });
      return data;
    },
    onSuccess: () => {
      toast.success('Kritik stok ayarı kaydedildi');
      queryClient.invalidateQueries({ queryKey: ['hepsiburada-settings'] });
    },
    onError: () => {
      toast.error('Ayar kaydedilemedi');
    },
  });

  const stockSyncMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/hepsiburada/stock-sync');
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['hepsiburada-stock-sync-results'] });
    },
    onError: () => {
      toast.error('Stok sync sırasında bir hata oluştu.');
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

  const resetPage = () => setPage(1);

  // Build filter params
  const filterParams = useMemo(() => {
    const params: Record<string, string | number> = { page, per_page: 20 };
    if (search.trim()) params.search = search.trim();
    if (mpStatus !== 'all') params.mp_status = mpStatus;
    if (readiness !== 'all') params.readiness = readiness;
    if (stockStatus !== 'all') params.stock_status = stockStatus;
    if (hasVariants !== 'all') params.has_variants = hasVariants;
    if (categoryId !== 'all') params.category_id = categoryId;
    return params;
  }, [search, mpStatus, readiness, stockStatus, hasVariants, categoryId, page]);

  // Fetch products
  const { data, isLoading } = useQuery<LocalProductsResponse>({
    queryKey: ['hepsiburada-local-products', filterParams],
    queryFn: async () => {
      const { data } = await api.get('/admin/hepsiburada/local-products', { params: filterParams });
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
    if (mpStatus !== 'all') params.mp_status = mpStatus;
    if (readiness !== 'all') params.readiness = readiness;
    if (hasVariants !== 'all') params.has_variants = hasVariants;
    if (stockStatus !== 'all') params.stock_status = stockStatus;
    const { data } = await api.get<{ ids: number[]; total: number }>('/admin/hepsiburada/local-product-ids', { params });
    return data;
  }, [categoryId, mpStatus, readiness, hasVariants, stockStatus]);

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

  // Update price/stock mutation
  const priceStockMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      const items = productIds.map((id) => {
        const p = products.find((pr) => pr.id === id);
        return { product_id: id, price: p?.price, stock: p?.stockQuantity };
      });
      const { data } = await api.post('/admin/hepsiburada/products/price-stock', { items });
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message || 'Fiyat/stok güncellendi');
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['hepsiburada-local-products'] });
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

  // Products ready for sending (via wizard)
  const readyToSend = useMemo(() => {
    return products.filter(
      (p) =>
        selectedIds.has(p.id) &&
        p.hasBarcode &&
        p.hasCategoryMapping &&
        p.hasImages
    );
  }, [products, selectedIds]);

  const sentSelected = useMemo(() => {
    return products.filter(
      (p) => selectedIds.has(p.id) && p.marketplaceStatus && p.marketplaceStatus !== 'rejected'
    );
  }, [products, selectedIds]);

  const handleSend = () => {
    if (!hasOffPageSelections && readyToSend.length === 0) {
      toast.warning('Gönderilebilecek hazır ürün yok. Barkod, kategori eşleşmesi ve görsel gereklidir.');
      return;
    }
    setWizardProductIds(hasOffPageSelections ? Array.from(selectedIds) : readyToSend.map((p) => p.id));
    setWizardOpen(true);
  };

  const handleWizardSuccess = () => {
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['hepsiburada-local-products'] });
    queryClient.invalidateQueries({ queryKey: ['hepsiburada-batch-results'] });
  };

  const handlePriceStockUpdate = () => {
    if (sentSelected.length === 0) {
      toast.warning('Fiyat/stok güncellenecek gönderilmiş ürün seçilmedi.');
      return;
    }
    priceStockMutation.mutate(sentSelected.map((p) => p.id));
  };

  const flattenOverrides = (overrides: PriceOverrides | null): Record<number, number> => {
    if (!overrides) return {};
    return { ...overrides.products, ...overrides.variants };
  };

  const priceOverrideCount = priceOverrides
    ? Object.keys(priceOverrides.products).length + Object.keys(priceOverrides.variants).length
    : 0;

  const isAnyLoading = priceStockMutation.isPending;
  const hasActiveFilters = readiness !== 'all' || hasVariants !== 'all' || stockStatus !== 'all' || categoryId !== 'all' || mpStatus !== 'all' || search.trim() !== '';
  const selectedCategoryName = categoryId !== 'all' ? categories.find((c) => String(c.id) === categoryId)?.name : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Hepsiburada Ürün Gönderim</h1>
          <p className="mt-1 text-sm text-secondary-500">
            Ürünlerinizi Hepsiburada pazaryerine gönderin ve yönetin
          </p>
        </div>
        {meta && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{meta.total} ürün</Badge>
          </div>
        )}
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
            Stoku bu değerin altındaki ürünler Hepsiburada&apos;ya gönderilmez
          </span>
          <div className="ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => stockSyncMutation.mutate()}
              disabled={stockSyncMutation.isPending}
            >
              {stockSyncMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Activity className="h-3.5 w-3.5" />
              )}
              {stockSyncMutation.isPending ? 'Senkronize ediliyor...' : 'Stok Senkronize Et'}
            </Button>
          </div>
        </div>
      </div>

      {/* Batch Notifications */}
      <BatchNotifications />

      {/* Stock Sync Notifications */}
      <StockSyncNotifications />

      {/* Legend — above table */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-secondary-200 bg-white px-4 py-3">
        <p className="text-xs font-medium text-secondary-500 uppercase tracking-wider">Hazırlık Göstergeleri</p>
        <span className="flex items-center gap-1.5 text-sm text-secondary-600">
          <Tag className="h-3.5 w-3.5 text-emerald-500" /> Barkod
        </span>
        <span className="flex items-center gap-1.5 text-sm text-secondary-600">
          <FolderTree className="h-3.5 w-3.5 text-emerald-500" /> Kategori Eşleşmesi
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
              <span className="ml-1 text-xs font-normal text-primary-500">(sayfa dışı seçimler dahil)</span>
            )}
          </span>
          <div className="flex-1" />
          <div className="flex flex-wrap items-center gap-2">
            {(readyToSend.length > 0 || hasOffPageSelections) && (
              <>
                <Button
                  onClick={() => setBulkPriceOpen(true)}
                  disabled={isAnyLoading}
                  size="sm"
                  variant="outline"
                >
                  <DollarSign className="h-4 w-4" />
                  Fiyat Güncelle
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={isAnyLoading}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                  Hepsiburada&apos;ya Gönder {hasOffPageSelections ? `(${selectedIds.size})` : `(${readyToSend.length})`}
                </Button>
              </>
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

      {/* Price Override Badge */}
      {priceOverrideCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">
            Fiyat güncellemesi aktif ({priceOverrideCount} ürün/varyant)
          </span>
          <button
            onClick={() => setPriceOverrides(null)}
            className="ml-auto text-xs text-emerald-600 hover:text-emerald-800 underline"
          >
            Kaldır
          </button>
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
                <th className="px-4 py-3 text-center font-medium text-secondary-600">Hazırlık</th>
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
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>

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

                      <td className="px-4 py-3">
                        <div>
                          <p className="font-mono text-xs text-secondary-700">{product.barcode || '—'}</p>
                          {product.sku && (
                            <p className="font-mono text-xs text-secondary-400">{product.sku}</p>
                          )}
                        </div>
                      </td>

                      {/* Price - override varsa yeni fiyatı göster */}
                      <td className="px-4 py-3 text-right">
                        {(() => {
                          const overridePrice = priceOverrides?.products[product.id];
                          const hasVariantOverrides = product.hasVariants && priceOverrides && product.variants.some((v) => priceOverrides.variants[v.id] != null);
                          if (overridePrice != null) {
                            return (
                              <>
                                <span className="font-semibold text-emerald-700">{formatPrice(overridePrice)}</span>
                                <p className="text-[10px] text-secondary-400 line-through">{formatPrice(product.price)}</p>
                                <p className="text-[10px] text-emerald-600 font-medium">HB fiyatı</p>
                              </>
                            );
                          }
                          if (hasVariantOverrides && priceOverrides) {
                            const overridePrices = product.variants
                              .map((v) => priceOverrides.variants[v.id])
                              .filter((p): p is number => p != null);
                            const minP = Math.min(...overridePrices);
                            const maxP = Math.max(...overridePrices);
                            return (
                              <>
                                <span className="font-semibold text-emerald-700">
                                  {minP === maxP ? formatPrice(minP) : `${formatPrice(minP)} - ${formatPrice(maxP)}`}
                                </span>
                                <p className="text-[10px] text-secondary-400 line-through">{formatPrice(product.price)}</p>
                                <p className="text-[10px] text-emerald-600 font-medium">HB fiyatı</p>
                              </>
                            );
                          }
                          if (product.comparePrice) {
                            return (
                              <>
                                <span className="font-semibold text-secondary-900">{formatPrice(product.comparePrice)}</span>
                                <p className="text-[11px] text-secondary-400">Site: {formatPrice(product.price)}</p>
                              </>
                            );
                          }
                          return <span className="font-semibold text-secondary-900">{formatPrice(product.price)}</span>;
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

                      {/* Variant - expandable */}
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
                          <ReadinessIcon ok={product.hasBarcode} title="Barkod" />
                          <ReadinessIcon ok={product.hasCategoryMapping} title="Kategori Eşleşmesi" />
                          <ReadinessIcon ok={product.hasImages} title="Görsel" />
                        </div>
                        {product.errorMessage && (
                          <p className="mt-1 text-xs text-red-500 text-center truncate max-w-[160px]" title={product.errorMessage}>
                            {product.errorMessage}
                          </p>
                        )}
                      </td>

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
                            <p className="text-xs font-semibold text-secondary-600 mb-2">Varyant Detayları</p>
                            <table className="w-full text-xs border border-secondary-200 rounded-lg overflow-hidden">
                              <thead>
                                <tr className="bg-secondary-100">
                                  <th className="px-3 py-1.5 text-left font-medium text-secondary-600">Özellik</th>
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
                                    <td className="px-3 py-1.5 text-right font-medium">
                                      {(() => {
                                        const vOverride = priceOverrides?.variants[variant.id];
                                        if (vOverride != null) {
                                          return (
                                            <>
                                              <span className="text-emerald-700">{formatPrice(vOverride)}</span>
                                              <p className="text-[10px] text-secondary-400 line-through font-normal">{formatPrice(variant.price)}</p>
                                            </>
                                          );
                                        }
                                        if (variant.comparePrice) {
                                          return (
                                            <>
                                              <span className="text-secondary-900">{formatPrice(variant.comparePrice)}</span>
                                              <p className="text-[10px] text-secondary-400 font-normal">Site: {formatPrice(variant.price)}</p>
                                            </>
                                          );
                                        }
                                        return <span className="text-secondary-900">{formatPrice(variant.price)}</span>;
                                      })()}
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
                {selectedCategoryName} - Tüm Ürünleri Seç ({meta.total})
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
                Tüm Ürünleri Seç (önerilmez)
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

      {/* Wizard Dialog */}
      <AttributeMappingWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        selectedProductIds={wizardProductIds}
        defaultMinStock={settingsData?.min_stock ?? 0}
        priceOverrides={flattenOverrides(priceOverrides)}
        onSuccess={handleWizardSuccess}
      />

      {/* Bulk Price Update Dialog */}
      <BulkPriceUpdateDialog
        isOpen={bulkPriceOpen}
        onClose={() => setBulkPriceOpen(false)}
        selectedProductIds={hasOffPageSelections ? Array.from(selectedIds) : readyToSend.map((p) => p.id)}
        previewEndpoint="/admin/hepsiburada/products/bulk-price-preview"
        marketplace="Hepsiburada"
        onApply={(overrides) => setPriceOverrides(overrides)}
      />
    </div>
  );
}

// ─── Readiness Icon ─────────────────────────────────────────────
function ReadinessIcon({ ok, title }: { ok: boolean; title: string }) {
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

// ─── Hepsiburada Listings Tab ──────────────────────────────────
interface HBListing {
  merchantSku: string;
  hepsiburadaSku: string;
  productName: string;
  price: number;
  availableStock: number;
  dispatchTime: number;
  cargoCompany: string;
  listingStatus: string;
}

interface HBListingsResponse {
  data: {
    listings: HBListing[];
    totalCount: number;
    offset: number;
    limit: number;
  };
}

function HepsiburadaListingsTab() {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const [searchInput, setSearchInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const { data, isLoading } = useQuery<HBListingsResponse>({
    queryKey: ['hepsiburada-listings', { offset, limit }],
    queryFn: async () => {
      const { data } = await api.get('/admin/hepsiburada/listings', {
        params: { offset, limit },
      });
      return data;
    },
  });

  const stockSyncMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/hepsiburada/stock-sync');
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['hepsiburada-stock-sync-results'] });
    },
    onError: () => {
      toast.error('Stok sync sırasında bir hata oluştu.');
    },
  });

  const listings = data?.data?.listings ?? [];
  const totalCount = data?.data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / limit);
  const currentPage = Math.floor(offset / limit);

  const filteredListings = searchFilter
    ? listings.filter(
        (l) =>
          l.merchantSku?.toLowerCase().includes(searchFilter.toLowerCase()) ||
          l.hepsiburadaSku?.toLowerCase().includes(searchFilter.toLowerCase()) ||
          l.productName?.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : listings;

  const handleSearch = () => {
    setSearchFilter(searchInput);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-secondary-900">Hepsiburada&apos;daki Ürünler</h2>
          <p className="text-sm text-secondary-500">
            Hepsiburada Listing API&apos;den çekilen ürün listesi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{totalCount} ürün</Badge>
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
            placeholder="SKU, HB SKU veya ürün adı ile ara..."
            className="h-10 w-full rounded-lg border border-secondary-200 bg-secondary-50 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <Button size="sm" onClick={handleSearch} className="h-10">
          <Search className="h-4 w-4 mr-1" />
          Ara
        </Button>
        {searchFilter && (
          <Button
            size="sm"
            variant="outline"
            className="h-10"
            onClick={() => { setSearchInput(''); setSearchFilter(''); }}
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
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Ürün Adı</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Merchant SKU</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">HB SKU</th>
                <th className="px-4 py-3 text-right font-medium text-secondary-600">Stok</th>
                <th className="px-4 py-3 text-right font-medium text-secondary-600">Fiyat</th>
                <th className="px-4 py-3 text-center font-medium text-secondary-600">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary-500" />
                    <p className="mt-2 text-sm text-secondary-500">Ürünler yükleniyor...</p>
                  </td>
                </tr>
              ) : filteredListings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-secondary-500">
                    Ürün bulunamadı
                  </td>
                </tr>
              ) : (
                filteredListings.map((listing, i) => (
                  <tr key={`${listing.merchantSku}-${i}`} className="hover:bg-secondary-50/50">
                    <td className="px-4 py-3 font-medium text-secondary-900 max-w-[300px] truncate" title={listing.productName}>
                      {listing.productName || '-'}
                    </td>
                    <td className="px-4 py-3 text-secondary-600 font-mono text-xs">{listing.merchantSku}</td>
                    <td className="px-4 py-3 text-secondary-600 font-mono text-xs">{listing.hepsiburadaSku || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'font-medium',
                        listing.availableStock === 0 ? 'text-red-500' : listing.availableStock < 5 ? 'text-amber-500' : 'text-secondary-900'
                      )}>
                        {listing.availableStock ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-secondary-900">
                      {listing.price ? formatPrice(listing.price) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {listing.listingStatus === 'Active' || listing.listingStatus === 'ACTIVE' ? (
                        <Badge variant="success" className="text-xs">Aktif</Badge>
                      ) : listing.listingStatus === 'INACTIVE' || listing.listingStatus === 'Inactive' ? (
                        <Badge variant="outline" className="text-xs">Pasif</Badge>
                      ) : (
                        <Badge variant="warning" className="text-xs">{listing.listingStatus || '-'}</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-secondary-100 px-4 py-3">
            <p className="text-sm text-secondary-500">
              Sayfa {currentPage + 1} / {totalPages} ({totalCount} ürün)
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={offset + limit >= totalCount}
                onClick={() => setOffset(offset + limit)}
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
