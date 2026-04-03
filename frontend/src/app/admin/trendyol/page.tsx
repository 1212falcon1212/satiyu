'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsPanel } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import {
  RefreshCw,
  Save,
  Search,
  Send,
  Link2,
  Trash2,
  Wand2,
  CheckCircle2,
  X,
  Filter,
  Loader2,
  Pencil,
} from 'lucide-react';
import type {
  MarketplaceCredential,
  MarketplaceProduct,
  MarketplaceCategory,
  MarketplaceCategoryMapping,
  MarketplaceBrandMapping,
} from '@/types/api';

// ==========================================
// Tab 1 — API Ayarlari
// ==========================================
interface CargoCompany {
  id: number;
  marketplace: string;
  cargoCompanyId: string;
  cargoCompanyName: string;
  isDefault: boolean;
}

function ApiSettingsTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    api_key: '',
    api_secret: '',
    supplier_id: '',
  });
  const { data, isLoading } = useQuery<{ data: MarketplaceCredential | null }>({
    queryKey: ['admin', 'marketplace', 'trendyol', 'credentials'],
    queryFn: async () => {
      const { data } = await api.get('/admin/marketplace/trendyol/credentials');
      return data;
    },
  });

  const credentials = data?.data;

  useEffect(() => {
    if (credentials) {
      setForm({
        api_key: '',
        api_secret: '',
        supplier_id: credentials.supplierId ?? '',
      });
    }
  }, [credentials]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { ...form };
      if (!payload.api_key) delete payload.api_key;
      if (!payload.api_secret) delete payload.api_secret;

      if (credentials) {
        await api.put('/admin/marketplace/trendyol/credentials', payload);
      } else {
        await api.post('/admin/marketplace/trendyol/credentials', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'marketplace', 'trendyol'] });
      toast.success('Kimlik bilgileri kaydedildi.');
    },
    onError: () => toast.error('Kaydetme başarısız.'),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/marketplace/trendyol/test-connection');
      return data;
    },
    onSuccess: (resp) => {
      if (resp.success) {
        toast.success('Bağlantı başarılı!');
      } else {
        toast.error('Bağlantı başarısız.');
      }
    },
    onError: () => toast.error('Bağlantı testi başarısız.'),
  });

  // Cargo companies
  const { data: cargoData } = useQuery<{ data: CargoCompany[] }>({
    queryKey: ['admin', 'trendyol', 'cargo-companies'],
    queryFn: async () => {
      const { data } = await api.get('/admin/trendyol/cargo-companies');
      return data;
    },
  });

  const cargoCompanies = cargoData?.data ?? [];
  const defaultCargo = cargoCompanies.find((c) => c.isDefault);

  const setDefaultCargoMutation = useMutation({
    mutationFn: async (cargoCompanyId: string) => {
      await api.put('/admin/trendyol/cargo-companies/default', {
        cargo_company_id: cargoCompanyId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trendyol', 'cargo-companies'] });
      toast.success('Varsayılan kargo şirketi güncellendi.');
    },
    onError: () => toast.error('Kargo şirketi kaydedilemedi.'),
  });

  if (isLoading) return <div className="p-4 text-secondary-500">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      {/* API Credentials */}
      <div className="rounded-lg border border-secondary-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-secondary-700 mb-4">API Kimlik Bilgileri</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4 max-w-lg"
        >
          {credentials && (
            <Alert variant="info" title="Mevcut Kimlik">
              API Key: {credentials.apiKey}
            </Alert>
          )}
          <Input
            label="API Key"
            type="password"
            value={form.api_key}
            onChange={(e) => setForm((p) => ({ ...p, api_key: e.target.value }))}
            hint={credentials ? 'Boş bırakılırsa değişmez' : ''}
          />
          <Input
            label="API Secret"
            type="password"
            value={form.api_secret}
            onChange={(e) => setForm((p) => ({ ...p, api_secret: e.target.value }))}
            hint={credentials ? 'Boş bırakılırsa değişmez' : ''}
          />
          <Input
            label="Supplier ID (Satici ID)"
            value={form.supplier_id}
            onChange={(e) => setForm((p) => ({ ...p, supplier_id: e.target.value }))}
            hint="Trendyol satici panelindeki Entegrasyon Bilgileri sayfasından alinir"
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saveMutation.isPending}>
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => testMutation.mutate()}
              loading={testMutation.isPending}
            >
              <Link2 className="h-4 w-4" />
              {testMutation.isPending ? 'Test ediliyor...' : 'Bağlantı Test Et'}
            </Button>
          </div>
        </form>
      </div>

      {/* Cargo Company Selection */}
      <div className="rounded-lg border border-secondary-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-secondary-700 mb-1">Kargo Şirketi</h3>
        <p className="text-xs text-secondary-400 mb-4">
          Tüm ürün gönderimlerinde bu kargo şirketi kullanılacaktır. Trendyol sözleşmenizdeki kargo firmasını seçin.
        </p>
        <div className="max-w-lg">
          <select
            className="w-full rounded-md border border-secondary-300 px-3 py-2 text-sm"
            value={defaultCargo?.cargoCompanyId ?? ''}
            onChange={(e) => {
              if (e.target.value) setDefaultCargoMutation.mutate(e.target.value);
            }}
          >
            <option value="">Kargo sirketi seçin...</option>
            {cargoCompanies.map((c) => (
              <option key={c.id} value={c.cargoCompanyId}>
                {c.cargoCompanyName} (ID: {c.cargoCompanyId})
              </option>
            ))}
          </select>
          {defaultCargo && (
            <p className="mt-2 text-xs text-green-600 font-medium">
              Seçili: {defaultCargo.cargoCompanyName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Tab 2 — Kategoriler
// ==========================================
// ─── Auto-Match Types ────────────────────────────────────────
interface TrendyolCategoryWithPath {
  id: number;
  categoryName: string;
  marketplaceCategoryId: number;
  path: string;
  isLeaf: boolean;
}

interface AutoMatchSuggestion {
  trendyolCategory: TrendyolCategoryWithPath;
  score: number;
}

interface AutoMatchResult {
  localCategory: {
    id: number;
    name: string;
  };
  suggestions: AutoMatchSuggestion[];
}

interface MappingWithPath {
  id: number;
  localCategoryId: number;
  marketplaceCategoryId: number;
  category: { id: number; name: string } | null;
  marketplaceCategory: {
    id: number;
    categoryName: string;
    marketplaceCategoryId: number;
    path: string;
  } | null;
}

interface UnifiedCategoryRow {
  localCategory: { id: number; name: string };
  status: 'matched' | 'unmatched';
  existingMapping?: MappingWithPath;
  suggestions: AutoMatchSuggestion[];
}

// ─── Trendyol Category Picker (search + suggestions, leaf-only) ─────────
function TrendyolCategoryPicker({
  suggestions,
  value,
  displayPath,
  onChange,
}: {
  suggestions: AutoMatchSuggestion[];
  value: number | undefined;
  displayPath?: string;
  onChange: (id: number | undefined, path?: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const { data: searchResults, isFetching } = useQuery<{ data: TrendyolCategoryWithPath[] }>({
    queryKey: ['trendyol-cat-search-picker', searchQuery],
    queryFn: async () => {
      const { data } = await api.get('/admin/trendyol/categories/search-picker', {
        params: { search: searchQuery },
      });
      return data;
    },
    enabled: searchQuery.length >= 2,
  });

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Resolve selected path for display
  const selectedPath = React.useMemo(() => {
    if (displayPath) return displayPath;
    const fromSuggestions = suggestions.find((s) => s.trendyolCategory.id === value);
    if (fromSuggestions) return fromSuggestions.trendyolCategory.path;
    const fromSearch = searchResults?.data?.find((c) => c.id === value);
    if (fromSearch) return fromSearch.path;
    return null;
  }, [value, displayPath, suggestions, searchResults]);

  const hasSearchResults = searchQuery.length >= 2 && searchResults?.data && searchResults.data.length > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="flex items-center gap-1 rounded border border-secondary-200 bg-white text-sm cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        <input
          type="text"
          className="flex-1 px-2 py-1.5 bg-transparent outline-none text-sm min-w-0"
          placeholder={selectedPath ? '' : 'Trendyol kategorisi ara...'}
          value={isOpen ? searchQuery : ''}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {isFetching && <Loader2 className="h-3 w-3 animate-spin text-secondary-400 mr-1 shrink-0" />}
        {value && (
          <button
            className="p-1 text-secondary-400 hover:text-secondary-600 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
              setSearchQuery('');
            }}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Selected path display when closed */}
      {!isOpen && selectedPath && (
        <div className="absolute inset-0 flex items-center px-2 bg-white rounded border border-secondary-200 pointer-events-none overflow-hidden">
          <CategoryPathDisplay path={selectedPath} />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[400px] max-h-64 overflow-y-auto rounded border border-secondary-200 bg-white shadow-lg">
          {/* Suggestions */}
          {suggestions.length > 0 && !hasSearchResults && (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold text-secondary-400 uppercase tracking-wide bg-secondary-50 sticky top-0">
                Öneriler (yaprak kategoriler)
              </div>
              {suggestions.map((s) => (
                <button
                  key={s.trendyolCategory.id}
                  className={`w-full text-left px-2 py-2 hover:bg-primary-50 flex items-center justify-between gap-2 border-b border-secondary-50 ${
                    value === s.trendyolCategory.id ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => {
                    onChange(s.trendyolCategory.id, s.trendyolCategory.path);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <CategoryPathDisplay path={s.trendyolCategory.path} />
                  <Badge variant={s.score >= 80 ? 'success' : s.score >= 50 ? 'warning' : 'danger'} className="shrink-0">
                    %{s.score}
                  </Badge>
                </button>
              ))}
            </>
          )}

          {/* Search Results */}
          {hasSearchResults && (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold text-secondary-400 uppercase tracking-wide bg-secondary-50 sticky top-0">
                Arama Sonuçlari (sadece yaprak kategoriler)
              </div>
              {searchResults.data.map((cat) => (
                <button
                  key={cat.id}
                  className={`w-full text-left px-2 py-2 hover:bg-primary-50 border-b border-secondary-50 ${
                    value === cat.id ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => {
                    onChange(cat.id, cat.path);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <CategoryPathDisplay path={cat.path} />
                </button>
              ))}
            </>
          )}

          {searchQuery.length >= 2 && !isFetching && !searchResults?.data?.length && (
            <div className="px-2 py-3 text-sm text-secondary-400 text-center">Sonuç bulunamadı</div>
          )}

          {searchQuery.length < 2 && suggestions.length === 0 && (
            <div className="px-2 py-3 text-sm text-secondary-400 text-center">
              Aramak için en az 2 karakter yazin
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** "Giyim > Kadın Ayakkabı > Topuklu" seklinde path'i renkli gosterir */
function CategoryPathDisplay({ path }: { path: string }) {
  const parts = path.split(' > ');
  const leaf = parts[parts.length - 1];
  const ancestors = parts.slice(0, -1);

  return (
    <span className="text-xs leading-tight truncate">
      {ancestors.length > 0 && (
        <span className="text-secondary-400">
          {ancestors.join(' > ')}
          {' > '}
        </span>
      )}
      <span className="text-secondary-700 font-medium">{leaf}</span>
    </span>
  );
}

function CategoriesTab() {
  const queryClient = useQueryClient();

  // Auto-match state
  const [autoMatchResults, setAutoMatchResults] = useState<AutoMatchResult[] | null>(null);
  const [acceptedMappings, setAcceptedMappings] = useState<Map<number, number>>(new Map());
  const [matchFilter, setMatchFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [localSearch, setLocalSearch] = useState('');

  // Accepted mapping paths — to display path for newly selected items
  const [acceptedPaths, setAcceptedPaths] = useState<Map<number, string>>(new Map());

  const { data: mappingsData } = useQuery<{ data: MappingWithPath[] }>({
    queryKey: ['admin', 'trendyol', 'category-mappings-with-path'],
    queryFn: async () => {
      const { data } = await api.get('/admin/trendyol/category-mappings-with-path');
      return data;
    },
  });

  const { data: localCategories } = useQuery<{ data: Array<{ id: number; name: string; children?: Array<{ id: number; name: string }> }> }>({
    queryKey: ['admin', 'categories', 'tree'],
    queryFn: async () => {
      const { data } = await api.get('/admin/categories/tree');
      return data;
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post('/admin/trendyol/sync-categories'),
    onSuccess: () => {
      toast.success('Kategori senk işlemi başladı.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'trendyol', 'categories'] });
    },
    onError: () => toast.error('Senk başlatılamadı.'),
  });

  // Auto-match mutation
  const autoMatchMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get('/admin/trendyol/auto-match-categories');
      return data as { data: AutoMatchResult[] };
    },
    onSuccess: (resp) => {
      setAutoMatchResults(resp.data);
      const initial = new Map<number, number>();
      const initialPaths = new Map<number, string>();
      resp.data.forEach((r) => {
        if (r.suggestions.length > 0 && r.suggestions[0].score >= 50) {
          initial.set(r.localCategory.id, r.suggestions[0].trendyolCategory.id);
          initialPaths.set(r.localCategory.id, r.suggestions[0].trendyolCategory.path);
        }
      });
      setAcceptedMappings(initial);
      setAcceptedPaths(initialPaths);
      toast.success(`${resp.data.length} kategori için öneri hesaplandı.`);
    },
    onError: () => toast.error('Otomatik eşleştirme başarısız.'),
  });

  // Batch save mutation
  const batchSaveMutation = useMutation({
    mutationFn: async (mappings: Array<{ local_category_id: number; marketplace_category_id: number }>) => {
      const { data } = await api.post('/admin/trendyol/batch-category-mappings', { mappings });
      return data as { message: string; saved_count: number };
    },
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trendyol', 'category-mappings-with-path'] });
      toast.success(resp.message);
      setAutoMatchResults(null);
      setAcceptedMappings(new Map());
    },
    onError: () => toast.error('Toplu kaydetme başarısız.'),
  });

  // Single row save mutation
  const singleSaveMutation = useMutation({
    mutationFn: async ({ localId, marketplaceId }: { localId: number; marketplaceId: number }) => {
      await api.put('/admin/trendyol/category-mappings', {
        local_category_id: localId,
        marketplace_category_id: marketplaceId,
      });
      return localId;
    },
    onSuccess: (localId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trendyol', 'category-mappings-with-path'] });
      toast.success('Eşleştirme kaydedildi.');
      setAutoMatchResults((prev) => prev?.filter((r) => r.localCategory.id !== localId) ?? null);
      setAcceptedMappings((prev) => {
        const next = new Map(prev);
        next.delete(localId);
        return next;
      });
      setAcceptedPaths((prev) => {
        const next = new Map(prev);
        next.delete(localId);
        return next;
      });
      setSavingRowId(null);
      setEditingRowId(null);
    },
    onError: () => {
      toast.error('Kaydetme başarısız.');
      setSavingRowId(null);
    },
  });

  // Get all local categories with full path (tree flattened with hierarchy)
  const getLocalLeaves = React.useCallback(
    (cats: Array<{ id: number; name: string; children?: Array<{ id: number; name: string; children?: unknown[] }> }>): Array<{ id: number; name: string }> => {
      const result: Array<{ id: number; name: string }> = [];
      const walk = (items: typeof cats, parentPath = '') => {
        items.forEach((item) => {
          const fullPath = parentPath ? `${parentPath} > ${item.name}` : item.name;
          if (item.children && item.children.length > 0) {
            walk(item.children as typeof cats, fullPath);
          } else {
            result.push({ id: item.id, name: fullPath });
          }
        });
      };
      walk(cats);
      return result;
    },
    []
  );

  // Build unified rows: matched (from mappings) + unmatched (from auto-match or just local leaves)
  const unifiedRows: UnifiedCategoryRow[] = React.useMemo(() => {
    const localLeaves = getLocalLeaves(localCategories?.data ?? []);
    const mappings = mappingsData?.data ?? [];

    return localLeaves.map((local) => {
      const existingMapping = mappings.find((m) => m.localCategoryId === local.id);
      const autoMatch = autoMatchResults?.find((r) => r.localCategory.id === local.id);

      return {
        localCategory: local,
        status: existingMapping ? 'matched' : 'unmatched',
        existingMapping,
        suggestions: autoMatch?.suggestions ?? [],
      };
    });
  }, [localCategories, mappingsData, autoMatchResults, getLocalLeaves]);

  // Filter + search
  const filteredRows = React.useMemo(() => {
    let rows = unifiedRows;

    if (matchFilter === 'matched') rows = rows.filter((r) => r.status === 'matched');
    if (matchFilter === 'unmatched') rows = rows.filter((r) => r.status === 'unmatched');

    if (localSearch.trim().length >= 2) {
      const term = localSearch.toLocaleLowerCase('tr').trim();
      rows = rows.filter((r) => r.localCategory.name.toLocaleLowerCase('tr').includes(term));
    }

    return rows;
  }, [unifiedRows, matchFilter, localSearch]);

  const matchedCount = unifiedRows.filter((r) => r.status === 'matched').length;
  const unmatchedCount = unifiedRows.filter((r) => r.status === 'unmatched').length;

  const handleBatchSave = () => {
    const mappings = Array.from(acceptedMappings.entries()).map(([localId, marketplaceId]) => ({
      local_category_id: localId,
      marketplace_category_id: marketplaceId,
    }));
    if (mappings.length === 0) {
      toast.error('Kaydedilecek eşleştirme yok.');
      return;
    }
    batchSaveMutation.mutate(mappings);
  };

  const handleAcceptAll = () => {
    if (!autoMatchResults) return;
    const newMappings = new Map<number, number>();
    const newPaths = new Map<number, string>();
    autoMatchResults.forEach((r) => {
      if (r.suggestions.length > 0 && r.suggestions[0].score >= 50) {
        newMappings.set(r.localCategory.id, r.suggestions[0].trendyolCategory.id);
        newPaths.set(r.localCategory.id, r.suggestions[0].trendyolCategory.path);
      }
    });
    setAcceptedMappings(newMappings);
    setAcceptedPaths(newPaths);
    toast.success(`${newMappings.size} eşleştirme seçildi.`);
  };

  return (
    <div className="space-y-4">
      {/* Ust butonlar */}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => syncMutation.mutate()}
          loading={syncMutation.isPending}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4" />
          Kategorileri Senk Et
        </Button>
        <Button
          onClick={() => autoMatchMutation.mutate()}
          loading={autoMatchMutation.isPending}
          variant="outline"
          size="sm"
        >
          <Wand2 className="h-4 w-4" />
          Otomatik Eşle
        </Button>
      </div>

      {/* Ana panel */}
      <div className="rounded-lg border border-secondary-200 bg-white p-4 space-y-4">
        {/* Baslik + Istatistik */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-secondary-700 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary-500" />
            Kategori Eşleştirmeleri
            <Badge variant="success">{matchedCount} eşleştirilmiş</Badge>
            <Badge variant="warning">{unmatchedCount} bekliyor</Badge>
          </h3>
        </div>

        {/* Filtreler + Arama + Aksiyonlar */}
        <div className="flex items-center justify-between gap-4 border-b border-secondary-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-secondary-400 mr-1" />
              {(['all', 'matched', 'unmatched'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setMatchFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    matchFilter === f
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'text-secondary-500 hover:bg-secondary-100'
                  }`}
                >
                  {f === 'all' ? `Tümü (${unifiedRows.length})` : f === 'matched' ? `Eşleşen (${matchedCount})` : `Bekleyen (${unmatchedCount})`}
                </button>
              ))}
            </div>
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Kategori ara..."
              className="w-48 h-7 text-xs"
            />
          </div>
          {acceptedMappings.size > 0 && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleAcceptAll}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Tümünu Kabul Et
              </Button>
              <Button
                size="sm"
                onClick={handleBatchSave}
                loading={batchSaveMutation.isPending}
              >
                <Save className="h-3.5 w-3.5" />
                Seçilenleri Kaydet ({acceptedMappings.size})
              </Button>
            </div>
          )}
        </div>

        {/* Tablo */}
        <div className="max-h-[600px] overflow-y-auto">
          {filteredRows.length === 0 ? (
            <p className="text-sm text-secondary-500 text-center py-8">
              {localSearch ? 'Aramayla eşleşen kategori yok.' : 'Gösterilecek kategori yok.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b text-left text-secondary-500">
                  <th className="pb-2 pr-3 w-1/4">Yerel Kategori</th>
                  <th className="pb-2 pr-3">Trendyol Kategorisi</th>
                  <th className="pb-2 pr-3 w-16 text-center">Durum</th>
                  <th className="pb-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const isSavingRow = savingRowId === row.localCategory.id;
                  const isEditing = editingRowId === row.localCategory.id;
                  const pendingMappingId = acceptedMappings.get(row.localCategory.id);
                  const isMatchedIdle = row.status === 'matched' && !isEditing;

                  return (
                    <tr
                      key={row.localCategory.id}
                      className={`border-b last:border-0 transition-colors ${
                        isMatchedIdle
                          ? 'bg-green-50/40'
                          : pendingMappingId
                            ? 'bg-amber-50/40'
                            : 'hover:bg-secondary-50/50'
                      }`}
                    >
                      <td className="py-2.5 pr-3 font-medium text-secondary-700">
                        {row.localCategory.name}
                      </td>
                      <td className="py-2.5 pr-3">
                        {isMatchedIdle ? (
                          <CategoryPathDisplay path={row.existingMapping?.marketplaceCategory?.path ?? row.existingMapping?.marketplaceCategory?.categoryName ?? '-'} />
                        ) : (
                          <TrendyolCategoryPicker
                            suggestions={row.suggestions}
                            value={pendingMappingId ?? (isEditing ? row.existingMapping?.marketplaceCategoryId : undefined)}
                            displayPath={
                              pendingMappingId
                                ? acceptedPaths.get(row.localCategory.id)
                                : isEditing
                                  ? row.existingMapping?.marketplaceCategory?.path
                                  : undefined
                            }
                            onChange={(id, path) => {
                              setAcceptedMappings((prev) => {
                                const next = new Map(prev);
                                if (id) {
                                  next.set(row.localCategory.id, id);
                                } else {
                                  next.delete(row.localCategory.id);
                                }
                                return next;
                              });
                              setAcceptedPaths((prev) => {
                                const next = new Map(prev);
                                if (id && path) {
                                  next.set(row.localCategory.id, path);
                                } else {
                                  next.delete(row.localCategory.id);
                                }
                                return next;
                              });
                            }}
                          />
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        {isMatchedIdle ? (
                          <Badge variant="success">Eşleştirildi</Badge>
                        ) : pendingMappingId ? (
                          <Badge variant="warning">Seçildi</Badge>
                        ) : isEditing ? (
                          <Badge variant="default">Düzenleniyor</Badge>
                        ) : (
                          <Badge variant="default">Bekliyor</Badge>
                        )}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1">
                          {isMatchedIdle ? (
                            <button
                              className="text-secondary-400 hover:text-primary-600 p-1"
                              title="Düzenle"
                              onClick={() => setEditingRowId(row.localCategory.id)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          ) : isEditing && !pendingMappingId ? (
                            <button
                              className="text-secondary-400 hover:text-secondary-600 p-1"
                              title="Vazgeç"
                              onClick={() => setEditingRowId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ) : pendingMappingId ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isSavingRow}
                                onClick={() => {
                                  setSavingRowId(row.localCategory.id);
                                  singleSaveMutation.mutate({
                                    localId: row.localCategory.id,
                                    marketplaceId: pendingMappingId,
                                  });
                                }}
                              >
                                {isSavingRow ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Save className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              {isEditing && (
                                <button
                                  className="text-secondary-400 hover:text-secondary-600 p-1"
                                  title="Vazgeç"
                                  onClick={() => {
                                    setEditingRowId(null);
                                    setAcceptedMappings((prev) => {
                                      const next = new Map(prev);
                                      next.delete(row.localCategory.id);
                                      return next;
                                    });
                                    setAcceptedPaths((prev) => {
                                      const next = new Map(prev);
                                      next.delete(row.localCategory.id);
                                      return next;
                                    });
                                  }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}


// ==========================================
// Tab 3 — Markalar
// ==========================================

// ─── Brand Auto-Match Types ────────────────────────────────────
interface BrandAutoMatchSuggestion {
  trendyolBrand: { id: number; marketplaceBrandId: number; name: string };
  score: number;
}

interface BrandAutoMatchResult {
  localBrand: { id: number; name: string };
  suggestions: BrandAutoMatchSuggestion[];
}

interface UnifiedBrandRow {
  localBrand: { id: number; name: string };
  status: 'matched' | 'unmatched';
  existingMapping?: { id: number; marketplaceBrandId: number; marketplaceBrandName: string };
  suggestions: BrandAutoMatchSuggestion[];
}

// ─── TrendyolBrandPicker ────────────────────────────────────────
function TrendyolBrandPicker({
  suggestions,
  value,
  displayName,
  onChange,
}: {
  suggestions: BrandAutoMatchSuggestion[];
  value?: number; // marketplace_brand_mapping id
  displayName?: string;
  onChange: (mappingId: number | undefined, brandName?: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // Trendyol API search
  const { data: searchResults, isFetching } = useQuery<{ data: Array<{ id: number; name: string }> }>({
    queryKey: ['admin', 'trendyol', 'brands', 'search', searchQuery],
    queryFn: async () => {
      const { data } = await api.get('/admin/trendyol/brands/search', {
        params: { name: searchQuery },
      });
      return data;
    },
    enabled: searchQuery.length >= 2,
  });

  // DB search for synced brands (marketplace_brand_mappings)
  const { data: dbSearchResults, isFetching: isDbFetching } = useQuery<{
    data: Array<{ id: number; marketplaceBrandId: number; marketplaceBrandName: string; localBrandId: number | null }>;
  }>({
    queryKey: ['admin', 'trendyol', 'brands', 'db-search', searchQuery],
    queryFn: async () => {
      const { data } = await api.get('/admin/trendyol/brands', {
        params: { search: searchQuery, per_page: 20 },
      });
      return data;
    },
    enabled: searchQuery.length >= 2,
  });

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedName = React.useMemo(() => {
    if (displayName) return displayName;
    const fromSuggestions = suggestions.find((s) => s.trendyolBrand.id === value);
    if (fromSuggestions) return fromSuggestions.trendyolBrand.name;
    return null;
  }, [value, displayName, suggestions]);

  const hasDbResults = searchQuery.length >= 2 && dbSearchResults?.data && dbSearchResults.data.length > 0;
  const hasApiResults = searchQuery.length >= 2 && searchResults?.data && searchResults.data.length > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="flex items-center gap-1 rounded border border-secondary-200 bg-white text-sm cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        <input
          type="text"
          className="flex-1 px-2 py-1.5 bg-transparent outline-none text-sm min-w-0"
          placeholder={selectedName ? '' : 'Trendyol markasi ara...'}
          value={isOpen ? searchQuery : ''}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {(isFetching || isDbFetching) && <Loader2 className="h-3 w-3 animate-spin text-secondary-400 mr-1 shrink-0" />}
        {value && (
          <button
            className="p-1 text-secondary-400 hover:text-secondary-600 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
              setSearchQuery('');
            }}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Selected name display when closed */}
      {!isOpen && selectedName && (
        <div className="absolute inset-0 flex items-center px-2 bg-white rounded border border-secondary-200 pointer-events-none overflow-hidden">
          <span className="text-xs text-secondary-700 font-medium truncate">{selectedName}</span>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[300px] max-h-64 overflow-y-auto rounded border border-secondary-200 bg-white shadow-lg">
          {/* Suggestions from auto-match */}
          {suggestions.length > 0 && !hasDbResults && !hasApiResults && (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold text-secondary-400 uppercase tracking-wide bg-secondary-50 sticky top-0">
                Öneriler
              </div>
              {suggestions.map((s) => (
                <button
                  key={s.trendyolBrand.id}
                  className={`w-full text-left px-2 py-2 hover:bg-primary-50 flex items-center justify-between gap-2 border-b border-secondary-50 ${
                    value === s.trendyolBrand.id ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => {
                    onChange(s.trendyolBrand.id, s.trendyolBrand.name);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <span className="text-xs text-secondary-700">{s.trendyolBrand.name}</span>
                  <Badge variant={s.score >= 80 ? 'success' : s.score >= 50 ? 'warning' : 'danger'} className="shrink-0">
                    %{s.score}
                  </Badge>
                </button>
              ))}
            </>
          )}

          {/* DB search results (synced brands) */}
          {hasDbResults && (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold text-secondary-400 uppercase tracking-wide bg-secondary-50 sticky top-0">
                Senkronize Markalar
              </div>
              {dbSearchResults.data.map((b) => (
                <button
                  key={b.id}
                  className={`w-full text-left px-2 py-2 hover:bg-primary-50 border-b border-secondary-50 ${
                    value === b.id ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => {
                    onChange(b.id, b.marketplaceBrandName);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <span className="text-xs text-secondary-700">{b.marketplaceBrandName}</span>
                  <span className="text-[10px] text-secondary-400 ml-2">(ID: {b.marketplaceBrandId})</span>
                </button>
              ))}
            </>
          )}

          {/* Trendyol API search results */}
          {hasApiResults && (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold text-secondary-400 uppercase tracking-wide bg-secondary-50 sticky top-0">
                Trendyol API Sonuçlari
              </div>
              {searchResults.data.map((b) => (
                <button
                  key={b.id}
                  className={`w-full text-left px-2 py-2 hover:bg-primary-50 border-b border-secondary-50`}
                  onClick={() => {
                    // For API results, we save via updateBrandMapping directly
                    onChange(undefined, `API:${b.id}:${b.name}`);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <span className="text-xs text-secondary-700">{b.name}</span>
                  <span className="text-[10px] text-secondary-400 ml-2">(ID: {b.id})</span>
                </button>
              ))}
            </>
          )}

          {searchQuery.length >= 2 && !isFetching && !isDbFetching && !dbSearchResults?.data?.length && !searchResults?.data?.length && (
            <div className="px-2 py-3 text-sm text-secondary-400 text-center">Sonuç bulunamadı</div>
          )}

          {searchQuery.length < 2 && suggestions.length === 0 && (
            <div className="px-2 py-3 text-sm text-secondary-400 text-center">
              Aramak için en az 2 karakter yazin
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BrandsTab() {
  const queryClient = useQueryClient();

  // Auto-match state
  const [autoMatchResults, setAutoMatchResults] = useState<BrandAutoMatchResult[] | null>(null);
  const [acceptedMappings, setAcceptedMappings] = useState<Map<number, number>>(new Map()); // localBrandId → mappingId
  const [acceptedNames, setAcceptedNames] = useState<Map<number, string>>(new Map()); // localBrandId → brandName
  const [matchFilter, setMatchFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [bulkBrandSearch, setBulkBrandSearch] = useState('');
  const [bulkBrandResults, setBulkBrandResults] = useState<Array<{ id: number; name: string }>>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkMapping, setBulkMapping] = useState(false);

  // Fetch existing mappings (only matched ones: local_brand_id IS NOT NULL)
  const { data: mappingsData } = useQuery<{
    data: Array<{ id: number; localBrandId: number; marketplaceBrandId: number; marketplaceBrandName: string; brand: { id: number; name: string } | null }>;
  }>({
    queryKey: ['admin', 'trendyol', 'brands', 'matched'],
    queryFn: async () => {
      const { data } = await api.get('/admin/trendyol/brands', {
        params: { matched: true, per_page: 500 },
      });
      return data;
    },
  });

  // Fetch all local brands (per_page=1000 to get all brands, not just first 15)
  const { data: localBrands } = useQuery<{ data: Array<{ id: number; name: string }> }>({
    queryKey: ['admin', 'brands', 'all'],
    queryFn: async () => {
      const { data } = await api.get('/admin/brands', { params: { per_page: 1000 } });
      return data;
    },
  });

  // Sync brands
  const syncMutation = useMutation({
    mutationFn: () => api.post('/admin/trendyol/sync-brands'),
    onSuccess: (resp) => {
      toast.success(resp.data.message);
      queryClient.invalidateQueries({ queryKey: ['admin', 'trendyol', 'brands'] });
    },
    onError: () => toast.error('Marka senk başarısız.'),
  });

  // Auto-match mutation
  const autoMatchMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get('/admin/trendyol/auto-match-brands');
      return data as { data: BrandAutoMatchResult[] };
    },
    onSuccess: (resp) => {
      setAutoMatchResults(resp.data);
      const initial = new Map<number, number>();
      const initialNames = new Map<number, string>();
      resp.data.forEach((r) => {
        if (r.suggestions.length > 0 && r.suggestions[0].score >= 50) {
          initial.set(r.localBrand.id, r.suggestions[0].trendyolBrand.id);
          initialNames.set(r.localBrand.id, r.suggestions[0].trendyolBrand.name);
        }
      });
      setAcceptedMappings(initial);
      setAcceptedNames(initialNames);
      toast.success(`${resp.data.length} marka için öneri hesaplandı.`);
    },
    onError: () => toast.error('Otomatik eşleştirme başarısız.'),
  });

  // Batch save mutation
  const batchSaveMutation = useMutation({
    mutationFn: async (mappings: Array<{ local_brand_id: number; marketplace_brand_mapping_id: number }>) => {
      const { data } = await api.post('/admin/trendyol/batch-brand-mappings', { mappings });
      return data as { message: string; saved_count: number };
    },
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trendyol', 'brands'] });
      toast.success(resp.message);
      setAutoMatchResults(null);
      setAcceptedMappings(new Map());
      setAcceptedNames(new Map());
    },
    onError: () => toast.error('Toplu kaydetme başarısız.'),
  });

  // Single row save — for editing existing mapping or saving from picker with API result
  const singleSaveMutation = useMutation({
    mutationFn: async ({ localBrandId, mappingId, apiResult }: {
      localBrandId: number;
      mappingId?: number;
      apiResult?: { marketplaceBrandId: number; marketplaceBrandName: string };
    }) => {
      if (apiResult) {
        // Save via updateBrandMapping (creates/updates mapping with Trendyol API brand data)
        await api.put('/admin/trendyol/brand-mappings', {
          local_brand_id: localBrandId,
          marketplace_brand_id: apiResult.marketplaceBrandId,
          marketplace_brand_name: apiResult.marketplaceBrandName,
        });
      } else if (mappingId) {
        // Save via batch endpoint (updates existing mapping's local_brand_id)
        await api.post('/admin/trendyol/batch-brand-mappings', {
          mappings: [{ local_brand_id: localBrandId, marketplace_brand_mapping_id: mappingId }],
        });
      }
      return localBrandId;
    },
    onSuccess: (localBrandId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trendyol', 'brands'] });
      toast.success('Eşleştirme kaydedildi.');
      setAutoMatchResults((prev) => prev?.filter((r) => r.localBrand.id !== localBrandId) ?? null);
      setAcceptedMappings((prev) => {
        const next = new Map(prev);
        next.delete(localBrandId);
        return next;
      });
      setAcceptedNames((prev) => {
        const next = new Map(prev);
        next.delete(localBrandId);
        return next;
      });
      setSavingRowId(null);
      setEditingRowId(null);
    },
    onError: () => {
      toast.error('Kaydetme başarısız.');
      setSavingRowId(null);
    },
  });

  // Remove mapping mutation
  const removeMappingMutation = useMutation({
    mutationFn: async (localBrandId: number) => {
      await api.delete(`/admin/trendyol/brand-mappings/${localBrandId}`);
      return localBrandId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trendyol', 'brands'] });
      toast.success('Eşleştirme kaldırıldı.');
    },
    onError: () => toast.error('Kaldırma başarısız.'),
  });

  // Build unified rows
  const unifiedRows: UnifiedBrandRow[] = React.useMemo(() => {
    const allLocal = localBrands?.data ?? [];
    const mappings = mappingsData?.data ?? [];

    return allLocal.map((local) => {
      const existingMapping = mappings.find((m) => m.localBrandId === local.id);
      const autoMatch = autoMatchResults?.find((r) => r.localBrand.id === local.id);

      return {
        localBrand: local,
        status: existingMapping ? 'matched' as const : 'unmatched' as const,
        existingMapping: existingMapping
          ? {
              id: existingMapping.id,
              marketplaceBrandId: existingMapping.marketplaceBrandId,
              marketplaceBrandName: existingMapping.marketplaceBrandName,
            }
          : undefined,
        suggestions: autoMatch?.suggestions ?? [],
      };
    });
  }, [localBrands, mappingsData, autoMatchResults]);

  // Filter + search
  const filteredRows = React.useMemo(() => {
    let rows = unifiedRows;

    if (matchFilter === 'matched') rows = rows.filter((r) => r.status === 'matched');
    if (matchFilter === 'unmatched') rows = rows.filter((r) => r.status === 'unmatched');

    if (localSearch.trim().length >= 2) {
      const term = localSearch.toLocaleLowerCase('tr').trim();
      rows = rows.filter((r) => r.localBrand.name.toLocaleLowerCase('tr').includes(term));
    }

    return rows;
  }, [unifiedRows, matchFilter, localSearch]);

  const matchedCount = unifiedRows.filter((r) => r.status === 'matched').length;
  const unmatchedCount = unifiedRows.filter((r) => r.status === 'unmatched').length;

  const handleBatchSave = () => {
    const mappings: Array<Record<string, unknown>> = [];
    acceptedMappings.forEach((mappingId, localId) => {
      const name = acceptedNames.get(localId);
      if (name?.startsWith('API:')) {
        const parts = name.split(':');
        const trendyolBrandId = parseInt(parts[1], 10);
        const brandName = parts.slice(2).join(':');
        mappings.push({
          local_brand_id: localId,
          marketplace_brand_id: trendyolBrandId,
          marketplace_brand_name: brandName,
        });
      } else if (mappingId) {
        mappings.push({
          local_brand_id: localId,
          marketplace_brand_mapping_id: mappingId,
        });
      }
    });
    if (mappings.length === 0) {
      toast.error('Kaydedilecek eşleştirme yok.');
      return;
    }
    batchSaveMutation.mutate(mappings as Array<{ local_brand_id: number; marketplace_brand_mapping_id: number }>);
  };

  const handleAcceptAll = () => {
    if (!autoMatchResults) return;
    const newMappings = new Map<number, number>();
    const newNames = new Map<number, string>();
    autoMatchResults.forEach((r) => {
      if (r.suggestions.length > 0 && r.suggestions[0].score >= 50) {
        newMappings.set(r.localBrand.id, r.suggestions[0].trendyolBrand.id);
        newNames.set(r.localBrand.id, r.suggestions[0].trendyolBrand.name);
      }
    });
    setAcceptedMappings(newMappings);
    setAcceptedNames(newNames);
    toast.success(`${newMappings.size} eşleştirme seçildi.`);
  };

  // Bulk brand search
  const handleBulkSearch = async (q: string) => {
    setBulkBrandSearch(q);
    if (q.length < 2) { setBulkBrandResults([]); return; }
    try {
      const { data } = await api.get('/admin/trendyol/brands', { params: { search: q, per_page: 20 } });
      setBulkBrandResults((data.data ?? []).map((b: { id: number; marketplaceBrandId: number; marketplaceBrandName: string }) => ({ id: b.marketplaceBrandId, name: b.marketplaceBrandName })));
    } catch { setBulkBrandResults([]); }
  };

  const handleBulkMapAll = async (brandId: number, brandName: string) => {
    setBulkMapping(true);
    try {
      const { data } = await api.post('/admin/trendyol/bulk-map-all-brands', {
        marketplace_brand_id: brandId,
        marketplace_brand_name: brandName,
      });
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['admin', 'trendyol', 'brands'] });
      setShowBulkDialog(false);
      setBulkBrandSearch('');
      setBulkBrandResults([]);
    } catch {
      toast.error('Toplu eşleştirme başarısız.');
    } finally {
      setBulkMapping(false);
    }
  };

  const handlePickerChange = (localBrandId: number, mappingId: number | undefined, brandName?: string) => {
    setAcceptedMappings((prev) => {
      const next = new Map(prev);
      if (mappingId) {
        next.set(localBrandId, mappingId);
      } else {
        next.delete(localBrandId);
      }
      return next;
    });
    setAcceptedNames((prev) => {
      const next = new Map(prev);
      if (mappingId && brandName) {
        next.set(localBrandId, brandName);
      } else if (brandName?.startsWith('API:')) {
        // API result: store for display
        next.set(localBrandId, brandName);
      } else {
        next.delete(localBrandId);
      }
      return next;
    });
  };

  const handleSingleSave = (localBrandId: number) => {
    setSavingRowId(localBrandId);
    const mappingId = acceptedMappings.get(localBrandId);
    const name = acceptedNames.get(localBrandId);

    // Check if this is an API result (format: "API:trendyolBrandId:brandName")
    if (name?.startsWith('API:')) {
      const parts = name.split(':');
      const trendyolBrandId = parseInt(parts[1], 10);
      const brandName = parts.slice(2).join(':');
      singleSaveMutation.mutate({
        localBrandId,
        apiResult: { marketplaceBrandId: trendyolBrandId, marketplaceBrandName: brandName },
      });
    } else if (mappingId) {
      singleSaveMutation.mutate({ localBrandId, mappingId });
    }
  };

  return (
    <div className="space-y-4">
      {/* Ust butonlar */}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => syncMutation.mutate()}
          loading={syncMutation.isPending}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4" />
          Markalari Senk Et
        </Button>
        <Button
          onClick={() => autoMatchMutation.mutate()}
          loading={autoMatchMutation.isPending}
          variant="outline"
          size="sm"
        >
          <Wand2 className="h-4 w-4" />
          Otomatik Eşle
        </Button>
        <Button
          onClick={() => setShowBulkDialog(true)}
          variant="outline"
          size="sm"
        >
          Tümünü Tek Markayla Eşleştir
        </Button>
      </div>

      {/* Bulk Map Dialog */}
      {showBulkDialog && (
        <div className="rounded-lg border-2 border-accent/30 bg-accent/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-secondary-900">Tüm Markaları Tek Trendyol Markasıyla Eşleştir</h4>
            <button onClick={() => { setShowBulkDialog(false); setBulkBrandSearch(''); setBulkBrandResults([]); }} className="text-secondary-400 hover:text-secondary-600 text-lg">&times;</button>
          </div>
          <p className="text-xs text-secondary-500">Trendyol markası arayın ve seçin. Tüm yerel markalar seçtiğiniz Trendyol markasıyla eşleştirilecek.</p>
          <div className="relative">
            <input
              type="text"
              value={bulkBrandSearch}
              onChange={(e) => handleBulkSearch(e.target.value)}
              placeholder="Trendyol markası ara... (ör: SATIYU)"
              className="w-full rounded-md border border-secondary-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {bulkBrandResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-secondary-200 bg-white shadow-lg">
                {bulkBrandResults.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleBulkMapAll(b.id, b.name)}
                    disabled={bulkMapping}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-secondary-50 disabled:opacity-50"
                  >
                    <span className="font-medium">{b.name}</span>
                    <span className="text-xs text-secondary-400">ID: {b.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {bulkMapping && <p className="text-sm text-accent animate-pulse">Eşleştiriliyor...</p>}
        </div>
      )}

      {/* Ana panel */}
      <div className="rounded-lg border border-secondary-200 bg-white p-4 space-y-4">
        {/* Baslik + Istatistik */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-secondary-700 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary-500" />
            Marka Eşleştirmeleri
            <Badge variant="success">{matchedCount} eşleştirilmiş</Badge>
            <Badge variant="warning">{unmatchedCount} bekliyor</Badge>
          </h3>
        </div>

        {/* Filtreler + Arama + Aksiyonlar */}
        <div className="flex items-center justify-between gap-4 border-b border-secondary-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-secondary-400 mr-1" />
              {(['all', 'matched', 'unmatched'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setMatchFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    matchFilter === f
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'text-secondary-500 hover:bg-secondary-100'
                  }`}
                >
                  {f === 'all' ? `Tümü (${unifiedRows.length})` : f === 'matched' ? `Eşleşen (${matchedCount})` : `Bekleyen (${unmatchedCount})`}
                </button>
              ))}
            </div>
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Marka ara..."
              className="w-48 h-7 text-xs"
            />
          </div>
          {acceptedMappings.size > 0 && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleAcceptAll}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Tümünu Kabul Et
              </Button>
              <Button
                size="sm"
                onClick={handleBatchSave}
                loading={batchSaveMutation.isPending}
              >
                <Save className="h-3.5 w-3.5" />
                Seçilenleri Kaydet ({acceptedMappings.size})
              </Button>
            </div>
          )}
        </div>

        {/* Tablo */}
        <div className="max-h-[600px] overflow-y-auto">
          {filteredRows.length === 0 ? (
            <p className="text-sm text-secondary-500 text-center py-8">
              {localSearch ? 'Aramayla eşleşen marka yok.' : 'Gösterilecek marka yok.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b text-left text-secondary-500">
                  <th className="pb-2 pr-3 w-1/4">Yerel Marka</th>
                  <th className="pb-2 pr-3">Trendyol Marka</th>
                  <th className="pb-2 pr-3 w-16 text-center">Durum</th>
                  <th className="pb-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const isSavingRow = savingRowId === row.localBrand.id;
                  const isEditing = editingRowId === row.localBrand.id;
                  const pendingMappingId = acceptedMappings.get(row.localBrand.id);
                  const pendingName = acceptedNames.get(row.localBrand.id);
                  const isMatchedIdle = row.status === 'matched' && !isEditing;
                  const hasPendingSelection = pendingMappingId !== undefined || (pendingName?.startsWith('API:'));

                  return (
                    <tr
                      key={row.localBrand.id}
                      className={`border-b last:border-0 transition-colors ${
                        isMatchedIdle
                          ? 'bg-green-50/40'
                          : hasPendingSelection
                            ? 'bg-amber-50/40'
                            : 'hover:bg-secondary-50/50'
                      }`}
                    >
                      <td className="py-2.5 pr-3 font-medium text-secondary-700">
                        {row.localBrand.name}
                      </td>
                      <td className="py-2.5 pr-3">
                        {isMatchedIdle ? (
                          <span className="text-xs text-secondary-700 font-medium">
                            {row.existingMapping?.marketplaceBrandName ?? '-'}
                            <span className="text-secondary-400 ml-1 text-[10px]">(ID: {row.existingMapping?.marketplaceBrandId})</span>
                          </span>
                        ) : (
                          <TrendyolBrandPicker
                            suggestions={row.suggestions}
                            value={pendingMappingId ?? (isEditing ? row.existingMapping?.id : undefined)}
                            displayName={
                              hasPendingSelection
                                ? (pendingName?.startsWith('API:') ? pendingName.split(':').slice(2).join(':') : pendingName)
                                : isEditing
                                  ? row.existingMapping?.marketplaceBrandName
                                  : undefined
                            }
                            onChange={(id, name) => handlePickerChange(row.localBrand.id, id, name)}
                          />
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        {isMatchedIdle ? (
                          <Badge variant="success">Eşleştirildi</Badge>
                        ) : hasPendingSelection ? (
                          <Badge variant="warning">Seçildi</Badge>
                        ) : isEditing ? (
                          <Badge variant="default">Düzenleniyor</Badge>
                        ) : (
                          <Badge variant="default">Bekliyor</Badge>
                        )}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1">
                          {isMatchedIdle ? (
                            <>
                              <button
                                className="text-secondary-400 hover:text-primary-600 p-1"
                                title="Düzenle"
                                onClick={() => setEditingRowId(row.localBrand.id)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                className="text-secondary-400 hover:text-red-600 p-1"
                                title="Eşleştirmeyi Kaldır"
                                onClick={() => {
                                  if (confirm(`"${row.localBrand.name}" eşleştirmesini kaldırmak istiyor musunuz?`)) {
                                    removeMappingMutation.mutate(row.localBrand.id);
                                  }
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : isEditing && !hasPendingSelection ? (
                            <button
                              className="text-secondary-400 hover:text-secondary-600 p-1"
                              title="Vazgeç"
                              onClick={() => setEditingRowId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ) : hasPendingSelection ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isSavingRow}
                                onClick={() => handleSingleSave(row.localBrand.id)}
                              >
                                {isSavingRow ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Save className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              {isEditing && (
                                <button
                                  className="text-secondary-400 hover:text-secondary-600 p-1"
                                  title="Vazgeç"
                                  onClick={() => {
                                    setEditingRowId(null);
                                    setAcceptedMappings((prev) => {
                                      const next = new Map(prev);
                                      next.delete(row.localBrand.id);
                                      return next;
                                    });
                                    setAcceptedNames((prev) => {
                                      const next = new Map(prev);
                                      next.delete(row.localBrand.id);
                                      return next;
                                    });
                                  }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Tab 4 — Ürünler
// ==========================================
function ProductsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchId, setBatchId] = useState('');

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['admin', 'trendyol', 'products', search, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/admin/trendyol/products', { params });
      return data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      const { data } = await api.post('/admin/trendyol/products/send', {
        product_ids: productIds,
      });
      return data;
    },
    onSuccess: (resp) => {
      toast.success(resp.message);
      if (resp.batchRequestId) setBatchId(resp.batchRequestId);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin', 'trendyol', 'products'] });
    },
    onError: () => toast.error('Gönderme başarısız.'),
  });

  const updateMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      const { data } = await api.put('/admin/trendyol/products/update', {
        product_ids: productIds,
      });
      return data;
    },
    onSuccess: (resp) => {
      toast.success(resp.message);
      if (resp.batchRequestId) setBatchId(resp.batchRequestId);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin', 'trendyol', 'products'] });
    },
    onError: () => toast.error('Güncelleme başarısız.'),
  });

  const batchQuery = useQuery({
    queryKey: ['admin', 'trendyol', 'batch', batchId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/trendyol/batch/${batchId}`);
      return data;
    },
    enabled: !!batchId,
  });

  const products: MarketplaceProduct[] = productsData?.data ?? [];

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.productId)));
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, 'success' | 'danger' | 'info' | 'outline'> = {
      approved: 'success',
      on_sale: 'success',
      rejected: 'danger',
      pending: 'info',
    };
    return <Badge variant={map[status] ?? 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          className="rounded-md border border-secondary-300 px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tüm Durumlar</option>
          <option value="pending">Bekliyor</option>
          <option value="approved">Onaylı</option>
          <option value="rejected">Reddedildi</option>
          <option value="on_sale">Satışta</option>
        </select>
        {selectedIds.size > 0 && (
          <>
            <Button
              onClick={() => sendMutation.mutate(Array.from(selectedIds))}
              loading={sendMutation.isPending}
              size="sm"
            >
              <Send className="h-4 w-4" />
              Seçilenleri Gönder ({selectedIds.size})
            </Button>
            <Button
              onClick={() => updateMutation.mutate(Array.from(selectedIds))}
              loading={updateMutation.isPending}
              size="sm"
              variant="outline"
            >
              Seçilenleri Güncelle
            </Button>
          </>
        )}
      </div>

      {batchId && batchQuery.data?.data && (
        <Alert variant="info" title={`Batch: ${batchId}`}>
          Durum: {batchQuery.data.data.status ?? 'Bilinmiyor'} |{' '}
          Başarılı: {(batchQuery.data.data.itemCount ?? 0) - (batchQuery.data.data.failedItemCount ?? 0)} |{' '}
          Başarısız: {batchQuery.data.data.failedItemCount ?? 0}
        </Alert>
      )}

      <div className="rounded-lg border border-secondary-200 bg-white overflow-x-auto">
        {isLoading ? (
          <div className="p-4 text-secondary-500">Yükleniyor...</div>
        ) : products.length === 0 ? (
          <div className="p-4 text-secondary-500">Ürün bulunamadı.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-secondary-500 bg-secondary-50">
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === products.length && products.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="p-3">Barkod</th>
                <th className="p-3">Ürün Adı</th>
                <th className="p-3">Durum</th>
                <th className="p-3">Fiyat</th>
                <th className="p-3">Son Senk</th>
                <th className="p-3">Hata</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-secondary-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.productId)}
                      onChange={() => toggleSelect(p.productId)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3 font-mono text-xs">{p.marketplaceBarcode ?? '-'}</td>
                  <td className="p-3 max-w-[200px] truncate">{p.product?.name ?? '-'}</td>
                  <td className="p-3">{statusBadge(p.status)}</td>
                  <td className="p-3">{p.salePrice ?? p.price}</td>
                  <td className="p-3 text-xs">
                    {p.lastSyncedAt ? new Date(p.lastSyncedAt).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td className="p-3 text-xs text-red-600 max-w-[200px] truncate">
                    {p.errorMessage ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Tab 5 — Fiyat & Stok
// ==========================================
function PriceStockTab() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<
    Array<{
      productId: number;
      barcode: string;
      name: string;
      currentPrice: number;
      currentStock: number;
      newPrice: string;
      newStock: string;
    }>
  >([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['admin', 'trendyol', 'products', 'all'],
    queryFn: async () => {
      const { data } = await api.get('/admin/trendyol/products', {
        params: { per_page: 100 },
      });
      return data;
    },
  });

  const products: MarketplaceProduct[] = productsData?.data ?? [];

  if (products.length > 0 && items.length === 0) {
    setItems(
      products.map((p) => ({
        productId: p.productId,
        barcode: p.marketplaceBarcode ?? '',
        name: p.product?.name ?? '',
        currentPrice: p.salePrice ?? p.price,
        currentStock: 0,
        newPrice: '',
        newStock: '',
      }))
    );
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = items
        .filter((item) => selectedIds.has(item.productId))
        .filter((item) => item.newPrice || item.newStock)
        .map((item) => ({
          product_id: item.productId,
          price: item.newPrice ? Number(item.newPrice) : undefined,
          stock: item.newStock ? Number(item.newStock) : undefined,
        }));

      const { data } = await api.post('/admin/trendyol/products/price-stock', {
        items: payload,
      });
      return data;
    },
    onSuccess: (resp) => {
      toast.success(resp.message);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin', 'trendyol', 'products'] });
    },
    onError: () => toast.error('Güncelleme başarısız.'),
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {selectedIds.size > 0 && (
          <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending}>
            <RefreshCw className="h-4 w-4" />
            Seçilenleri Güncelle ({selectedIds.size})
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-secondary-200 bg-white overflow-x-auto">
        {isLoading ? (
          <div className="p-4 text-secondary-500">Yükleniyor...</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-secondary-500">Ürün bulunamadı.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-secondary-500 bg-secondary-50">
                <th className="p-3 w-10">
                  <input type="checkbox" className="rounded" onChange={() => {
                    if (selectedIds.size === items.length) setSelectedIds(new Set());
                    else setSelectedIds(new Set(items.map((i) => i.productId)));
                  }} />
                </th>
                <th className="p-3">Barkod</th>
                <th className="p-3">Ürün Adı</th>
                <th className="p-3">Mevcut Fiyat</th>
                <th className="p-3">Yeni Fiyat</th>
                <th className="p-3">Yeni Stok</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.productId} className="border-b last:border-0">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.productId)}
                      onChange={() => toggleSelect(item.productId)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3 font-mono text-xs">{item.barcode}</td>
                  <td className="p-3 max-w-[200px] truncate">{item.name}</td>
                  <td className="p-3">{item.currentPrice}</td>
                  <td className="p-3">
                    <input
                      type="number"
                      className="w-24 rounded border border-secondary-300 px-2 py-1 text-sm"
                      value={item.newPrice}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx] = { ...newItems[idx], newPrice: e.target.value };
                        setItems(newItems);
                      }}
                      placeholder="Fiyat"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      className="w-24 rounded border border-secondary-300 px-2 py-1 text-sm"
                      value={item.newStock}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx] = { ...newItems[idx], newStock: e.target.value };
                        setItems(newItems);
                      }}
                      placeholder="Stok"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Ana Sayfa
// ==========================================
export default function TrendyolPage() {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-secondary-900">Trendyol Entegrasyonu</h1>

      <Tabs defaultValue="settings" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="settings">API Ayarlari</TabsTrigger>
          <TabsTrigger value="categories">Kategoriler</TabsTrigger>
          <TabsTrigger value="brands">Markalar</TabsTrigger>
          <TabsTrigger value="products">Ürünler</TabsTrigger>
          <TabsTrigger value="price-stock">Fiyat & Stok</TabsTrigger>
        </TabsList>

        <TabsPanel value="settings">
          <ApiSettingsTab />
        </TabsPanel>
        <TabsPanel value="categories">
          <CategoriesTab />
        </TabsPanel>
        <TabsPanel value="brands">
          <BrandsTab />
        </TabsPanel>
        <TabsPanel value="products">
          <ProductsTab />
        </TabsPanel>
        <TabsPanel value="price-stock">
          <PriceStockTab />
        </TabsPanel>
      </Tabs>
    </div>
  );
}
