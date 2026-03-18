'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogClose,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Search,
  Save,
  Play,
  Upload,
  ChevronLeft,
  ChevronRight,
  Package,
  Filter,
  CheckSquare,
  ImageIcon,
  Tag,
  DollarSign,
  Type,
  BarChart3,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { useImportProgress } from '@/hooks/useImportProgress';
import ImportProgressPanel from '@/components/admin/ImportProgressPanel';
import WizardStepper from '@/components/admin/WizardStepper';

// --- Types ---

interface XmlSource {
  id: number;
  name: string;
  url: string;
  type: 'supplier' | 'custom';
  mappingConfig: {
    field_map?: Record<string, string>;
    product_node?: string;
    wrapper_node?: string;
  } | null;
  autoSync: boolean;
  syncInterval: string | null;
  lastSyncedAt: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
}

interface ImportLog {
  id: number;
  totalProducts: number;
  created: number;
  updated: number;
  failed: number;
  errorLog: string[];
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
}

interface VariantOption {
  type: string;
  value: string;
}

interface ProductVariant {
  sku?: string;
  barcode?: string;
  stock?: number;
  price?: string;
  images?: string[];
  options?: VariantOption[];
}

interface PreviewProduct {
  _index: number;
  barcode?: string;
  name?: string;
  price?: string;
  stock_quantity?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  _category_path?: string;
  _images?: string[];
  _raw?: Record<string, unknown>;
  _variants?: ProductVariant[];
  _adjusted_price?: number;
  _adjusted_compare_price?: number | null;
  _original_price?: number;
  _original_compare_price?: number;
}

interface PreviewMeta {
  total: number;
  categories: string[];
  brands: string[];
  prepared_at: string;
}

interface PaginatedPreview {
  products: PreviewProduct[];
  total: number;
  filtered_total?: number;
  available_brands?: string[];
  available_categories?: string[];
  page: number;
  per_page: number;
  last_page: number;
}

interface ImportFilters {
  product_indices?: number[];
  categories?: string[];
  brands?: string[];
  limit?: number;
  price_adjustment_percent?: number;
}

interface XmlProductItem {
  id: number;
  external_sku: string;
  external_name: string;
  price_in_xml: string;
  stock_in_xml: number;
  sync_status: string;
  last_seen_at: string | null;
  local_product_id: number | null;
  changes_detected: Record<string, { old: string; new: string }> | null;
  product?: {
    id: number;
    name: string;
    sku: string;
    barcode: string;
    price: number;
    compare_price: number;
    stock_quantity: number;
  } | null;
}

interface XmlProductComparison {
  total: number;
  matched: number;
  unmatched: number;
  with_changes: number;
}

interface BulkPreviewItem {
  id: number;
  name: string;
  before: Record<string, string | number>;
  after: Record<string, string | number>;
}

const DB_FIELDS: { key: string; label: string }[] = [
  { key: 'sku', label: 'SKU (Stok Kodu)' },
  { key: 'barcode', label: 'Barkod (EAN/GTIN)' },
  { key: 'name', label: 'Ürün Adı' },
  { key: 'description', label: 'Açıklama' },
  { key: 'short_description', label: 'Kisa Açıklama' },
  { key: 'price', label: 'Fiyat' },
  { key: 'compare_price', label: 'Karşılaştırma Fiyatı' },
  { key: 'cost_price', label: 'Maliyet Fiyatı' },
  { key: 'stock_quantity', label: 'Stok' },
  { key: 'category', label: 'Ana Kategori' },
  { key: 'subcategory', label: 'Alt Kategori 1' },
  { key: 'subcategory_2', label: 'Alt Kategori 2' },
  { key: 'subcategory_3', label: 'Alt Kategori 3' },
  { key: 'subcategory_4', label: 'Alt Kategori 4' },
  { key: 'brand', label: 'Marka' },
  { key: 'weight', label: 'Ağırlık' },
  { key: 'currency', label: 'Para Birimi' },
  { key: 'tax', label: 'KDV Orani' },
];

// Backend's defaultFieldMap mirrored for auto-suggestion
const DEFAULT_FIELD_MAP: Record<string, string[]> = {
  sku: ['stockCode', 'stokKodu', 'sku', 'product_code', 'urunKodu', 'productCode'],
  barcode: ['barcode', 'barkod', 'eanCode', 'ean', 'gtinBarcode'],
  name: ['title', 'name', 'baslik', 'urunAdi', 'product_name', 'productName', 'label', 'etiket'],
  description: ['description', 'açıklama', 'desc', 'urunAçıklama', 'details', 'detay'],
  short_description: ['shortDescription', 'kisaAçıklama', 'short_desc'],
  price: ['price', 'fiyat', 'salePrice', 'satisFiyati', 'buyingPrice', 'alisFiyati', 'price1'],
  compare_price: ['listPrice', 'listeFiyati', 'oldPrice', 'eskiFiyat', 'comparePrice', 'marketPrice', 'piyasaFiyati'],
  cost_price: ['costPrice', 'maliyet', 'cost'],
  stock_quantity: ['quantity', 'stock', 'stok', 'miktar', 'adet', 'stockAmount', 'stokMiktari'],
  category: ['mainCategory', 'anaKategori', 'main_category', 'category', 'kategori', 'categoryPath', 'kategoriYolu'],
  subcategory: ['top_category', 'topCategory', 'subCategory', 'altKategori', 'sub_category'],
  subcategory_2: ['sub_category', 'sub_category_2', 'subCategory2', 'altKategori2'],
  subcategory_3: ['sub_category_2', 'sub_category_3', 'subCategory3', 'altKategori3'],
  subcategory_4: ['sub_category_3', 'sub_category_4', 'subCategory4', 'altKategori4'],
  brand: ['brand', 'marka', 'brandName', 'markaAdi'],
  weight: ['weight', 'agirlik', 'desi', 'dimensionalWeight'],
  currency: ['currency', 'paraBirimi', 'currencyType', 'currencyAbbr', 'dovizTipi'],
  tax: ['tax', 'kdv', 'vergi', 'taxRate'],
};

/** Given detected XML fields, find the best match for a DB field (case-insensitive). */
function suggestMapping(dbField: string, xmlFields: string[]): string | null {
  const candidates = DEFAULT_FIELD_MAP[dbField];
  if (!candidates) return null;
  const xmlLower = xmlFields.map((f) => ({ original: f, lower: f.toLowerCase() }));
  for (const candidate of candidates) {
    const match = xmlLower.find((x) => x.lower === candidate.toLowerCase());
    if (match) return match.original;
  }
  return null;
}

const WIZARD_STEPS = [
  { label: 'Genel Bilgiler' },
  { label: 'Alan Eşleştirme' },
  { label: 'Kategori Eşleştirme' },
  { label: 'Fiyat Kuralları' },
  { label: 'Önizleme & Secim' },
  { label: 'Import' },
  { label: 'Toplu İşlemler' },
];

function ProductImageGallery({ images }: { images: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const validImages = images.filter((url) => url && url.trim() !== '');

  if (validImages.length === 0) return null;

  return (
    <div>
      {/* Main image */}
      <div className="relative rounded-lg border border-secondary-200 bg-secondary-50 overflow-hidden mb-2" style={{ height: 280 }}>
        <img
          src={validImages[activeIndex]}
          alt=""
          className="w-full h-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '';
            (e.target as HTMLImageElement).alt = 'Görsel yüklenemedi';
          }}
        />
        {validImages.length > 1 && (
          <>
            <button
              onClick={() => setActiveIndex((i) => (i - 1 + validImages.length) % validImages.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow hover:bg-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-secondary-700" />
            </button>
            <button
              onClick={() => setActiveIndex((i) => (i + 1) % validImages.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow hover:bg-white transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-secondary-700" />
            </button>
            <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
              {activeIndex + 1} / {validImages.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {validImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {validImages.map((url, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`flex-shrink-0 rounded-md border-2 overflow-hidden transition-colors ${
                i === activeIndex ? 'border-primary-500' : 'border-secondary-200 hover:border-secondary-300'
              }`}
            >
              <img
                src={url}
                alt=""
                className="h-14 w-14 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-secondary-500">{label}</dt>
      <dd className={`text-sm text-secondary-900 mt-0.5 ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-secondary-300">-</span>}
      </dd>
    </div>
  );
}

export default function XmlSourceDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const router = useRouter();
  const paramId = params.id as string;
  const isNew = paramId === 'new';

  // Mutable sourceId — starts as param, updated after creation
  const sourceIdRef = useRef(isNew ? '' : paramId);
  const sourceId = sourceIdRef.current;

  // Wizard state — URL'deki step parametresini kullan, yoksa akıllı başlangıç
  const urlStep = Number(searchParams.get('step')) || 0;
  const [currentStep, setCurrentStep] = useState(isNew ? 1 : (urlStep || 1));
  const [stepInitialized, setStepInitialized] = useState(!!urlStep);

  // General form state
  const [generalForm, setGeneralForm] = useState({
    name: '',
    url: '',
    type: 'supplier' as 'supplier' | 'custom',
    auto_sync: false,
    sync_interval: 'daily',
    is_active: true,
  });
  const [sourceMode, setSourceMode] = useState<'url' | 'file'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Mapping state
  const [detectedFields, setDetectedFields] = useState<string[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [productNode, setProductNode] = useState('');
  const [wrapperNode, setWrapperNode] = useState('');
  const [fieldSamples, setFieldSamples] = useState<Record<string, string>>({});
  const [variantDetection, setVariantDetection] = useState<{
    has_variants: boolean;
    variant_samples: Array<{
      sku?: string;
      barcode?: string;
      stock?: number;
      price?: string;
      options?: Array<{ type: string; value: string }>;
    }>;
    variant_total_count: number;
  } | null>(null);

  // Step 3: Preview & Selection state
  const [previewMeta, setPreviewMeta] = useState<PreviewMeta | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState<'all' | 'manual'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [importLimit, setImportLimit] = useState<number | null>(null);
  const [priceAdjustment, setPriceAdjustment] = useState<number | null>(null);
  const [detailProduct, setDetailProduct] = useState<PreviewProduct | null>(null);

  // Step 3: Category exclusion state
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set());
  const [categorySearch, setCategorySearch] = useState('');

  // Step 4: Price rules state
  const [priceRuleForm, setPriceRuleForm] = useState({
    name: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    apply_to: 'all' as 'all' | 'category' | 'brand',
    apply_to_value: '',
    rounding_type: '' as '' | 'round_99' | 'round_90' | 'round_up' | 'round_down',
    is_active: true,
  });

  // Step 4 state
  const [expandedError, setExpandedError] = useState<number | null>(null);

  // Step 8: Bulk operations state
  const [bulkTab, setBulkTab] = useState<'barcode' | 'name' | 'tracking'>('barcode');
  const [bulkSuffix, setBulkSuffix] = useState('');
  const [bulkNameMode, setBulkNameMode] = useState<'prefix' | 'suffix'>('prefix');
  const [bulkNameValue, setBulkNameValue] = useState('');
  const [bulkPriceType, setBulkPriceType] = useState<'percentage' | 'fixed'>('percentage');
  const [bulkPriceValue, setBulkPriceValue] = useState('');
  const [bulkScope, setBulkScope] = useState<'all' | 'selected'>('all');
  const [bulkPreview, setBulkPreview] = useState<BulkPreviewItem[]>([]);
  const [bulkPreviewType, setBulkPreviewType] = useState<'barcode' | 'sku' | ''>('');
  const [bulkSelectedProducts, setBulkSelectedProducts] = useState<Set<number>>(new Set());
  const [bulkProductSearch, setBulkProductSearch] = useState('');
  const [bulkProductPage, setBulkProductPage] = useState(1);
  const [trackingPage, setTrackingPage] = useState(1);
  const [trackingStatusFilter, setTrackingStatusFilter] = useState('');

  // Source query (skip for new)
  const { data: sourceData, isLoading, error } = useQuery<{ data: XmlSource }>({
    queryKey: ['admin', 'xml-sources', sourceId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/xml-sources/${sourceId}`);
      return data;
    },
    enabled: !isNew && !!sourceId,
  });

  const source = sourceData?.data;

  // Sync form when source loads
  const [formInitialized, setFormInitialized] = useState(false);
  if (source && !formInitialized) {
    setGeneralForm({
      name: source.name,
      url: source.url,
      type: source.type,
      auto_sync: source.autoSync,
      sync_interval: source.syncInterval ?? 'daily',
      is_active: source.isActive,
    });
    if (source.mappingConfig) {
      setFieldMap(source.mappingConfig.field_map ?? {});
      setProductNode(source.mappingConfig.product_node ?? '');
      setWrapperNode(source.mappingConfig.wrapper_node ?? '');
    }

    // Smart initial step: jump to the most relevant step if no URL step specified
    if (!stepInitialized) {
      let smartStep = 1;
      if (source.productCount > 0) {
        smartStep = 7; // Has imported products → Toplu İşlemler
      } else if (source.lastSyncedAt) {
        smartStep = 6; // Has been imported before → Import
      } else if (source.mappingConfig?.field_map && Object.keys(source.mappingConfig.field_map).length > 0) {
        smartStep = 3; // Has field mapping → Kategori Eşleştirme
      }
      setCurrentStep(smartStep);
      setStepInitialized(true);
    }

    setFormInitialized(true);
  }

  // Sync step to URL (without full page reload)
  useEffect(() => {
    if (!isNew && sourceId && currentStep > 1) {
      const url = `/admin/xml-sources/${sourceId}?step=${currentStep}`;
      window.history.replaceState(null, '', url);
    }
  }, [currentStep, isNew, sourceId]);

  // Import progress
  const { progress, isActive: importIsActive, isTerminal } = useImportProgress(
    sourceId || '0',
    currentStep === 6 && !isNew && !!sourceId,
  );

  // Invalidate logs when import completes
  const prevTerminalRef = React.useRef(false);
  useEffect(() => {
    if (isTerminal && !prevTerminalRef.current) {
      queryClient.invalidateQueries({ queryKey: ['admin', 'xml-sources', sourceId, 'logs'] });
    }
    prevTerminalRef.current = isTerminal;
  }, [isTerminal, queryClient, sourceId]);

  // Logs query
  const { data: logsResponse, isLoading: logsLoading } = useQuery<{
    data: ImportLog[];
    meta?: { total: number };
  }>({
    queryKey: ['admin', 'xml-sources', sourceId, 'logs'],
    queryFn: async () => {
      const { data } = await api.get(`/admin/xml-sources/${sourceId}/logs`);
      return data;
    },
    enabled: currentStep === 7 && !isNew && !!sourceId,
  });

  // Serialized excluded categories for query key stability
  const excludedCategoriesKey = React.useMemo(() => [...excludedCategories].sort().join('|'), [excludedCategories]);

  // Paginated preview query
  const { data: previewResponse, isLoading: previewLoading } = useQuery<{ data: PaginatedPreview }>({
    queryKey: ['admin', 'xml-sources', sourceId, 'preview', previewPage, categoryFilter, brandFilter, excludedCategoriesKey],
    queryFn: async () => {
      const params: Record<string, string | number | string[]> = { page: previewPage, per_page: 50 };
      if (categoryFilter) params.category = categoryFilter;
      if (brandFilter) params.brand = brandFilter;
      if (excludedCategories.size > 0) {
        params.excluded_categories = JSON.stringify([...excludedCategories]);
      }
      const { data } = await api.get(`/admin/xml-sources/${sourceId}/preview`, { params });
      return data;
    },
    enabled: currentStep === 5 && previewMeta !== null && !!sourceId,
  });

  const previewData = previewResponse?.data;

  // Create source (for new wizard flow)
  const createMutation = useMutation({
    mutationFn: async (payload: typeof generalForm) => {
      if (sourceMode === 'file' && selectedFile) {
        const fd = new FormData();
        fd.append('name', payload.name);
        fd.append('type', payload.type);
        fd.append('auto_sync', payload.auto_sync ? '1' : '0');
        fd.append('sync_interval', payload.sync_interval);
        fd.append('is_active', payload.is_active ? '1' : '0');
        fd.append('file', selectedFile);
        const { data } = await api.post('/admin/xml-sources', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
      }
      const { data } = await api.post('/admin/xml-sources', payload);
      return data;
    },
    onSuccess: (resp) => {
      const newId = resp.data.id;
      sourceIdRef.current = String(newId);
      queryClient.invalidateQueries({ queryKey: ['admin', 'xml-sources'] });
      toast.success('Kaynak oluşturuldu.');
      // Replace URL so back button doesn't go to /new again
      router.replace(`/admin/xml-sources/${newId}?step=2`);
      setCurrentStep(2);
    },
    onError: () => toast.error('Kaynak oluşturulamadı.'),
  });

  // Update general info
  const updateMutation = useMutation({
    mutationFn: async (payload: typeof generalForm) => {
      const { data } = await api.put(`/admin/xml-sources/${sourceId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'xml-sources'] });
      toast.success('Kaynak güncellendi.');
    },
    onError: () => toast.error('Güncelleme başarısız.'),
  });

  // Detect fields
  const detectMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/admin/xml-sources/${sourceId}/detect-fields`);
      return data;
    },
    onSuccess: (resp) => {
      const fields = Object.keys(resp.data.fields);
      setDetectedFields(fields);

      // Store sample values and variant info
      if (resp.data.samples) setFieldSamples(resp.data.samples);
      if (resp.data.has_variants !== undefined) {
        setVariantDetection({
          has_variants: resp.data.has_variants,
          variant_samples: resp.data.variant_samples ?? [],
          variant_total_count: resp.data.variant_total_count ?? 0,
        });
      }

      // Auto-suggest mappings for fields that don't have an explicit mapping yet
      const suggested: Record<string, string> = {};
      for (const dbField of DB_FIELDS) {
        if (!fieldMap[dbField.key]) {
          const match = suggestMapping(dbField.key, fields);
          if (match) suggested[dbField.key] = match;
        }
      }
      if (Object.keys(suggested).length > 0) {
        setFieldMap((prev) => ({ ...suggested, ...prev }));
      }

      toast.success(`${fields.length} alan tespit edildi.`);
    },
    onError: () => toast.error('Alan tespiti başarısız.'),
  });

  // Auto-detect fields when entering step 2
  const autoDetectedRef = useRef(false);
  useEffect(() => {
    if (currentStep === 2 && !autoDetectedRef.current && sourceId && detectedFields.length === 0) {
      autoDetectedRef.current = true;
      detectMutation.mutate();
    }
  }, [currentStep, sourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save mapping
  const mappingMutation = useMutation({
    mutationFn: async () => {
      const mapping_config: Record<string, unknown> = { field_map: fieldMap };
      if (productNode) mapping_config.product_node = productNode;
      if (wrapperNode) mapping_config.wrapper_node = wrapperNode;
      const { data } = await api.put(`/admin/xml-sources/${sourceId}/mapping`, {
        mapping_config,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'xml-sources'] });
      toast.success('Eşleştirme kaydedildi.');
    },
    onError: () => toast.error('Eşleştirme kaydedilemedi.'),
  });

  // Prepare preview
  const prepareMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/admin/xml-sources/${sourceId}/preview/prepare`);
      return data;
    },
    onSuccess: (resp) => {
      setPreviewMeta(resp.data);
      setPreviewPage(1);
      setCategoryFilter('');
      setBrandFilter('');
      setSelectedIndices(new Set());
      setSelectionMode('all');
      setImportLimit(null);
      toast.success(`${resp.data.total} ürün hazır.`);
    },
    onError: () => toast.error('Önizleme hazirlama başarısız.'),
  });

  // Upload file
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post(`/admin/xml-sources/${sourceId}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'xml-sources'] });
      toast.success('Dosya başarıyla yüklendi.');
    },
    onError: () => toast.error('Dosya yüklenemedi.'),
  });

  // Import
  const importMutation = useMutation({
    mutationFn: async (filters: ImportFilters) => {
      const { data } = await api.post(`/admin/xml-sources/${sourceId}/import`, filters);
      return data;
    },
    onSuccess: () => {
      toast.success('Import işlemi kuyruğa eklendi.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'xml-sources', sourceId, 'import-progress'] });
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 409) {
        toast.error('Bu kaynak için zaten aktif bir import işlemi var.');
      } else {
        toast.error('Import başlatılamadı.');
      }
    },
  });

  // Price preview data (from backend price rules)
  interface PricePreviewItem {
    name: string;
    original_price: number;
    adjusted_price: number;
    original_compare_price: number;
    adjusted_compare_price: number | null;
  }

  const { data: pricePreviewResponse } = useQuery<{ data: PricePreviewItem[] }>({
    queryKey: ['admin', 'xml-sources', sourceId, 'price-preview'],
    queryFn: async () => {
      const { data } = await api.get(`/admin/xml-sources/${sourceId}/price-preview`, { params: { limit: 50 } });
      return data;
    },
    enabled: currentStep === 5 && !isNew && !!sourceId && previewMeta !== null,
  });

  // Build a map: product name → adjusted prices for quick lookup in preview table
  const pricePreviewMap = React.useMemo(() => {
    const map = new Map<string, PricePreviewItem>();
    // Backend returns { data: { products: [...] } }
    const resp = pricePreviewResponse?.data as Record<string, unknown> | undefined;
    const items = resp?.products ?? resp;
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item?.name) map.set(item.name, item);
      }
    }
    return map;
  }, [pricePreviewResponse]);

  // Step 4: Price rules query
  interface PriceRule {
    id: number;
    name: string;
    type: 'percentage' | 'fixed';
    value: string;
    apply_to: 'all' | 'category' | 'brand';
    apply_to_value: string | null;
    rounding_type: string | null;
    is_active: boolean;
    priority: number;
  }

  const { data: priceRulesResponse, refetch: refetchPriceRules } = useQuery<{ data: PriceRule[] }>({
    queryKey: ['admin', 'xml-sources', sourceId, 'price-rules'],
    queryFn: async () => {
      const { data } = await api.get(`/admin/xml-sources/${sourceId}/price-rules`);
      return data;
    },
    enabled: (currentStep === 4 || currentStep === 5) && !isNew && !!sourceId,
  });

  const addPriceRuleMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post(`/admin/xml-sources/${sourceId}/price-rules`, payload);
      return data;
    },
    onSuccess: () => {
      refetchPriceRules();
      setPriceRuleForm({ name: '', type: 'percentage', value: '', apply_to: 'all', apply_to_value: '', rounding_type: '', is_active: true });
      toast.success('Fiyat kuralı eklendi.');
    },
    onError: () => toast.error('Kural eklenemedi.'),
  });

  const updatePriceRuleMutation = useMutation({
    mutationFn: async ({ ruleId, data }: { ruleId: number; data: Record<string, unknown> }) => {
      const { data: resp } = await api.put(`/admin/xml-sources/${sourceId}/price-rules/${ruleId}`, data);
      return resp;
    },
    onSuccess: () => {
      refetchPriceRules();
      toast.success('Kural güncellendi.');
    },
    onError: () => toast.error('Kural güncellenemedi.'),
  });

  const deletePriceRuleMutation = useMutation({
    mutationFn: async (ruleId: number) => {
      await api.delete(`/admin/xml-sources/${sourceId}/price-rules/${ruleId}`);
    },
    onSuccess: () => {
      refetchPriceRules();
      toast.success('Kural silindi.');
    },
    onError: () => toast.error('Kural silinemedi.'),
  });

  const hasActivePriceRules = React.useMemo(() => {
    return (priceRulesResponse?.data ?? []).some((r) => r.is_active);
  }, [priceRulesResponse]);

  // Step 7: Bulk operation history
  interface BulkOpLog {
    id: number;
    operation: string;
    params: Record<string, string>;
    affected_count: number;
    reverted: boolean;
    reverted_at: string | null;
    created_at: string;
  }

  const { data: bulkHistoryResponse, refetch: refetchBulkHistory } = useQuery<{ data: BulkOpLog[] }>({
    queryKey: ['admin', 'xml-sources', sourceId, 'bulk-history'],
    queryFn: async () => {
      const { data } = await api.get(`/admin/xml-sources/${sourceId}/bulk/history`);
      return data;
    },
    enabled: currentStep === 7 && !isNew && !!sourceId,
  });

  const revertMutation = useMutation({
    mutationFn: async (logId: number) => {
      const { data } = await api.post(`/admin/xml-sources/${sourceId}/bulk/${logId}/revert`);
      return data;
    },
    onSuccess: () => {
      refetchBulkHistory();
      toast.success('İşlem geri alındı.');
    },
    onError: () => toast.error('Geri alma başarısız.'),
  });

  // Step 7: Bulk products list query
  interface BulkProduct { id: number; name: string; sku: string; barcode: string; price: string; }
  const { data: bulkProductsResponse } = useQuery<{
    data: BulkProduct[];
    meta: { current_page: number; last_page: number; total: number };
  }>({
    queryKey: ['admin', 'bulk-products', sourceId, bulkProductPage, bulkProductSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: bulkProductPage, per_page: 20, xml_source_id: sourceId };
      if (bulkProductSearch) params.search = bulkProductSearch;
      const { data } = await api.get('/admin/products', { params });
      return data;
    },
    enabled: currentStep === 7 && bulkScope === 'selected' && !isNew && !!sourceId,
  });

  // Step 7: XML Products tracking query
  const { data: xmlProductsResponse, isLoading: xmlProductsLoading, refetch: refetchXmlProducts } = useQuery<{
    data: XmlProductItem[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>({
    queryKey: ['admin', 'xml-sources', sourceId, 'xml-products', trackingPage, trackingStatusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: trackingPage, per_page: 20 };
      if (trackingStatusFilter) params.sync_status = trackingStatusFilter;
      const { data } = await api.get(`/admin/xml-sources/${sourceId}/xml-products`, { params });
      return data;
    },
    enabled: currentStep === 7 && bulkTab === 'tracking' && !isNew && !!sourceId,
  });

  const { data: comparisonResponse } = useQuery<{ data: XmlProductComparison }>({
    queryKey: ['admin', 'xml-sources', sourceId, 'xml-products', 'comparison'],
    queryFn: async () => {
      const { data } = await api.get(`/admin/xml-sources/${sourceId}/xml-products/comparison`);
      return data;
    },
    enabled: currentStep === 7 && bulkTab === 'tracking' && !isNew && !!sourceId,
  });

  // Bulk preview mutation
  const bulkPreviewMutation = useMutation({
    mutationFn: async (payload: { operation: string; params: Record<string, unknown>; limit?: number }) => {
      const { data } = await api.post(`/admin/xml-sources/${sourceId}/bulk/preview`, payload);
      return data;
    },
    onSuccess: (resp) => {
      setBulkPreview(resp.data);
    },
    onError: () => toast.error('Önizleme yüklenemedi.'),
  });

  // Bulk apply mutations
  const bulkBarcodeMutation = useMutation({
    mutationFn: async (payload: { suffix: string; product_ids?: number[] }) => {
      const { data } = await api.post(`/admin/xml-sources/${sourceId}/bulk/barcode-suffix`, payload);
      return data;
    },
    onSuccess: (resp) => {
      toast.success(`${resp.data.products_updated} ürün, ${resp.data.variants_updated} varyant güncellendi.`);
      setBulkPreview([]);
      refetchBulkHistory();
    },
    onError: () => toast.error('Barkod güncellemesi başarısız.'),
  });

  const bulkSkuMutation = useMutation({
    mutationFn: async (payload: { suffix: string; product_ids?: number[] }) => {
      const { data } = await api.post(`/admin/xml-sources/${sourceId}/bulk/sku-suffix`, payload);
      return data;
    },
    onSuccess: (resp) => {
      toast.success(`${resp.data.products_updated} ürün, ${resp.data.variants_updated} varyant güncellendi.`);
      setBulkPreview([]);
      refetchBulkHistory();
    },
    onError: () => toast.error('SKU güncellemesi başarısız.'),
  });

  const bulkNameMutation = useMutation({
    mutationFn: async (payload: { mode: string; value: string; product_ids?: number[] }) => {
      const { data } = await api.post(`/admin/xml-sources/${sourceId}/bulk/name-modify`, payload);
      return data;
    },
    onSuccess: (resp) => {
      toast.success(`${resp.data.products_updated} ürün ismi güncellendi.`);
      setBulkPreview([]);
      refetchBulkHistory();
    },
    onError: () => toast.error('İsim güncellemesi başarısız.'),
  });

  const bulkPriceMutation = useMutation({
    mutationFn: async (payload: { type: string; value: number; product_ids?: number[] }) => {
      const { data } = await api.post(`/admin/xml-sources/${sourceId}/bulk/price-adjust`, payload);
      return data;
    },
    onSuccess: (resp) => {
      toast.success(`${resp.data.products_updated} ürün, ${resp.data.variants_updated} varyant fiyatı güncellendi.`);
      setBulkPreview([]);
    },
    onError: () => toast.error('Fiyat güncellemesi başarısız.'),
  });

  // Navigation handlers
  const goNext = useCallback(async () => {
    if (currentStep === 1) {
      if (isNew || !sourceId) {
        // Create new source, then proceed (handled in createMutation.onSuccess)
        createMutation.mutate(generalForm);
      } else {
        // Update existing, then proceed
        updateMutation.mutate(generalForm, {
          onSuccess: () => setCurrentStep(2),
        });
      }
      return;
    }

    if (currentStep === 2) {
      // Save mapping, then go to category mapping
      mappingMutation.mutate(undefined, {
        onSuccess: () => {
          prepareMutation.mutate();
          setCurrentStep(3);
        },
      });
      return;
    }

    if (currentStep >= 3 && currentStep <= 4) {
      // Steps 3-4: category mapping, price rules — just advance
      setCurrentStep(currentStep + 1);
      return;
    }

    if (currentStep === 5) {
      setCurrentStep(6);
      return;
    }

    if (currentStep === 6) {
      setCurrentStep(7);
    }
  }, [currentStep, generalForm, isNew, sourceId, createMutation, updateMutation, mappingMutation, prepareMutation]);

  const goBack = useCallback(() => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }, [currentStep]);

  const handleStepClick = useCallback(
    (step: number) => {
      // Allow free navigation for existing sources (not new)
      if (!isNew && sourceId) {
        setCurrentStep(step);
      } else if (step < currentStep) {
        setCurrentStep(step);
      }
    },
    [currentStep, isNew, sourceId],
  );

  // Checkbox helpers
  const toggleProductSelection = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
    setSelectionMode('manual');
  }, []);

  const togglePageSelection = useCallback(() => {
    if (!previewData?.products) return;
    const pageIndices = previewData.products.map((p) => p._index);
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      const allSelected = pageIndices.every((i) => next.has(i));
      if (allSelected) {
        pageIndices.forEach((i) => next.delete(i));
      } else {
        pageIndices.forEach((i) => next.add(i));
      }
      return next;
    });
    setSelectionMode('manual');
  }, [previewData]);

  const handleStartImport = useCallback(() => {
    const payload: ImportFilters = {};
    if (selectionMode === 'manual' && selectedIndices.size > 0) {
      payload.product_indices = Array.from(selectedIndices);
    }
    if (categoryFilter) payload.categories = [categoryFilter];
    if (brandFilter) payload.brands = [brandFilter];
    if (importLimit && importLimit > 0) payload.limit = importLimit;
    if (priceAdjustment && priceAdjustment !== 0) payload.price_adjustment_percent = priceAdjustment;
    if (excludedCategories.size > 0) {
      (payload as Record<string, unknown>).excluded_categories = Array.from(excludedCategories);
    }
    importMutation.mutate(payload);
  }, [selectionMode, selectedIndices, categoryFilter, brandFilter, importLimit, priceAdjustment, excludedCategories, importMutation]);

  // Estimated import count
  const getEstimatedCount = () => {
    if (!previewMeta) return 0;
    if (selectionMode === 'manual' && selectedIndices.size > 0) return selectedIndices.size;
    const filteredTotal = previewData?.total ?? previewMeta.total;
    if (importLimit && importLimit > 0) return Math.min(importLimit, filteredTotal);
    return filteredTotal;
  };

  const adjustPrice = useCallback((rawPrice: string | undefined): { original: string; adjusted: string | null } => {
    const original = rawPrice ?? '-';
    if (!priceAdjustment || priceAdjustment === 0 || !rawPrice) return { original, adjusted: null };
    const num = parseFloat(rawPrice.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(num)) return { original, adjusted: null };
    const newPrice = num * (1 + priceAdjustment / 100);
    return { original, adjusted: newPrice.toFixed(2) };
  }, [priceAdjustment]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('tr-TR');
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '-';
    if (seconds < 60) return `${seconds}sn`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}dk ${sec}sn`;
  };

  if (!isNew && isLoading) {
    return <div className="p-6 text-secondary-500">Yükleniyor...</div>;
  }

  if (!isNew && (error || !source)) {
    return (
      <Alert variant="error" title="Hata">
        Kaynak yüklenemedi.
      </Alert>
    );
  }

  const pageProducts = previewData?.products ?? [];
  const allPageSelected = pageProducts.length > 0 && pageProducts.every((p) => selectedIndices.has(p._index));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/xml-sources"
          className="rounded p-1.5 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">
            {isNew ? 'Yeni XML Kaynağı' : source?.name}
          </h1>
          {!isNew && source?.url && (
            <p className="text-sm text-secondary-500">{source.url}</p>
          )}
        </div>
      </div>

      {/* Wizard Stepper */}
      <div className="rounded-lg border border-secondary-200 bg-white px-6 py-4">
        <WizardStepper
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          onStepClick={handleStepClick}
          freeNavigation={!isNew && !!sourceId}
        />
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {/* Step 1: General Info */}
        {currentStep === 1 && (
          <div className="rounded-lg border border-secondary-200 bg-white p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                goNext();
              }}
              className="space-y-4 max-w-lg"
            >
              <Input
                label="Kaynak Adı"
                value={generalForm.name}
                onChange={(e) => setGeneralForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
              {/* Source mode toggle (new only) */}
              {isNew && (
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="source_mode"
                      value="url"
                      checked={sourceMode === 'url'}
                      onChange={() => {
                        setSourceMode('url');
                        setSelectedFile(null);
                      }}
                      className="text-primary-600"
                    />
                    <span className="text-sm text-secondary-700">URL</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="source_mode"
                      value="file"
                      checked={sourceMode === 'file'}
                      onChange={() => {
                        setSourceMode('file');
                        setGeneralForm((p) => ({ ...p, url: '' }));
                      }}
                      className="text-primary-600"
                    />
                    <span className="text-sm text-secondary-700">Dosya Yükle</span>
                  </label>
                </div>
              )}

              {/* URL input or File upload */}
              {(!isNew || sourceMode === 'url') ? (
                <Input
                  label="XML URL"
                  value={generalForm.url}
                  onChange={(e) => setGeneralForm((p) => ({ ...p, url: e.target.value }))}
                  required={!isNew || sourceMode === 'url'}
                  hint="XML dosyasinin tam URL adresi"
                />
              ) : (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    XML Dosyası
                  </label>
                  <input
                    type="file"
                    accept=".xml,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setSelectedFile(file);
                    }}
                    className="block w-full text-sm text-secondary-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                  <p className="mt-1 text-xs text-secondary-400">Maksimum 50MB, .xml veya .txt</p>
                </div>
              )}

              <Select
                label="Tip"
                value={generalForm.type}
                onChange={(e) =>
                  setGeneralForm((p) => ({
                    ...p,
                    type: e.target.value as 'supplier' | 'custom',
                  }))
                }
                options={[
                  { label: 'Tedarikci', value: 'supplier' },
                  { label: 'Özel', value: 'custom' },
                ]}
              />
              <Switch
                checked={generalForm.auto_sync}
                onCheckedChange={(checked) =>
                  setGeneralForm((p) => ({ ...p, auto_sync: checked }))
                }
                label="Otomatik Senkronizasyon"
              />
              {generalForm.auto_sync && (
                <Select
                  label="Senkronizasyon Aralığı"
                  value={generalForm.sync_interval}
                  onChange={(e) =>
                    setGeneralForm((p) => ({ ...p, sync_interval: e.target.value }))
                  }
                  options={[
                    { label: 'Saatlik', value: 'hourly' },
                    { label: 'Günlük', value: 'daily' },
                    { label: 'Haftalık', value: 'weekly' },
                    { label: 'Aylık', value: 'monthly' },
                  ]}
                />
              )}
              <Switch
                checked={generalForm.is_active}
                onCheckedChange={(checked) =>
                  setGeneralForm((p) => ({ ...p, is_active: checked }))
                }
                label="Aktif"
              />

              {/* File upload for existing sources */}
              {!isNew && (
                <div className="mt-6 border-t border-secondary-200 pt-6">
                  <h3 className="text-sm font-medium text-secondary-700 mb-3">XML Dosyası Yükle</h3>
                  <p className="text-xs text-secondary-500 mb-3">
                    URL yerine yerel bir XML dosyası yükleyerek kaynak oluşturabilirsiniz.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".xml,.txt"
                      id="xml-file-upload"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadMutation.mutate(file);
                      }}
                    />
                    <Button
                      variant="outline"
                      type="button"
                      loading={uploadMutation.isPending}
                      onClick={() => document.getElementById('xml-file-upload')?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      {uploadMutation.isPending ? 'Yükleniyor...' : 'XML Dosyası Yükle'}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Step 2: Field Mapping */}
        {currentStep === 2 && (
          <div className="rounded-lg border border-secondary-200 bg-white p-6 space-y-6">
            {/* Detection status bar */}
            {detectMutation.isPending && detectedFields.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700">XML alanlari tespit ediliyor...</span>
              </div>
            ) : detectedFields.length > 0 ? (
              <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-green-800">
                    <strong>{detectedFields.length}</strong> XML alani tespit edildi,{' '}
                    <strong>{DB_FIELDS.filter((f) => fieldMap[f.key]).length}</strong> eşleştirme yapıldı
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    autoDetectedRef.current = false;
                    detectMutation.mutate();
                  }}
                  loading={detectMutation.isPending}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Yeniden Tespit Et
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-secondary-200 bg-secondary-50 p-4">
                <span className="text-sm text-secondary-600">Alan tespiti yapılamadı.</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => detectMutation.mutate()}
                  loading={detectMutation.isPending}
                >
                  <Search className="h-3.5 w-3.5" />
                  Tekrar Dene
                </Button>
              </div>
            )}

            {/* Node overrides */}
            <div>
              <h3 className="text-sm font-medium text-secondary-700 mb-2">XML Yapilandirma</h3>
              <div className="grid grid-cols-2 gap-4 max-w-lg">
                <Input
                  label="Product Node"
                  value={productNode}
                  onChange={(e) => setProductNode(e.target.value)}
                  hint="Örnek: ürün, product, item"
                />
                <Input
                  label="Wrapper Node"
                  value={wrapperNode}
                  onChange={(e) => setWrapperNode(e.target.value)}
                  hint="Örnek: ürünler, products"
                />
              </div>
            </div>

            {/* Mapping table */}
            {detectedFields.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-secondary-700 mb-3">Alan Eşleştirme</h3>
                <div className="overflow-x-auto rounded-lg border border-secondary-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-secondary-50 text-left text-secondary-500">
                        <th className="px-4 py-2.5 font-medium w-[22%]">Veritabani Alani</th>
                        <th className="px-4 py-2.5 font-medium w-[28%]">XML Alani</th>
                        <th className="px-4 py-2.5 font-medium w-[35%]">Örnek Veri</th>
                        <th className="px-4 py-2.5 font-medium w-[15%]">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DB_FIELDS.map((field) => {
                        const currentValue = fieldMap[field.key] ?? '';
                        const isMatched = currentValue !== '';
                        const autoSuggested = suggestMapping(field.key, detectedFields);
                        const isAutoMatch = isMatched && currentValue === autoSuggested;
                        const sampleValue = currentValue ? (fieldSamples[currentValue] ?? '') : '';

                        return (
                          <tr
                            key={field.key}
                            className={`border-t transition-colors ${
                              isMatched ? 'bg-green-50/50' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <span className="font-medium text-secondary-700">{field.label}</span>
                              <span className="ml-1.5 text-xs text-secondary-400">({field.key})</span>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                className={`w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                                  isMatched
                                    ? 'border-green-300 bg-white focus:border-green-500'
                                    : 'border-secondary-300 bg-white focus:border-primary-500'
                                }`}
                                value={currentValue}
                                onChange={(e) =>
                                  setFieldMap((p) => ({ ...p, [field.key]: e.target.value }))
                                }
                              >
                                <option value="">-- Eşleştirme Yok --</option>
                                {detectedFields.map((df) => (
                                  <option key={df} value={df}>
                                    {df}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              {sampleValue ? (
                                <span className="text-xs text-secondary-600 font-mono bg-secondary-100 rounded px-2 py-1 inline-block max-w-full truncate">
                                  {sampleValue}
                                </span>
                              ) : (
                                <span className="text-xs text-secondary-300">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isMatched ? (
                                <Badge variant={isAutoMatch ? 'success' : 'info'}>
                                  {isAutoMatch ? 'Otomatik' : 'Manuel'}
                                </Badge>
                              ) : (
                                <Badge variant="outline">Eşleşmedi</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Variant detection info */}
            {variantDetection && (
              <div className={`rounded-lg border p-4 ${variantDetection.has_variants ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Varyant Tespiti
                </h4>
                {variantDetection.has_variants ? (
                  <div className="space-y-3">
                    <p className="text-xs text-green-800 font-medium">
                      İlk üründe <strong>{variantDetection.variant_total_count}</strong> varyant tespit edildi
                    </p>
                    {/* Variant samples table */}
                    <div className="overflow-x-auto rounded border border-green-200">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-green-100/50 text-left text-secondary-600">
                            <th className="px-3 py-2 font-medium">SKU</th>
                            <th className="px-3 py-2 font-medium">Barkod</th>
                            <th className="px-3 py-2 font-medium">Fiyat</th>
                            <th className="px-3 py-2 font-medium">Stok</th>
                            <th className="px-3 py-2 font-medium">Seçenekler</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variantDetection.variant_samples.map((v, i) => (
                            <tr key={i} className="border-t border-green-100">
                              <td className="px-3 py-1.5 font-mono">{v.sku || '-'}</td>
                              <td className="px-3 py-1.5 font-mono">{v.barcode || '-'}</td>
                              <td className="px-3 py-1.5">{v.price || '-'}</td>
                              <td className="px-3 py-1.5">{v.stock ?? '-'}</td>
                              <td className="px-3 py-1.5">
                                {v.options && v.options.length > 0 ? (
                                  <div className="flex gap-1 flex-wrap">
                                    {v.options.map((opt, oi) => (
                                      <span key={oi} className="bg-white border border-green-200 px-1.5 py-0.5 rounded">
                                        {opt.type}: <strong>{opt.value}</strong>
                                      </span>
                                    ))}
                                  </div>
                                ) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {variantDetection.variant_total_count > 3 && (
                      <p className="text-xs text-secondary-500">... ve {variantDetection.variant_total_count - 3} varyant daha</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-amber-800">Bu XML&apos;de varyant yapısı tespit edilemedi. Ürünler tek varyant olarak import edilecek.</p>
                )}
              </div>
            )}

            <Button
              onClick={() => mappingMutation.mutate()}
              loading={mappingMutation.isPending}
            >
              <Save className="h-4 w-4" />
              {mappingMutation.isPending ? 'Kaydediliyor...' : 'Eşleştirmeyi Kaydet'}
            </Button>
          </div>
        )}

        {/* Step 3: Category Mapping */}
        {currentStep === 3 && previewMeta && (() => {
          const allCategories = previewMeta.categories;
          // Get unique root categories (first segment)
          const rootCategories = [...new Set(allCategories.map((c) => c.split(' > ')[0]))].sort();

          // Filter by search
          const searchLower = categorySearch.toLowerCase();
          const filteredCategories = searchLower
            ? allCategories.filter((c) => c.toLowerCase().includes(searchLower))
            : allCategories;

          // Toggle a single category
          const toggleCategory = (catPath: string) => {
            setExcludedCategories((prev) => {
              const next = new Set(prev);
              if (next.has(catPath)) {
                next.delete(catPath);
              } else {
                next.add(catPath);
              }
              return next;
            });
          };

          // Toggle all categories starting with a root prefix
          const toggleRoot = (root: string) => {
            const children = allCategories.filter((c) => c === root || c.startsWith(root + ' > '));
            const allExcluded = children.every((c) => excludedCategories.has(c));
            setExcludedCategories((prev) => {
              const next = new Set(prev);
              if (allExcluded) {
                children.forEach((c) => next.delete(c));
              } else {
                children.forEach((c) => next.add(c));
              }
              return next;
            });
          };

          // Select/deselect all
          const toggleAll = () => {
            if (excludedCategories.size === allCategories.length) {
              setExcludedCategories(new Set());
            } else {
              setExcludedCategories(new Set(allCategories));
            }
          };

          const includedCount = allCategories.length - excludedCategories.size;

          return (
            <div className="rounded-lg border border-secondary-200 bg-white p-6">
              <h3 className="text-lg font-semibold mb-2">Kategori Eşleştirme</h3>
              <p className="text-sm text-secondary-500 mb-4">
                Import edilecek kategorileri seçin. Hariç tutulan kategorilerdeki ürünler import edilmeyecek.
              </p>

              {/* Summary + controls */}
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <Badge variant="success">{includedCount} dahil</Badge>
                  {excludedCategories.size > 0 && (
                    <Badge variant="danger">{excludedCategories.size} hariç</Badge>
                  )}
                  <span className="text-xs text-secondary-400">/ {allCategories.length} toplam</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={toggleAll}>
                    {excludedCategories.size === allCategories.length ? 'Tümünü Dahil Et' : 'Tümünü Hariç Tut'}
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Kategori ara..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full rounded-md border border-secondary-300 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Root category quick toggles */}
              {!categorySearch && rootCategories.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {rootCategories.map((root) => {
                    const children = allCategories.filter((c) => c === root || c.startsWith(root + ' > '));
                    const allExcluded = children.every((c) => excludedCategories.has(c));
                    const someExcluded = children.some((c) => excludedCategories.has(c));
                    return (
                      <button
                        key={root}
                        onClick={() => toggleRoot(root)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          allExcluded
                            ? 'border-red-200 bg-red-50 text-red-700 line-through'
                            : someExcluded
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-green-200 bg-green-50 text-green-700'
                        }`}
                      >
                        {root}
                        <span className="ml-1 opacity-60">({children.length})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Category list */}
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {filteredCategories.map((catPath) => {
                  const isExcluded = excludedCategories.has(catPath);
                  const depth = catPath.split(' > ').length - 1;
                  return (
                    <label
                      key={catPath}
                      className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                        isExcluded
                          ? 'border-red-100 bg-red-50/50'
                          : 'border-secondary-100 bg-white hover:bg-green-50/30'
                      }`}
                      style={{ paddingLeft: `${12 + depth * 16}px` }}
                    >
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => toggleCategory(catPath)}
                        className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                      />
                      <span className={`text-sm flex-1 ${isExcluded ? 'text-secondary-400 line-through' : 'text-secondary-900'}`}>
                        {catPath}
                      </span>
                      <Badge
                        variant={isExcluded ? 'danger' : 'success'}
                        className="text-[10px] flex-shrink-0"
                      >
                        {isExcluded ? 'Hariç' : 'Dahil'}
                      </Badge>
                    </label>
                  );
                })}
                {filteredCategories.length === 0 && (
                  <p className="text-sm text-secondary-400 py-4 text-center">
                    {categorySearch ? 'Aramayla eşleşen kategori bulunamadı.' : 'Kategori bulunamadı.'}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Step 4: Price Rules */}
        {currentStep === 4 && (
          <div className="rounded-lg border border-secondary-200 bg-white p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Fiyat Kuralları</h3>
              <p className="text-sm text-secondary-500">
                XML&apos;den gelen fiyatlara (satış fiyatı + karşılaştırma fiyatı) zam veya indirim uygulayın. Kurallar öncelik sırasına göre uygulanır.
              </p>
            </div>

            {/* Existing rules */}
            {priceRulesResponse?.data && priceRulesResponse.data.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-secondary-700">Mevcut Kurallar</h4>
                {priceRulesResponse.data.map((rule) => {
                  const scopeLabel = rule.apply_to === 'all' ? 'Tüm Ürünler'
                    : rule.apply_to === 'category' ? `Kategori: ${(rule.apply_to_value ?? '').split('|||').length} seçili`
                    : `Marka: ${(rule.apply_to_value ?? '').split('|||').length} seçili`;
                  const roundingLabel = !rule.rounding_type ? null
                    : rule.rounding_type === 'round_99' ? '.99' : rule.rounding_type === 'round_90' ? '.90'
                    : rule.rounding_type === 'round_up' ? 'Yukarı' : 'Aşağı';

                  return (
                    <div key={rule.id} className={`rounded-lg border p-3 transition-colors ${rule.is_active ? 'border-green-200 bg-green-50/50' : 'border-secondary-200 bg-secondary-50 opacity-60'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Active toggle */}
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={(checked) => updatePriceRuleMutation.mutate({ ruleId: rule.id, data: { is_active: checked } })}
                          />
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm font-medium ${rule.is_active ? 'text-secondary-900' : 'text-secondary-500 line-through'}`}>
                              {rule.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <Badge variant={rule.type === 'percentage' ? 'info' : 'accent'} className="text-[10px]">
                                {rule.type === 'percentage' ? `%${rule.value}` : `${rule.value} TL`}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">{scopeLabel}</Badge>
                              {roundingLabel && <Badge variant="outline" className="text-[10px]">{roundingLabel} yuvarlama</Badge>}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('Bu kuralı silmek istediğinize emin misiniz?')) {
                              deletePriceRuleMutation.mutate(rule.id);
                            }
                          }}
                          className="text-red-400 hover:text-red-600 p-1 flex-shrink-0"
                          title="Sil"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new rule form */}
            <div className="border border-secondary-200 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-medium text-secondary-700">Yeni Kural Ekle</h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Kural Adı"
                  value={priceRuleForm.name}
                  onChange={(e) => setPriceRuleForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="örn: %10 Zam"
                />
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Tip</label>
                  <select
                    className="w-full rounded-md border border-secondary-300 px-3 py-2 text-sm"
                    value={priceRuleForm.type}
                    onChange={(e) => setPriceRuleForm((p) => ({ ...p, type: e.target.value as 'percentage' | 'fixed' }))}
                  >
                    <option value="percentage">Yüzdelik (%)</option>
                    <option value="fixed">Sabit Tutar (TL)</option>
                  </select>
                </div>
                <Input
                  label={priceRuleForm.type === 'percentage' ? 'Yüzde Değeri (+ zam, - indirim)' : 'Tutar (+ zam, - indirim)'}
                  type="number"
                  value={priceRuleForm.value}
                  onChange={(e) => setPriceRuleForm((p) => ({ ...p, value: e.target.value }))}
                  placeholder={priceRuleForm.type === 'percentage' ? 'örn: 10 veya -15' : 'örn: 50 veya -25'}
                />
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Uygulama Kapsamı</label>
                  <select
                    className="w-full rounded-md border border-secondary-300 px-3 py-2 text-sm"
                    value={priceRuleForm.apply_to}
                    onChange={(e) => setPriceRuleForm((p) => ({ ...p, apply_to: e.target.value as 'all' | 'category' | 'brand' }))}
                  >
                    <option value="all">Tüm Ürünler</option>
                    <option value="category">Belirli Kategori</option>
                    <option value="brand">Belirli Marka</option>
                  </select>
                </div>
                {priceRuleForm.apply_to === 'category' && previewMeta && (() => {
                  // Only show included categories (not excluded in Step 3)
                  const includedCats = previewMeta.categories.filter((c) => !excludedCategories.has(c));
                  // Get unique roots for quick selection
                  const roots = [...new Set(includedCats.map((c) => c.split(' > ')[0]))].sort();
                  return (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Kategoriler (çoklu seçim)</label>
                      {/* Root quick toggles */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {roots.map((root) => {
                          const children = includedCats.filter((c) => c === root || c.startsWith(root + ' > '));
                          const selected = priceRuleForm.apply_to_value.split('|||').filter(Boolean);
                          const allSelected = children.every((c) => selected.includes(c));
                          return (
                            <button
                              key={root}
                              type="button"
                              onClick={() => {
                                const current = priceRuleForm.apply_to_value.split('|||').filter(Boolean);
                                let next: string[];
                                if (allSelected) {
                                  next = current.filter((c) => !children.includes(c));
                                } else {
                                  next = [...new Set([...current, ...children])];
                                }
                                setPriceRuleForm((p) => ({ ...p, apply_to_value: next.join('|||') }));
                              }}
                              className={`rounded border px-2 py-1 text-xs transition-colors ${
                                allSelected ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-secondary-200 text-secondary-600 hover:bg-secondary-50'
                              }`}
                            >
                              {root}
                            </button>
                          );
                        })}
                      </div>
                      <div className="max-h-[150px] overflow-y-auto rounded border border-secondary-200 p-2 space-y-0.5">
                        {includedCats.map((cat) => {
                          const selected = priceRuleForm.apply_to_value.split('|||').filter(Boolean);
                          const isSelected = selected.includes(cat);
                          return (
                            <label key={cat} className="flex items-center gap-2 px-1 py-0.5 cursor-pointer hover:bg-secondary-50 rounded text-xs">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const current = priceRuleForm.apply_to_value.split('|||').filter(Boolean);
                                  const next = isSelected ? current.filter((c) => c !== cat) : [...current, cat];
                                  setPriceRuleForm((p) => ({ ...p, apply_to_value: next.join('|||') }));
                                }}
                                className="rounded border-secondary-300 text-primary-600 h-3.5 w-3.5"
                              />
                              <span className={isSelected ? 'text-secondary-900' : 'text-secondary-600'}>{cat}</span>
                            </label>
                          );
                        })}
                      </div>
                      {priceRuleForm.apply_to_value && (
                        <p className="text-xs text-secondary-400 mt-1">{priceRuleForm.apply_to_value.split('|||').filter(Boolean).length} kategori seçili</p>
                      )}
                    </div>
                  );
                })()}
                {priceRuleForm.apply_to === 'brand' && previewMeta && (() => {
                  const brands = previewMeta.brands;
                  return (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Markalar (çoklu seçim)</label>
                      <div className="flex flex-wrap gap-1.5">
                        {brands.map((brand) => {
                          const selected = priceRuleForm.apply_to_value.split('|||').filter(Boolean);
                          const isSelected = selected.includes(brand);
                          return (
                            <button
                              key={brand}
                              type="button"
                              onClick={() => {
                                const current = priceRuleForm.apply_to_value.split('|||').filter(Boolean);
                                const next = isSelected ? current.filter((b) => b !== brand) : [...current, brand];
                                setPriceRuleForm((p) => ({ ...p, apply_to_value: next.join('|||') }));
                              }}
                              className={`rounded border px-2.5 py-1 text-xs transition-colors ${
                                isSelected ? 'border-primary-300 bg-primary-50 text-primary-700 font-medium' : 'border-secondary-200 text-secondary-600 hover:bg-secondary-50'
                              }`}
                            >
                              {brand}
                            </button>
                          );
                        })}
                      </div>
                      {priceRuleForm.apply_to_value && (
                        <p className="text-xs text-secondary-400 mt-1">{priceRuleForm.apply_to_value.split('|||').filter(Boolean).length} marka seçili</p>
                      )}
                    </div>
                  );
                })()}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Yuvarlama</label>
                  <select
                    className="w-full rounded-md border border-secondary-300 px-3 py-2 text-sm"
                    value={priceRuleForm.rounding_type}
                    onChange={(e) => setPriceRuleForm((p) => ({ ...p, rounding_type: e.target.value as '' | 'round_99' | 'round_90' | 'round_up' | 'round_down' }))}
                  >
                    <option value="">Yuvarlama Yok</option>
                    <option value="round_99">.99 (199.99, 299.99)</option>
                    <option value="round_90">.90 (199.90, 299.90)</option>
                    <option value="round_up">Yukarı Yuvarlama</option>
                    <option value="round_down">Aşağı Yuvarlama</option>
                  </select>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (!priceRuleForm.name || !priceRuleForm.value) return;
                  addPriceRuleMutation.mutate({
                    name: priceRuleForm.name,
                    type: priceRuleForm.type,
                    value: parseFloat(priceRuleForm.value),
                    apply_to: priceRuleForm.apply_to,
                    apply_to_value: priceRuleForm.apply_to !== 'all' ? priceRuleForm.apply_to_value : null,
                    rounding_type: priceRuleForm.rounding_type || 'none',
                    is_active: true,
                    priority: (priceRulesResponse?.data?.length ?? 0) + 1,
                  });
                }}
                loading={addPriceRuleMutation.isPending}
                disabled={!priceRuleForm.name || !priceRuleForm.value}
              >
                Kural Ekle
              </Button>
            </div>

            <Alert variant="info" title="Bilgi">
              Kurallar hem satış fiyatına hem karşılaştırma fiyatına uygulanır. Varyant fiyatları da etkilenir.
            </Alert>
          </div>
        )}

        {/* Step 5: Preview & Selection */}
        {currentStep === 5 && (
          <div className="space-y-4">
            {/* Prepare button (if not prepared) */}
            {!previewMeta && (
              <div className="rounded-lg border border-secondary-200 bg-white p-6 text-center">
                <Package className="h-10 w-10 text-secondary-300 mx-auto mb-3" />
                <p className="text-sm text-secondary-600 mb-4">
                  Önizleme verisi henüz hazir degil. Hazırlamak için asagidaki butona tiklayin.
                </p>
                <Button
                  onClick={() => prepareMutation.mutate()}
                  loading={prepareMutation.isPending}
                >
                  <Play className="h-4 w-4" />
                  {prepareMutation.isPending ? 'Hazırlanıyor...' : 'Önizlemeyi Hazırla'}
                </Button>
              </div>
            )}

            {/* Preparing indicator */}
            {prepareMutation.isPending && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-700">XML verisi indiriliyor ve işleniyor...</span>
                </div>
              </div>
            )}

            {previewMeta && (
              <>
                {/* Stats bar */}
                <div className="rounded-lg border border-secondary-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-secondary-500" />
                      <span className="text-sm text-secondary-700">
                        Toplam: <strong>{previewData?.filtered_total ?? previewMeta.total}</strong> ürün
                        {excludedCategories.size > 0 && (
                          <span className="text-xs text-secondary-400 ml-1">({excludedCategories.size} kategori hariç tutuldu)</span>
                        )}
                      </span>
                    </div>
                    {selectionMode === 'manual' && (
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-primary-600" />
                        <span className="text-sm text-primary-700">
                          Seçili: <strong>{selectedIndices.size}</strong> urun
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectionMode('all');
                          setSelectedIndices(new Set());
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          selectionMode === 'all'
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                        }`}
                      >
                        Tümü
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectionMode('manual')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          selectionMode === 'manual'
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                        }`}
                      >
                        Seçililer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div className="rounded-lg border border-secondary-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-4 w-4 text-secondary-500" />
                    <span className="text-sm font-medium text-secondary-700">Filtreler</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary-500 mb-1">Kategori</label>
                      <select
                        className="w-full rounded-md border border-secondary-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={categoryFilter}
                        onChange={(e) => {
                          setCategoryFilter(e.target.value);
                          setPreviewPage(1);
                        }}
                      >
                        <option value="">Tüm Kategoriler</option>
                        {(previewData?.available_categories ?? previewMeta.categories.filter((c) => !excludedCategories.has(c))).map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary-500 mb-1">Marka</label>
                      <select
                        className="w-full rounded-md border border-secondary-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={brandFilter}
                        onChange={(e) => {
                          setBrandFilter(e.target.value);
                          setPreviewPage(1);
                        }}
                      >
                        <option value="">Tüm Markalar</option>
                        {(previewData?.available_brands ?? previewMeta.brands).map((brand) => (
                          <option key={brand} value={brand}>
                            {brand}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary-500 mb-1">
                        Sayi Limiti
                      </label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="İlk N ürünü import et"
                        value={importLimit ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setImportLimit(val ? parseInt(val, 10) : null);
                        }}
                      />
                    </div>
                    {/* Price rules summary */}
                    {hasActivePriceRules && (
                      <div className="col-span-full">
                        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                          <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span className="text-xs text-green-800">
                            Fiyat kuralları aktif — tablodaki fiyatlar kurallar uygulanmış haliyle gösteriliyor
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Products table */}
                <div className="rounded-lg border border-secondary-200 bg-white overflow-hidden">
                  {previewLoading ? (
                    <div className="p-6 text-center text-sm text-secondary-500">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-secondary-400" />
                      Yükleniyor...
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-secondary-50 text-left text-secondary-500">
                              {selectionMode === 'manual' && (
                                <th className="px-3 py-2.5">
                                  <input
                                    type="checkbox"
                                    checked={allPageSelected}
                                    onChange={togglePageSelection}
                                    className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                                  />
                                </th>
                              )}
                              <th className="px-3 py-2.5 font-medium">#</th>
                              <th className="px-3 py-2.5 font-medium">Barkod</th>
                              <th className="px-3 py-2.5 font-medium">Ürün Adı</th>
                              <th className="px-3 py-2.5 font-medium">Fiyat</th>
                              {hasActivePriceRules && <th className="px-3 py-2.5 font-medium">Kıyaslama</th>}
                              <th className="px-3 py-2.5 font-medium">Stok</th>
                              <th className="px-3 py-2.5 font-medium">Marka</th>
                              <th className="px-3 py-2.5 font-medium">Kategori</th>
                              <th className="px-3 py-2.5 font-medium">Görsel</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageProducts.map((product) => {
                              const thumb = product._images?.[0];
                              return (
                                <tr
                                  key={product._index}
                                  className={`border-b cursor-pointer hover:bg-secondary-50 transition-colors ${
                                    selectedIndices.has(product._index) ? 'bg-primary-50/50' : ''
                                  }`}
                                  onClick={() => setDetailProduct(product)}
                                >
                                  {selectionMode === 'manual' && (
                                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={selectedIndices.has(product._index)}
                                        onChange={() => toggleProductSelection(product._index)}
                                        className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                                      />
                                    </td>
                                  )}
                                  <td className="px-3 py-2 text-secondary-400">{product._index + 1}</td>
                                  <td className="px-3 py-2 font-mono text-xs">
                                    {product.barcode ?? '-'}
                                  </td>
                                  <td className="px-3 py-2 max-w-[200px] truncate">
                                    {product.name ?? '-'}
                                  </td>
                                  <td className="px-3 py-2">
                                    {product._adjusted_price && product._original_price && product._adjusted_price !== product._original_price ? (
                                      <span className="flex flex-col leading-tight">
                                        <span className="text-xs text-secondary-400 line-through">{product._original_price.toFixed(2)}</span>
                                        <span className="font-medium text-green-700 bg-green-100 rounded px-1">{product._adjusted_price.toFixed(2)}</span>
                                      </span>
                                    ) : (
                                      product.price ?? '-'
                                    )}
                                  </td>
                                  {hasActivePriceRules && (
                                    <td className="px-3 py-2">
                                      {(() => {
                                        const origCmp = product._original_compare_price ?? 0;
                                        const adjCmp = product._adjusted_compare_price;
                                        if (origCmp > 0 && adjCmp && adjCmp !== origCmp) {
                                          return (
                                            <span className="flex flex-col leading-tight">
                                              <span className="text-xs text-secondary-400 line-through">{origCmp.toFixed(2)}</span>
                                              <span className="font-medium text-amber-700 bg-amber-100 rounded px-1">{adjCmp.toFixed(2)}</span>
                                            </span>
                                          );
                                        }
                                        if (origCmp > 0 && !adjCmp) {
                                          return (
                                            <span className="flex flex-col leading-tight">
                                              <span className="text-xs text-secondary-400 line-through">{origCmp.toFixed(2)}</span>
                                              <span className="text-[10px] text-red-500">fiyat aştı</span>
                                            </span>
                                          );
                                        }
                                        if (origCmp > 0) return <span className="text-xs">{origCmp.toFixed(2)}</span>;
                                        return <span className="text-secondary-300">-</span>;
                                      })()}
                                    </td>
                                  )}
                                  <td className="px-3 py-2">{product.stock_quantity ?? '-'}</td>
                                  <td className="px-3 py-2">{product.brand ?? '-'}</td>
                                  <td className="px-3 py-2 max-w-[200px]" title={product._category_path ?? product.category ?? ''}>
                                    {product._category_path ? (
                                      <span className="text-xs">
                                        {product._category_path.includes(' > ') ? (
                                          <>
                                            <span className="text-secondary-400">{product._category_path.split(' > ')[0]}</span>
                                            <span className="text-secondary-300 mx-0.5">&rsaquo;</span>
                                            <span className="text-secondary-700">{product._category_path.split(' > ').slice(1).join(' > ')}</span>
                                          </>
                                        ) : (
                                          <span className="text-secondary-700">{product._category_path}</span>
                                        )}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    {thumb ? (
                                      <img
                                        src={thumb}
                                        alt=""
                                        className="h-9 w-9 rounded object-cover border border-secondary-200"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                      />
                                    ) : null}
                                    <span className={`inline-flex items-center justify-center h-9 w-9 rounded bg-secondary-100 text-secondary-400 text-xs ${thumb ? 'hidden' : ''}`}>
                                      <ImageIcon className="h-4 w-4" />
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            {pageProducts.length === 0 && (
                              <tr>
                                <td
                                  colSpan={selectionMode === 'manual' ? 10 : 9}
                                  className="px-3 py-6 text-center text-sm text-secondary-500"
                                >
                                  Ürün bulunamadı.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {previewData && previewData.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-secondary-200 px-4 py-3">
                          <span className="text-xs text-secondary-500">
                            {previewData.total} üründen{' '}
                            {(previewData.page - 1) * previewData.per_page + 1}-
                            {Math.min(previewData.page * previewData.per_page, previewData.total)}{' '}
                            gösteriliyor
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                              disabled={previewData.page <= 1}
                              className="rounded p-1.5 text-secondary-400 hover:bg-secondary-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-xs font-medium text-secondary-700 px-2">
                              {previewData.page} / {previewData.last_page}
                            </span>
                            <button
                              onClick={() => setPreviewPage((p) => Math.min(previewData.last_page, p + 1))}
                              disabled={previewData.page >= previewData.last_page}
                              className="rounded p-1.5 text-secondary-400 hover:bg-secondary-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Re-prepare button */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => prepareMutation.mutate()}
                    loading={prepareMutation.isPending}
                    size="sm"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Yeniden Hazırla
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 6: Import */}
        {currentStep === 6 && (
          <div className="space-y-6">
            {/* Summary card */}
            <div className="rounded-lg border border-secondary-200 bg-white p-6">
              <h3 className="text-sm font-medium text-secondary-700 mb-4">Import Özeti</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="block text-xs text-secondary-500">Seçim Modu</span>
                  <span className="text-sm font-medium text-secondary-900">
                    {selectionMode === 'all' ? 'Tüm Ürünler' : 'Manuel Seçim'}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-secondary-500">Tahmini Ürün</span>
                  <span className="text-sm font-medium text-secondary-900">{getEstimatedCount()}</span>
                </div>
                {categoryFilter && (
                  <div>
                    <span className="block text-xs text-secondary-500">Kategori Filtresi</span>
                    <span className="text-sm font-medium text-secondary-900">{categoryFilter}</span>
                  </div>
                )}
                {brandFilter && (
                  <div>
                    <span className="block text-xs text-secondary-500">Marka Filtresi</span>
                    <span className="text-sm font-medium text-secondary-900">{brandFilter}</span>
                  </div>
                )}
                {importLimit && (
                  <div>
                    <span className="block text-xs text-secondary-500">Sayi Limiti</span>
                    <span className="text-sm font-medium text-secondary-900">{importLimit}</span>
                  </div>
                )}
                {hasActivePriceRules && (
                  <div>
                    <span className="block text-xs text-secondary-500">Fiyat Kuralları</span>
                    <span className="text-sm font-medium text-green-600">
                      {(priceRulesResponse?.data ?? []).filter((r) => r.is_active).length} aktif kural
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-secondary-200">
                <Button
                  onClick={handleStartImport}
                  loading={importMutation.isPending}
                  disabled={importIsActive}
                >
                  <Play className={`h-4 w-4 ${importMutation.isPending ? 'animate-spin' : ''}`} />
                  {importMutation.isPending
                    ? 'Başlatılıyor...'
                    : importIsActive
                      ? 'Import Devam Ediyor...'
                      : 'Import Başlat'}
                </Button>
              </div>
            </div>

            {/* Live progress panel */}
            <ImportProgressPanel progress={progress} isActive={importIsActive} />

            {/* Import logs table */}
            <div className="rounded-lg border border-secondary-200 bg-white p-6">
              <h3 className="text-sm font-medium text-secondary-700 mb-4">Import Geçmişi</h3>
              {logsLoading ? (
                <p className="text-sm text-secondary-500">Yükleniyor...</p>
              ) : !logsResponse?.data?.length ? (
                <p className="text-sm text-secondary-500">Henüz import geçmişi yok.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-secondary-500">
                        <th className="pb-2 pr-3">Tarih</th>
                        <th className="pb-2 pr-3">Toplam</th>
                        <th className="pb-2 pr-3">Yeni</th>
                        <th className="pb-2 pr-3">Güncellenen</th>
                        <th className="pb-2 pr-3">Başarısız</th>
                        <th className="pb-2">Sure</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logsResponse.data.map((log) => (
                        <React.Fragment key={log.id}>
                          <tr className="border-b last:border-0">
                            <td className="py-2 pr-3 text-xs">
                              {formatDate(log.startedAt)}
                            </td>
                            <td className="py-2 pr-3">{log.totalProducts}</td>
                            <td className="py-2 pr-3 text-green-600">{log.created}</td>
                            <td className="py-2 pr-3 text-blue-600">{log.updated}</td>
                            <td className="py-2 pr-3">
                              {log.failed > 0 ? (
                                <button
                                  onClick={() =>
                                    setExpandedError(
                                      expandedError === log.id ? null : log.id,
                                    )
                                  }
                                  className="text-red-600 underline cursor-pointer"
                                >
                                  {log.failed}
                                </button>
                              ) : (
                                <span className="text-secondary-400">0</span>
                              )}
                            </td>
                            <td className="py-2 text-xs">
                              {formatDuration(log.duration)}
                            </td>
                          </tr>
                          {expandedError === log.id && log.errorLog?.length > 0 && (
                            <tr>
                              <td colSpan={6}>
                                <div className="mb-2 rounded bg-red-50 p-3 text-xs text-red-700">
                                  {log.errorLog.map((err, i) => (
                                    <div key={i} className="py-0.5">
                                      {err}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 7: Bulk Operations */}
        {currentStep === 7 && !isNew && (
          <div className="space-y-6">
            {/* Tab nav */}
            <div className="rounded-lg border border-secondary-200 bg-white">
              <div className="flex border-b border-secondary-200">
                {([
                  { key: 'barcode' as const, label: 'Barkod / SKU', icon: Tag },
                  { key: 'name' as const, label: 'Ürün Adı', icon: Type },
                  { key: 'tracking' as const, label: 'XML Ürün Takibi', icon: BarChart3 },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => { setBulkTab(tab.key); setBulkPreview([]); }}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                      bulkTab === tab.key
                        ? 'border-primary-500 text-primary-700'
                        : 'border-transparent text-secondary-500 hover:text-secondary-700'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Tab 1: Barcode/SKU */}
                {bulkTab === 'barcode' && (
                  <div className="space-y-4">
                    <div className="max-w-md space-y-3">
                      <Input
                        label="Suffix Değeri"
                        value={bulkSuffix}
                        onChange={(e) => setBulkSuffix(e.target.value)}
                        placeholder="örn: SHOP"
                      />
                      <p className="text-xs text-secondary-500">
                        Barkod/SKU sonuna &quot;-{bulkSuffix || 'SUFFIX'}&quot; eklenir. Zaten ekli olanlarda tekrar eklenmez.
                      </p>

                      <div className="flex gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" checked={bulkScope === 'all'} onChange={() => setBulkScope('all')} />
                          Tüm ürünler
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" checked={bulkScope === 'selected'} onChange={() => setBulkScope('selected')} />
                          Seçili ürünler ({bulkSelectedProducts.size})
                        </label>
                      </div>

                      {/* Product selection list */}
                      {bulkScope === 'selected' && (
                        <div className="border border-secondary-200 rounded-lg overflow-hidden">
                          <div className="p-2 border-b border-secondary-100">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary-400" />
                              <input
                                type="text"
                                placeholder="Ürün ara..."
                                value={bulkProductSearch}
                                onChange={(e) => { setBulkProductSearch(e.target.value); setBulkProductPage(1); }}
                                className="w-full rounded border border-secondary-200 bg-white pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                          </div>
                          <div className="max-h-[200px] overflow-y-auto">
                            {bulkProductsResponse?.data?.map((p) => (
                              <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary-50 cursor-pointer text-xs border-b border-secondary-50 last:border-0">
                                <input
                                  type="checkbox"
                                  checked={bulkSelectedProducts.has(p.id)}
                                  onChange={() => {
                                    setBulkSelectedProducts((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                                      return next;
                                    });
                                  }}
                                  className="rounded border-secondary-300 text-primary-600 h-3.5 w-3.5"
                                />
                                <span className="flex-1 truncate">{p.name}</span>
                                <span className="font-mono text-secondary-400 flex-shrink-0">{p.sku}</span>
                              </label>
                            ))}
                            {!bulkProductsResponse?.data?.length && (
                              <p className="text-xs text-secondary-400 py-3 text-center">Ürün bulunamadı</p>
                            )}
                          </div>
                          {bulkProductsResponse?.meta && bulkProductsResponse.meta.last_page > 1 && (
                            <div className="flex items-center justify-between px-3 py-1.5 border-t border-secondary-100 bg-secondary-50">
                              <span className="text-[10px] text-secondary-500">{bulkProductsResponse.meta.total} ürün</span>
                              <div className="flex gap-1">
                                <button onClick={() => setBulkProductPage((p) => Math.max(1, p - 1))} disabled={bulkProductPage <= 1} className="text-xs px-2 py-0.5 rounded border disabled:opacity-30">&#8249;</button>
                                <span className="text-[10px] text-secondary-500 px-1">{bulkProductPage}/{bulkProductsResponse.meta.last_page}</span>
                                <button onClick={() => setBulkProductPage((p) => Math.min(bulkProductsResponse.meta.last_page, p + 1))} disabled={bulkProductPage >= bulkProductsResponse.meta.last_page} className="text-xs px-2 py-0.5 rounded border disabled:opacity-30">&#8250;</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Barkod section */}
                    <div className="border border-secondary-200 rounded-lg p-3 space-y-3">
                      <h5 className="text-xs font-medium text-secondary-600">Barkod İşlemleri</h5>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!bulkSuffix) return;
                            setBulkPreviewType('barcode');
                            bulkPreviewMutation.mutate({
                              operation: 'barcode_suffix',
                              params: {
                                suffix: bulkSuffix,
                                ...(bulkScope === 'selected' && bulkSelectedProducts.size > 0 ? { product_ids: Array.from(bulkSelectedProducts) } : {}),
                              },
                            });
                          }}
                          loading={bulkPreviewMutation.isPending && bulkPreviewType === 'barcode'}
                          disabled={!bulkSuffix}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Barkod Önizle
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => bulkBarcodeMutation.mutate({
                            suffix: bulkSuffix,
                            ...(bulkScope === 'selected' && bulkSelectedProducts.size > 0 ? { product_ids: Array.from(bulkSelectedProducts) } : {}),
                          })}
                          loading={bulkBarcodeMutation.isPending}
                          disabled={!bulkSuffix}
                        >
                          Barkod Uygula
                        </Button>
                      </div>
                      {bulkPreview.length > 0 && bulkPreviewType === 'barcode' && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left text-secondary-500">
                                <th className="pb-2 pr-3">Ürün</th>
                                <th className="pb-2 pr-3">Mevcut Barkod</th>
                                <th className="pb-2">Yeni Barkod</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bulkPreview.map((item) => (
                                <tr key={item.id} className="border-b last:border-0">
                                  <td className="py-2 pr-3 text-xs">{item.name}</td>
                                  <td className="py-2 pr-3 font-mono text-xs text-secondary-500">{String(item.before.barcode ?? '-')}</td>
                                  <td className="py-2 font-mono text-xs text-primary-700">{String(item.after.barcode ?? '-')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* SKU section */}
                    <div className="border border-secondary-200 rounded-lg p-3 space-y-3">
                      <h5 className="text-xs font-medium text-secondary-600">SKU İşlemleri</h5>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!bulkSuffix) return;
                            setBulkPreviewType('sku');
                            bulkPreviewMutation.mutate({
                              operation: 'sku_suffix',
                              params: {
                                suffix: bulkSuffix,
                                ...(bulkScope === 'selected' && bulkSelectedProducts.size > 0 ? { product_ids: Array.from(bulkSelectedProducts) } : {}),
                              },
                            });
                          }}
                          loading={bulkPreviewMutation.isPending && bulkPreviewType === 'sku'}
                          disabled={!bulkSuffix}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          SKU Önizle
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => bulkSkuMutation.mutate({
                            suffix: bulkSuffix,
                            ...(bulkScope === 'selected' && bulkSelectedProducts.size > 0 ? { product_ids: Array.from(bulkSelectedProducts) } : {}),
                          })}
                          loading={bulkSkuMutation.isPending}
                          disabled={!bulkSuffix}
                        >
                          SKU Uygula
                        </Button>
                      </div>
                      {bulkPreview.length > 0 && bulkPreviewType === 'sku' && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left text-secondary-500">
                                <th className="pb-2 pr-3">Ürün</th>
                                <th className="pb-2 pr-3">Mevcut SKU</th>
                                <th className="pb-2">Yeni SKU</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bulkPreview.map((item) => (
                                <tr key={item.id} className="border-b last:border-0">
                                  <td className="py-2 pr-3 text-xs">{item.name}</td>
                                  <td className="py-2 pr-3 font-mono text-xs text-secondary-500">{String(item.before.sku ?? '-')}</td>
                                  <td className="py-2 font-mono text-xs text-primary-700">{String(item.after.sku ?? '-')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 2: Product Name */}
                {bulkTab === 'name' && (
                  <div className="space-y-4">
                    <div className="max-w-md space-y-3">
                      <div className="flex gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" checked={bulkNameMode === 'prefix'} onChange={() => setBulkNameMode('prefix')} />
                          Başına ekle
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" checked={bulkNameMode === 'suffix'} onChange={() => setBulkNameMode('suffix')} />
                          Sonuna ekle
                        </label>
                      </div>

                      <Input
                        label="Eklenecek Değer"
                        value={bulkNameValue}
                        onChange={(e) => setBulkNameValue(e.target.value)}
                        placeholder="örn: [YENİ SEZON]"
                      />

                      <div className="flex gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" checked={bulkScope === 'all'} onChange={() => setBulkScope('all')} />
                          Tüm ürünler
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" checked={bulkScope === 'selected'} onChange={() => setBulkScope('selected')} />
                          Seçili ürünler ({bulkSelectedProducts.size})
                        </label>
                      </div>

                      {/* Product selection list */}
                      {bulkScope === 'selected' && (
                        <div className="border border-secondary-200 rounded-lg overflow-hidden">
                          <div className="p-2 border-b border-secondary-100">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary-400" />
                              <input
                                type="text"
                                placeholder="Ürün ara..."
                                value={bulkProductSearch}
                                onChange={(e) => { setBulkProductSearch(e.target.value); setBulkProductPage(1); }}
                                className="w-full rounded border border-secondary-200 bg-white pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                          </div>
                          <div className="max-h-[200px] overflow-y-auto">
                            {bulkProductsResponse?.data?.map((p) => (
                              <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary-50 cursor-pointer text-xs border-b border-secondary-50 last:border-0">
                                <input
                                  type="checkbox"
                                  checked={bulkSelectedProducts.has(p.id)}
                                  onChange={() => {
                                    setBulkSelectedProducts((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                                      return next;
                                    });
                                  }}
                                  className="rounded border-secondary-300 text-primary-600 h-3.5 w-3.5"
                                />
                                <span className="flex-1 truncate">{p.name}</span>
                                <span className="font-mono text-secondary-400 flex-shrink-0">{p.sku}</span>
                              </label>
                            ))}
                            {!bulkProductsResponse?.data?.length && (
                              <p className="text-xs text-secondary-400 py-3 text-center">Ürün bulunamadı</p>
                            )}
                          </div>
                          {bulkProductsResponse?.meta && bulkProductsResponse.meta.last_page > 1 && (
                            <div className="flex items-center justify-between px-3 py-1.5 border-t border-secondary-100 bg-secondary-50">
                              <span className="text-[10px] text-secondary-500">{bulkProductsResponse.meta.total} ürün</span>
                              <div className="flex gap-1">
                                <button onClick={() => setBulkProductPage((p) => Math.max(1, p - 1))} disabled={bulkProductPage <= 1} className="text-xs px-2 py-0.5 rounded border disabled:opacity-30">&#8249;</button>
                                <span className="text-[10px] text-secondary-500 px-1">{bulkProductPage}/{bulkProductsResponse.meta.last_page}</span>
                                <button onClick={() => setBulkProductPage((p) => Math.min(bulkProductsResponse.meta.last_page, p + 1))} disabled={bulkProductPage >= bulkProductsResponse.meta.last_page} className="text-xs px-2 py-0.5 rounded border disabled:opacity-30">&#8250;</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!bulkNameValue) return;
                          bulkPreviewMutation.mutate({
                            operation: 'name_modify',
                            params: {
                              mode: bulkNameMode,
                              value: bulkNameValue,
                              ...(bulkScope === 'selected' && bulkSelectedProducts.size > 0 ? { product_ids: Array.from(bulkSelectedProducts) } : {}),
                            },
                          });
                        }}
                        loading={bulkPreviewMutation.isPending}
                        disabled={!bulkNameValue}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Önizleme
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => bulkNameMutation.mutate({
                          mode: bulkNameMode,
                          value: bulkNameValue,
                          ...(bulkScope === 'selected' && bulkSelectedProducts.size > 0 ? { product_ids: Array.from(bulkSelectedProducts) } : {}),
                        })}
                        loading={bulkNameMutation.isPending}
                        disabled={!bulkNameValue}
                      >
                        Uygula
                      </Button>
                    </div>

                    {bulkPreview.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-secondary-500">
                              <th className="pb-2 pr-3">Önce</th>
                              <th className="pb-2">Sonra</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bulkPreview.map((item) => (
                              <tr key={item.id} className="border-b last:border-0">
                                <td className="py-2 pr-3 text-xs text-secondary-500">{String(item.before.name)}</td>
                                <td className="py-2 text-xs text-primary-700">{String(item.after.name)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: XML Product Tracking */}
                {bulkTab === 'tracking' && (
                  <div className="space-y-4">
                    {/* Summary cards */}
                    {comparisonResponse?.data && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {([
                          { label: 'XML Toplam', value: comparisonResponse.data.total, color: 'text-secondary-900' },
                          { label: 'Eşleşen', value: comparisonResponse.data.matched, color: 'text-green-600' },
                          { label: 'Değişen', value: comparisonResponse.data.with_changes, color: 'text-amber-600' },
                          { label: 'Eşleşmeyen', value: comparisonResponse.data.unmatched, color: 'text-red-600' },
                        ]).map((card) => (
                          <div key={card.label} className="rounded-lg border border-secondary-200 bg-secondary-50 p-4 text-center">
                            <div className="text-xs text-secondary-500">{card.label}</div>
                            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Filter */}
                    <div className="flex gap-3 items-center">
                      <select
                        className="rounded-md border border-secondary-300 bg-white px-3 py-1.5 text-sm"
                        value={trackingStatusFilter}
                        onChange={(e) => { setTrackingStatusFilter(e.target.value); setTrackingPage(1); }}
                      >
                        <option value="">Tüm Durumlar</option>
                        <option value="pending">Bekliyor</option>
                        <option value="imported">İmport Edildi</option>
                        <option value="updated">Güncellendi</option>
                        <option value="unchanged">Değişmedi</option>
                        <option value="failed">Başarısız</option>
                      </select>
                      <Button variant="outline" size="sm" onClick={() => refetchXmlProducts()}>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Yenile
                      </Button>
                    </div>

                    {/* Table */}
                    {xmlProductsLoading ? (
                      <p className="text-sm text-secondary-500">Yükleniyor...</p>
                    ) : !xmlProductsResponse?.data?.length ? (
                      <p className="text-sm text-secondary-500">Henüz XML ürün kaydı yok. İlk import sonrası burada görünecektir.</p>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b text-left text-secondary-500">
                                <th className="pb-2 pr-2">Ürün Adı</th>
                                <th className="pb-2 pr-2">SKU</th>
                                <th className="pb-2 pr-2">Barkod</th>
                                <th className="pb-2 pr-2">Fiyat</th>
                                <th className="pb-2 pr-2">Stok</th>
                                <th className="pb-2 pr-2">Durum</th>
                                <th className="pb-2">Son Görülme</th>
                              </tr>
                            </thead>
                            <tbody>
                              {xmlProductsResponse.data.map((xp) => {
                                const p = xp.product;
                                return (
                                  <tr key={xp.id} className="border-b last:border-0">
                                    <td className="py-2 pr-2 max-w-[180px] truncate" title={p?.name ?? xp.external_name}>
                                      {p?.name ?? xp.external_name}
                                    </td>
                                    <td className="py-2 pr-2 font-mono">{p?.sku ?? xp.external_sku}</td>
                                    <td className="py-2 pr-2 font-mono">{p?.barcode ?? '-'}</td>
                                    <td className="py-2 pr-2">
                                      {p ? `${Number(p.price).toFixed(2)} TL` : '-'}
                                    </td>
                                    <td className="py-2 pr-2">{p?.stock_quantity ?? xp.stock_in_xml}</td>
                                    <td className="py-2 pr-2">
                                      <Badge
                                        variant={
                                          xp.sync_status === 'imported' || xp.sync_status === 'updated' ? 'success'
                                            : xp.sync_status === 'failed' ? 'danger'
                                              : xp.sync_status === 'pending' ? 'warning'
                                                : 'default'
                                        }
                                      >
                                        {xp.sync_status}
                                      </Badge>
                                    </td>
                                    <td className="py-2 text-secondary-500">
                                      {xp.last_seen_at ? new Date(xp.last_seen_at).toLocaleString('tr-TR') : '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        {xmlProductsResponse.meta && xmlProductsResponse.meta.last_page > 1 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-secondary-500">
                              Toplam {xmlProductsResponse.meta.total} kayıt
                            </span>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTrackingPage((p) => Math.max(1, p - 1))}
                                disabled={trackingPage <= 1}
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </Button>
                              <span className="flex items-center px-3 text-xs text-secondary-600">
                                {trackingPage} / {xmlProductsResponse.meta.last_page}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTrackingPage((p) => Math.min(xmlProductsResponse.meta.last_page, p + 1))}
                                disabled={trackingPage >= xmlProductsResponse.meta.last_page}
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bulk operation history */}
            {bulkHistoryResponse?.data && bulkHistoryResponse.data.length > 0 && (
              <div className="rounded-lg border border-secondary-200 bg-white p-4">
                <h4 className="text-sm font-medium text-secondary-700 mb-3">İşlem Geçmişi</h4>
                <div className="space-y-2">
                  {bulkHistoryResponse.data.map((log) => {
                    const opLabel = log.operation === 'barcode_suffix' ? 'Barkod Suffix'
                      : log.operation === 'sku_suffix' ? 'SKU Suffix'
                        : log.operation === 'name_modify' ? 'İsim Değişikliği'
                          : log.operation;
                    const paramStr = log.operation === 'name_modify'
                      ? `${log.params.mode === 'prefix' ? 'Başına' : 'Sonuna'}: "${log.params.value}"`
                      : `"${log.params.suffix}"`;

                    return (
                      <div key={log.id} className={`flex items-center justify-between rounded-lg border p-3 text-xs ${log.reverted ? 'border-secondary-200 bg-secondary-50 opacity-60' : 'border-secondary-200'}`}>
                        <div className="flex-1">
                          <span className="font-medium text-secondary-900">{opLabel}</span>
                          <span className="text-secondary-500 ml-2">{paramStr}</span>
                          <span className="text-secondary-400 ml-2">({log.affected_count} kayıt)</span>
                          <span className="text-secondary-400 ml-2">{new Date(log.created_at).toLocaleString('tr-TR')}</span>
                          {log.reverted && <Badge variant="warning" className="ml-2 text-[10px]">Geri Alındı</Badge>}
                        </div>
                        {!log.reverted && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Bu işlemi geri almak istediğinize emin misiniz?')) {
                                revertMutation.mutate(log.id);
                              }
                            }}
                            loading={revertMutation.isPending}
                          >
                            Geri Al
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      <Dialog
        isOpen={detailProduct !== null}
        onClose={() => setDetailProduct(null)}
        className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <DialogClose onClose={() => setDetailProduct(null)} />
        {detailProduct && (
          <>
            <DialogHeader>
              <DialogTitle>{detailProduct.name ?? 'Ürün Detayı'}</DialogTitle>
            </DialogHeader>
            <DialogContent className="overflow-y-auto flex-1">
              {/* Image Gallery */}
              {detailProduct._images && detailProduct._images.length > 0 && (
                <div className="mb-5">
                  <ProductImageGallery images={detailProduct._images} />
                </div>
              )}

              {/* Product properties grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5">
                <DetailRow label="Barkod / SKU" value={detailProduct.barcode} mono />
                <DetailRow label="Ürün Adı" value={detailProduct.name} />
                <DetailRow
                  label="Fiyat"
                  value={(() => {
                    const p = adjustPrice(detailProduct.price);
                    if (!p.adjusted) return p.original;
                    return `${p.adjusted} (orijinal: ${p.original})`;
                  })()}
                />
                <DetailRow label="Stok" value={detailProduct.stock_quantity} />
                <DetailRow label="Marka" value={detailProduct.brand} />
                <DetailRow label="Kategori" value={detailProduct._category_path} />
              </div>

              {/* Variants */}
              {detailProduct._variants && detailProduct._variants.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-xs font-medium text-secondary-500 uppercase tracking-wider mb-3">
                    Varyantlar ({detailProduct._variants.length})
                  </h4>
                  <div className="space-y-3">
                    {detailProduct._variants.map((variant, vi) => (
                      <div key={vi} className="rounded-lg border border-secondary-200 overflow-hidden">
                        {/* Variant header */}
                        <div className="bg-secondary-50 px-4 py-2 flex items-center gap-3 text-xs font-medium text-secondary-700">
                          <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                            #{vi + 1}
                          </span>
                          {variant.options && variant.options.length > 0 && (
                            <div className="flex items-center gap-2">
                              {variant.options.map((opt, oi) => (
                                <span key={oi} className="bg-white border border-secondary-200 px-2 py-0.5 rounded text-xs">
                                  {opt.type}: <span className="font-semibold">{opt.value}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Variant details */}
                        <div className="px-4 py-2.5 grid grid-cols-4 gap-x-4 gap-y-1.5 text-xs">
                          {variant.sku && (
                            <div>
                              <span className="text-secondary-400">SKU:</span>{' '}
                              <span className="font-mono text-secondary-700">{variant.sku}</span>
                            </div>
                          )}
                          {variant.barcode && (
                            <div>
                              <span className="text-secondary-400">Barkod:</span>{' '}
                              <span className="font-mono text-secondary-700">{variant.barcode}</span>
                            </div>
                          )}
                          {variant.price && (
                            <div>
                              <span className="text-secondary-400">Fiyat:</span>{' '}
                              <span className="text-secondary-700 font-medium">{variant.price}</span>
                            </div>
                          )}
                          {variant.stock !== undefined && variant.stock !== null && (
                            <div>
                              <span className="text-secondary-400">Stok:</span>{' '}
                              <span className={`font-medium ${Number(variant.stock) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {variant.stock}
                              </span>
                            </div>
                          )}
                        </div>
                        {/* Variant images */}
                        {variant.images && variant.images.length > 0 && (
                          <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
                            {variant.images.map((img, ii) => (
                              <img
                                key={ii}
                                src={img}
                                alt={`Varyant ${vi + 1} - Görsel ${ii + 1}`}
                                className="h-16 w-16 rounded border border-secondary-200 object-cover flex-shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All raw fields */}
              {detailProduct._raw && (() => {
                const renderValue = (val: unknown, depth = 0): React.ReactNode => {
                  if (val === null || val === undefined || val === '') return <span className="text-secondary-300">-</span>;
                  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                    return <span className="break-all">{String(val)}</span>;
                  }
                  if (Array.isArray(val)) {
                    return (
                      <div className="space-y-1">
                        {val.map((item, i) => (
                          <div key={i} className="pl-2 border-l-2 border-secondary-200">
                            {typeof item === 'object' && item !== null ? renderObject(item as Record<string, unknown>, depth + 1) : <span className="break-all">{String(item)}</span>}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  if (typeof val === 'object') {
                    return renderObject(val as Record<string, unknown>, depth + 1);
                  }
                  return String(val);
                };

                const renderObject = (obj: Record<string, unknown>, depth: number): React.ReactNode => (
                  <table className="w-full text-xs">
                    <tbody>
                      {Object.entries(obj).map(([k, v]) => (
                        <tr key={k} className="border-b last:border-0">
                          <td className="px-2 py-1 font-medium text-secondary-500 bg-secondary-50/50 w-[30%] align-top">{k}</td>
                          <td className="px-2 py-1 text-secondary-800">{renderValue(v, depth)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );

                return (
                  <div>
                    <h4 className="text-xs font-medium text-secondary-500 uppercase tracking-wider mb-2">Tüm XML Alanları</h4>
                    <div className="rounded-lg border border-secondary-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody>
                          {Object.entries(detailProduct._raw).map(([key, value]) => (
                            <tr key={key} className="border-b last:border-0">
                              <td className="px-3 py-2 font-medium text-secondary-600 bg-secondary-50 w-[35%] text-xs align-top">
                                {key}
                                {(Array.isArray(value) || (typeof value === 'object' && value !== null)) && (
                                  <span className="ml-1 text-secondary-400 text-[10px]">
                                    {Array.isArray(value) ? `[${value.length}]` : '{...}'}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-secondary-800 text-xs">
                                {renderValue(value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between rounded-lg border border-secondary-200 bg-white px-6 py-4">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4" />
          Geri
        </Button>

        {currentStep < 7 && (
          <Button
            onClick={goNext}
            loading={
              (currentStep === 1 && (updateMutation.isPending || createMutation.isPending)) ||
              (currentStep === 2 && (mappingMutation.isPending || prepareMutation.isPending))
            }
          >
            {currentStep === 2 ? 'Kaydet & Önizle' : 'İleri'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
