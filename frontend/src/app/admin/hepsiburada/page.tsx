'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { MOCK_MARKETPLACE_PRODUCTS } from '@/lib/mock-admin-data';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsPanel } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import {
  RefreshCw,
  Save,
  Send,
  Link2,
  Trash2,
  Search,
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
} from '@/types/api';

// ==========================================
// Tab 1 — API Ayarlari
// ==========================================
function ApiSettingsTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ api_key: '', api_secret: '', user_agent: '' });

  const { data, isLoading } = useQuery<{ data: MarketplaceCredential | null }>({
    queryKey: ['admin', 'marketplace', 'hepsiburada', 'credentials'],
    queryFn: async () => {
      const { data } = await api.get('/admin/marketplace/hepsiburada/credentials');
      return data;
    },
  });

  // Gercek credential — mock data'ya fallback yapma
  const credentials = data?.data ?? null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { ...form };
      if (credentials) {
        // Update: bos birakilan alanlari gonderme
        if (!payload.api_key) delete payload.api_key;
        if (!payload.api_secret) delete payload.api_secret;
        if (!payload.user_agent) delete payload.user_agent;
        await api.put('/admin/marketplace/hepsiburada/credentials', payload);
      } else {
        await api.post('/admin/marketplace/hepsiburada/credentials', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'marketplace', 'hepsiburada'] });
      toast.success('Kimlik bilgileri kaydedildi.');
    },
    onError: () => toast.error('Kaydetme başarısız.'),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/marketplace/hepsiburada/test-connection');
      return data;
    },
    onSuccess: (resp) => {
      if (resp.success) toast.success('Bağlantı başarılı!');
      else toast.error('Bağlantı başarısız.');
    },
    onError: () => toast.error('Bağlantı testi başarısız.'),
  });

  if (isLoading) return <div className="p-4 text-secondary-500">Yükleniyor...</div>;

  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="space-y-4 max-w-lg"
      >
        {credentials && (
          <Alert variant="info" title="Mevcut Kimlik">
            Mağaza ID (API Key): {credentials.apiKey}
          </Alert>
        )}
        <Input
          label="Merchant ID (Mağaza ID)"
          type="password"
          value={form.api_key ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, api_key: e.target.value }))}
          hint={credentials ? 'Boş bırakılırsa değişmez' : 'Entegratör bilgileri → Mağaza ID'}
        />
        <Input
          label="Merchant Key (Servis Anahtarı)"
          type="password"
          value={form.api_secret ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, api_secret: e.target.value }))}
          hint={credentials ? 'Boş bırakılırsa değişmez' : 'Entegratör bilgileri → Servis Anahtarı'}
        />
        <Input
          label="User-Agent"
          value={form.user_agent ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, user_agent: e.target.value }))}
          hint="Hepsiburada entegrasyonu için gerekli olabilir"
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
  );
}

// ==========================================
// Tab 2 — Kategoriler (Trendyol-style)
// ==========================================

// ─── Types ────────────────────────────────────────
interface HBCategoryWithPath {
  id: number;
  categoryName: string;
  marketplaceCategoryId: number;
  path: string;
  isLeaf: boolean;
}

interface AutoMatchSuggestion {
  trendyolCategory: HBCategoryWithPath;
  score: number;
}

interface AutoMatchResult {
  localCategory: { id: number; name: string };
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

// ─── HB Category Picker (search + suggestions, leaf-only) ─────────
function HBCategoryPicker({
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
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // Debounce search query by 300ms
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isFetching } = useQuery<{ data: HBCategoryWithPath[] }>({
    queryKey: ['hb-cat-search-picker', debouncedQuery],
    queryFn: async () => {
      const { data } = await api.get('/admin/hepsiburada/categories/search-picker', {
        params: { search: debouncedQuery },
      });
      return data;
    },
    enabled: debouncedQuery.length >= 2,
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
          placeholder={selectedPath ? '' : 'HB kategorisi ara...'}
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
                Arama Sonuçları (sadece yaprak kategoriler)
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
              Aramak için en az 2 karakter yazın
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** "Elektronik > Bilgisayar > Laptop" şeklinde path'i renkli gösterir */
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
  const [acceptedPaths, setAcceptedPaths] = useState<Map<number, string>>(new Map());

  const { data: mappingsData } = useQuery<{ data: MappingWithPath[] }>({
    queryKey: ['admin', 'hepsiburada', 'category-mappings-with-path'],
    queryFn: async () => {
      const { data } = await api.get('/admin/hepsiburada/category-mappings-with-path');
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
    mutationFn: () => api.post('/admin/hepsiburada/sync-categories'),
    onSuccess: () => {
      toast.success('Kategori senk işlemi başladı.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'hepsiburada', 'categories'] });
    },
    onError: () => toast.error('Senk başlatılamadı.'),
  });

  // Auto-match mutation
  const autoMatchMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get('/admin/hepsiburada/auto-match-categories');
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
      const { data } = await api.post('/admin/hepsiburada/batch-category-mappings', { mappings });
      return data as { message: string; saved_count: number };
    },
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'hepsiburada', 'category-mappings-with-path'] });
      toast.success(resp.message);
      setAutoMatchResults(null);
      setAcceptedMappings(new Map());
    },
    onError: () => toast.error('Toplu kaydetme başarısız.'),
  });

  // Single row save mutation
  const singleSaveMutation = useMutation({
    mutationFn: async ({ localId, marketplaceId }: { localId: number; marketplaceId: number }) => {
      await api.put('/admin/hepsiburada/category-mappings', {
        local_category_id: localId,
        marketplace_category_id: marketplaceId,
      });
      return localId;
    },
    onSuccess: (localId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'hepsiburada', 'category-mappings-with-path'] });
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

  // Build unified rows
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
      {/* Üst butonlar */}
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
        {/* Başlık + İstatistik */}
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
                Tümünü Kabul Et
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
                  <th className="pb-2 pr-3">HB Kategorisi</th>
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
                          <HBCategoryPicker
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
// Tab 3 — Ürünler
// ==========================================
function ProductsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [trackingId, setTrackingId] = useState('');
  const [trackingSearch, setTrackingSearch] = useState('');

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['admin', 'hepsiburada', 'products', search, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/admin/hepsiburada/products', { params });
      return data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      const { data } = await api.post('/admin/hepsiburada/products/send', {
        product_ids: productIds,
      });
      return data;
    },
    onSuccess: (resp) => {
      toast.success(resp.message);
      if (resp.trackingId) setTrackingId(resp.trackingId);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin', 'hepsiburada', 'products'] });
    },
    onError: () => toast.error('Gönderme başarısız.'),
  });

  const trackingQuery = useQuery({
    queryKey: ['admin', 'hepsiburada', 'tracking', trackingSearch],
    queryFn: async () => {
      const { data } = await api.get(`/admin/hepsiburada/products/status/${trackingSearch}`);
      return data;
    },
    enabled: !!trackingSearch,
  });

  const rawProducts: MarketplaceProduct[] = productsData?.data ?? [];
  const products: MarketplaceProduct[] = rawProducts.length > 0 ? rawProducts : (MOCK_MARKETPLACE_PRODUCTS as unknown as MarketplaceProduct[]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === products.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map((p) => p.productId)));
  };

  const statusBadge = (status: string) => {
    const map: Record<string, 'success' | 'danger' | 'info' | 'outline'> = {
      approved: 'success',
      on_sale: 'success',
      MATCHED: 'success',
      rejected: 'danger',
      REJECTED: 'danger',
      pending: 'info',
      WAITING: 'info',
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
          <Button
            onClick={() => sendMutation.mutate(Array.from(selectedIds))}
            loading={sendMutation.isPending}
            size="sm"
          >
            <Send className="h-4 w-4" />
            Seçilenleri Gönder ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Tracking ID sorgulama */}
      <div className="flex items-center gap-2 max-w-lg">
        <Input
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          className="flex-1"
        />
        <Button
          onClick={() => setTrackingSearch(trackingId)}
          variant="outline"
          size="sm"
        >
          <Search className="h-4 w-4" />
          Durum Sorgula
        </Button>
      </div>

      {trackingSearch && trackingQuery.data?.data && (
        <Alert variant="info" title={`Tracking: ${trackingSearch}`}>
          <pre className="text-xs mt-1 whitespace-pre-wrap">
            {JSON.stringify(trackingQuery.data.data, null, 2)}
          </pre>
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
                    {p.lastSyncedAt
                      ? new Date(p.lastSyncedAt).toLocaleDateString('tr-TR')
                      : '-'}
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
// Tab 4 — Fiyat & Stok
// ==========================================
function PriceStockTab() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<
    Array<{
      productId: number;
      barcode: string;
      name: string;
      currentPrice: number;
      newPrice: string;
      newStock: string;
    }>
  >([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['admin', 'hepsiburada', 'products', 'all'],
    queryFn: async () => {
      const { data } = await api.get('/admin/hepsiburada/products', {
        params: { per_page: 100 },
      });
      return data;
    },
  });

  const rawProducts: MarketplaceProduct[] = productsData?.data ?? [];
  const products: MarketplaceProduct[] = rawProducts.length > 0 ? rawProducts : (MOCK_MARKETPLACE_PRODUCTS as unknown as MarketplaceProduct[]);

  if (products.length > 0 && items.length === 0) {
    setItems(
      products.map((p) => ({
        productId: p.productId,
        barcode: p.marketplaceBarcode ?? '',
        name: p.product?.name ?? '',
        currentPrice: p.salePrice ?? p.price,
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

      const { data } = await api.post('/admin/hepsiburada/products/price-stock', {
        items: payload,
      });
      return data;
    },
    onSuccess: (resp) => {
      toast.success(resp.message);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin', 'hepsiburada', 'products'] });
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
                  <input
                    type="checkbox"
                    className="rounded"
                    onChange={() => {
                      if (selectedIds.size === items.length) setSelectedIds(new Set());
                      else setSelectedIds(new Set(items.map((i) => i.productId)));
                    }}
                  />
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
export default function HepsiburadaPage() {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-secondary-900">HepsiBurada Entegrasyonu</h1>

      <Tabs defaultValue="settings" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="settings">API Ayarlari</TabsTrigger>
          <TabsTrigger value="categories">Kategoriler</TabsTrigger>
          <TabsTrigger value="products">Ürünler</TabsTrigger>
          <TabsTrigger value="price-stock">Fiyat & Stok</TabsTrigger>
        </TabsList>

        <TabsPanel value="settings">
          <ApiSettingsTab />
        </TabsPanel>
        <TabsPanel value="categories">
          <CategoriesTab />
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
