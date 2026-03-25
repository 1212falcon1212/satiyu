'use client';

import React, { useState } from 'react';
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
  Send,
  Link2,
  Search,
  Wand2,
  CheckCircle2,
  X,
  Filter,
  Loader2,
  Pencil,
  Settings2,
} from 'lucide-react';
import type {
  MarketplaceCredential,
  MarketplaceProduct,
} from '@/types/api';

// ==========================================
// Tab 1 — API Ayarlari & Teslimat Ayarları
// ==========================================
function ApiSettingsTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ api_key: '' });

  const { data, isLoading } = useQuery<{ data: MarketplaceCredential | null }>({
    queryKey: ['admin', 'marketplace', 'ciceksepeti', 'credentials'],
    queryFn: async () => {
      const { data } = await api.get('/admin/marketplace/ciceksepeti/credentials');
      return data;
    },
  });

  const credentials = data?.data ?? null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { ...form };
      if (credentials) {
        if (!payload.api_key) delete payload.api_key;
        await api.put('/admin/marketplace/ciceksepeti/credentials', payload);
      } else {
        await api.post('/admin/marketplace/ciceksepeti/credentials', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'marketplace', 'ciceksepeti'] });
      toast.success('API bilgileri kaydedildi.');
    },
    onError: () => toast.error('Kaydetme basarisiz.'),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/marketplace/ciceksepeti/test-connection');
      return data;
    },
    onSuccess: (resp) => {
      if (resp.success) toast.success('Baglanti basarili!');
      else toast.error('Baglanti basarisiz.');
    },
    onError: () => toast.error('Baglanti testi basarisiz.'),
  });

  if (isLoading) return <div className="p-4 text-secondary-500">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      {/* API Credentials */}
      <div className="rounded-lg border border-secondary-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-secondary-700 mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary-500" />
          API Bilgileri
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4 max-w-lg"
        >
          {credentials && (
            <Alert variant="info" title="Mevcut API Key">
              API Key: {credentials.apiKey}
            </Alert>
          )}
          <Input
            label="API Key (x-api-key)"
            type="password"
            value={form.api_key ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, api_key: e.target.value }))}
            hint={credentials ? 'Bos birakilirsa degismez' : 'Ciceksepeti panelinden alinir: Hesap Yönetimi > Entegrasyon Bilgilerim'}
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
              {testMutation.isPending ? 'Test ediliyor...' : 'Baglanti Test Et'}
            </Button>
          </div>
        </form>
      </div>

      {/* Teslimat Ayarları */}
      <DeliverySettingsSection />
    </div>
  );
}

function DeliverySettingsSection() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['admin', 'ciceksepeti', 'settings'],
    queryFn: async () => {
      const { data } = await api.get('/admin/ciceksepeti/settings');
      return data;
    },
  });

  const settings = data?.data;

  const [deliveryType, setDeliveryType] = useState('');
  const [deliveryMessageType, setDeliveryMessageType] = useState('');
  const [minStock, setMinStock] = useState('');

  React.useEffect(() => {
    if (settings) {
      setDeliveryType(String(settings.delivery_type || 2));
      setDeliveryMessageType(String(settings.delivery_message_type || 5));
      setMinStock(String(settings.min_stock || 0));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put('/admin/ciceksepeti/settings', {
        delivery_type: Number(deliveryType),
        delivery_message_type: Number(deliveryMessageType),
        min_stock: Number(minStock),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ciceksepeti', 'settings'] });
      toast.success('Teslimat ayarlari kaydedildi.');
    },
    onError: () => toast.error('Kaydetme basarisiz.'),
  });

  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-secondary-700 mb-4 flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-primary-500" />
        Teslimat & Stok Ayarlari
      </h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="space-y-4 max-w-lg"
      >
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Teslimat Tipi</label>
          <select
            className="w-full rounded-md border border-secondary-300 px-3 py-2 text-sm"
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value)}
          >
            <option value="1">Servis Araci Ile Gönderim</option>
            <option value="2">Kargo Ile Gönderim</option>
            <option value="3">Kargo + Servis Araci</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Teslimat Araligi</label>
          <select
            className="w-full rounded-md border border-secondary-300 px-3 py-2 text-sm"
            value={deliveryMessageType}
            onChange={(e) => setDeliveryMessageType(e.target.value)}
          >
            <option value="1">Cicek - Servis</option>
            <option value="4">Hediye Kargo Aynigün</option>
            <option value="5">Hediye Kargo 1-3 Is Günü</option>
            <option value="18">Hediye Kargo 1-2 Is Günü</option>
            <option value="19">Hediye Kargo 1-10 Is Günü</option>
            <option value="6">Hediye Kargo 1-5 Is Günü</option>
            <option value="7">Hediye Kargo 1-7 Is Günü</option>
            <option value="13">Hediye Kargo 3-5 Is Günü</option>
          </select>
        </div>
        <Input
          label="Kritik Stok Esigi"
          type="number"
          value={minStock}
          onChange={(e) => setMinStock(e.target.value)}
          hint="Bu degerden düsük stoklu ürünler gönderilmez (0 = filtre yok)"
        />
        <Button type="submit" loading={saveMutation.isPending}>
          <Save className="h-4 w-4" />
          Ayarlari Kaydet
        </Button>
      </form>
    </div>
  );
}

// ==========================================
// Tab 2 — Kategoriler
// ==========================================

interface CSCategoryWithPath {
  id: number;
  categoryName: string;
  marketplaceCategoryId: number;
  fullPath: string;
}

interface AutoMatchSuggestion {
  localCategoryId: number;
  localCategoryName: string;
  marketplaceCategoryId: number;
  marketplaceCategoryMpId: number;
  marketplaceCategoryName: string;
  score: number;
}

interface MappingWithPath {
  localCategoryId: number;
  localCategoryName: string;
  mappingId: number | null;
  marketplaceCategoryId: number | null;
  marketplaceCategoryMpId: number | null;
  marketplaceCategoryName: string | null;
  marketplaceCategoryPath: string | null;
}

function CSCategoryPicker({
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

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isFetching } = useQuery<{ data: CSCategoryWithPath[] }>({
    queryKey: ['cs-cat-search-picker', debouncedQuery],
    queryFn: async () => {
      const { data } = await api.get('/admin/ciceksepeti/categories/search-picker', {
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
    const fromSearch = searchResults?.data?.find((c) => c.id === value);
    if (fromSearch) return fromSearch.fullPath;
    return null;
  }, [value, displayPath, searchResults]);

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
          placeholder={selectedPath ? '' : 'CS kategorisi ara...'}
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

      {!isOpen && selectedPath && (
        <div className="absolute inset-0 flex items-center px-2 bg-white rounded border border-secondary-200 pointer-events-none overflow-hidden">
          <CategoryPathDisplay path={selectedPath} />
        </div>
      )}

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[400px] max-h-64 overflow-y-auto rounded border border-secondary-200 bg-white shadow-lg">
          {suggestions.length > 0 && !hasSearchResults && (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold text-secondary-400 uppercase tracking-wide bg-secondary-50 sticky top-0">
                Öneriler
              </div>
              {suggestions.map((s) => (
                <button
                  key={s.marketplaceCategoryId}
                  className={`w-full text-left px-2 py-2 hover:bg-primary-50 flex items-center justify-between gap-2 border-b border-secondary-50 ${
                    value === s.marketplaceCategoryId ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => {
                    onChange(s.marketplaceCategoryId, s.marketplaceCategoryName);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <span className="text-xs text-secondary-700">{s.marketplaceCategoryName}</span>
                  <Badge variant={s.score >= 80 ? 'success' : s.score >= 50 ? 'warning' : 'danger'} className="shrink-0">
                    %{Math.round(s.score)}
                  </Badge>
                </button>
              ))}
            </>
          )}

          {hasSearchResults && (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold text-secondary-400 uppercase tracking-wide bg-secondary-50 sticky top-0">
                Arama Sonuclari
              </div>
              {searchResults.data.map((cat) => (
                <button
                  key={cat.id}
                  className={`w-full text-left px-2 py-2 hover:bg-primary-50 border-b border-secondary-50 ${
                    value === cat.id ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => {
                    onChange(cat.id, cat.fullPath);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <CategoryPathDisplay path={cat.fullPath} />
                </button>
              ))}
            </>
          )}

          {searchQuery.length >= 2 && !isFetching && !searchResults?.data?.length && (
            <div className="px-2 py-3 text-sm text-secondary-400 text-center">Sonuc bulunamadi</div>
          )}

          {searchQuery.length < 2 && suggestions.length === 0 && (
            <div className="px-2 py-3 text-sm text-secondary-400 text-center">
              Aramak icin en az 2 karakter yazin
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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

  const [autoMatchResults, setAutoMatchResults] = useState<AutoMatchSuggestion[] | null>(null);
  const [acceptedMappings, setAcceptedMappings] = useState<Map<number, number>>(new Map());
  const [matchFilter, setMatchFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [acceptedPaths, setAcceptedPaths] = useState<Map<number, string>>(new Map());

  const { data: mappingsData } = useQuery<{ data: MappingWithPath[] }>({
    queryKey: ['admin', 'ciceksepeti', 'category-mappings-with-path'],
    queryFn: async () => {
      const { data } = await api.get('/admin/ciceksepeti/category-mappings-with-path');
      return data;
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post('/admin/ciceksepeti/sync-categories'),
    onSuccess: () => {
      toast.success('Kategori senk islemi basladi.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'ciceksepeti'] });
    },
    onError: () => toast.error('Senk baslatilamadi.'),
  });

  const autoMatchMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get('/admin/ciceksepeti/auto-match-categories');
      return data as { data: AutoMatchSuggestion[] };
    },
    onSuccess: (resp) => {
      setAutoMatchResults(resp.data);
      const initial = new Map<number, number>();
      const initialPaths = new Map<number, string>();
      resp.data.forEach((r) => {
        if (r.score >= 50) {
          initial.set(r.localCategoryId, r.marketplaceCategoryId);
          initialPaths.set(r.localCategoryId, r.marketplaceCategoryName);
        }
      });
      setAcceptedMappings(initial);
      setAcceptedPaths(initialPaths);
      toast.success(`${resp.data.length} kategori icin öneri hesaplandi.`);
    },
    onError: () => toast.error('Otomatik eslestirme basarisiz.'),
  });

  const batchSaveMutation = useMutation({
    mutationFn: async (mappings: Array<{ local_category_id: number; marketplace_category_id: number }>) => {
      const { data } = await api.post('/admin/ciceksepeti/batch-category-mappings', { mappings });
      return data as { message: string };
    },
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ciceksepeti', 'category-mappings-with-path'] });
      toast.success(resp.message);
      setAutoMatchResults(null);
      setAcceptedMappings(new Map());
    },
    onError: () => toast.error('Toplu kaydetme basarisiz.'),
  });

  const singleSaveMutation = useMutation({
    mutationFn: async ({ localId, marketplaceId }: { localId: number; marketplaceId: number }) => {
      await api.put('/admin/ciceksepeti/category-mappings', {
        local_category_id: localId,
        marketplace_category_id: marketplaceId,
      });
      return localId;
    },
    onSuccess: (localId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ciceksepeti', 'category-mappings-with-path'] });
      toast.success('Eslestirme kaydedildi.');
      setAutoMatchResults((prev) => prev?.filter((r) => r.localCategoryId !== localId) ?? null);
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
      toast.error('Kaydetme basarisiz.');
      setSavingRowId(null);
    },
  });

  const rows = mappingsData?.data ?? [];

  const filteredRows = React.useMemo(() => {
    let filtered = rows;

    if (matchFilter === 'matched') filtered = filtered.filter((r) => r.mappingId);
    if (matchFilter === 'unmatched') filtered = filtered.filter((r) => !r.mappingId);

    if (localSearch.trim().length >= 2) {
      const term = localSearch.toLocaleLowerCase('tr').trim();
      filtered = filtered.filter((r) => r.localCategoryName.toLocaleLowerCase('tr').includes(term));
    }

    return filtered;
  }, [rows, matchFilter, localSearch]);

  const matchedCount = rows.filter((r) => r.mappingId).length;
  const unmatchedCount = rows.filter((r) => !r.mappingId).length;

  const handleBatchSave = () => {
    const mappings = Array.from(acceptedMappings.entries()).map(([localId, marketplaceId]) => ({
      local_category_id: localId,
      marketplace_category_id: marketplaceId,
    }));
    if (mappings.length === 0) {
      toast.error('Kaydedilecek eslestirme yok.');
      return;
    }
    batchSaveMutation.mutate(mappings);
  };

  const handleAcceptAll = () => {
    if (!autoMatchResults) return;
    const newMappings = new Map<number, number>();
    const newPaths = new Map<number, string>();
    autoMatchResults.forEach((r) => {
      if (r.score >= 50) {
        newMappings.set(r.localCategoryId, r.marketplaceCategoryId);
        newPaths.set(r.localCategoryId, r.marketplaceCategoryName);
      }
    });
    setAcceptedMappings(newMappings);
    setAcceptedPaths(newPaths);
    toast.success(`${newMappings.size} eslestirme secildi.`);
  };

  const getSuggestionsForLocal = (localCategoryId: number) => {
    if (!autoMatchResults) return [];
    return autoMatchResults.filter((r) => r.localCategoryId === localCategoryId);
  };

  return (
    <div className="space-y-4">
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
          Otomatik Esle
        </Button>
      </div>

      <div className="rounded-lg border border-secondary-200 bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-secondary-700 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary-500" />
            Kategori Eslestirmeleri
            <Badge variant="success">{matchedCount} eslestirilmis</Badge>
            <Badge variant="warning">{unmatchedCount} bekliyor</Badge>
          </h3>
        </div>

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
                  {f === 'all' ? `Tümü (${rows.length})` : f === 'matched' ? `Eslesen (${matchedCount})` : `Bekleyen (${unmatchedCount})`}
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
                Secilenleri Kaydet ({acceptedMappings.size})
              </Button>
            </div>
          )}
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {filteredRows.length === 0 ? (
            <p className="text-sm text-secondary-500 text-center py-8">
              {localSearch ? 'Aramayla eslesen kategori yok.' : 'Gösterilecek kategori yok.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b text-left text-secondary-500">
                  <th className="pb-2 pr-3 w-1/4">Yerel Kategori</th>
                  <th className="pb-2 pr-3">Ciceksepeti Kategorisi</th>
                  <th className="pb-2 pr-3 w-16 text-center">Durum</th>
                  <th className="pb-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const isSavingRow = savingRowId === row.localCategoryId;
                  const isEditing = editingRowId === row.localCategoryId;
                  const pendingMappingId = acceptedMappings.get(row.localCategoryId);
                  const isMatchedIdle = !!row.mappingId && !isEditing;

                  return (
                    <tr
                      key={row.localCategoryId}
                      className={`border-b last:border-0 transition-colors ${
                        isMatchedIdle
                          ? 'bg-green-50/40'
                          : pendingMappingId
                            ? 'bg-amber-50/40'
                            : 'hover:bg-secondary-50/50'
                      }`}
                    >
                      <td className="py-2.5 pr-3 font-medium text-secondary-700">
                        {row.localCategoryName}
                      </td>
                      <td className="py-2.5 pr-3">
                        {isMatchedIdle ? (
                          <CategoryPathDisplay path={row.marketplaceCategoryPath ?? row.marketplaceCategoryName ?? '-'} />
                        ) : (
                          <CSCategoryPicker
                            suggestions={getSuggestionsForLocal(row.localCategoryId)}
                            value={pendingMappingId ?? (isEditing ? row.marketplaceCategoryId ?? undefined : undefined)}
                            displayPath={
                              pendingMappingId
                                ? acceptedPaths.get(row.localCategoryId)
                                : isEditing
                                  ? row.marketplaceCategoryPath ?? undefined
                                  : undefined
                            }
                            onChange={(id, path) => {
                              setAcceptedMappings((prev) => {
                                const next = new Map(prev);
                                if (id) next.set(row.localCategoryId, id);
                                else next.delete(row.localCategoryId);
                                return next;
                              });
                              setAcceptedPaths((prev) => {
                                const next = new Map(prev);
                                if (id && path) next.set(row.localCategoryId, path);
                                else next.delete(row.localCategoryId);
                                return next;
                              });
                            }}
                          />
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        {isMatchedIdle ? (
                          <Badge variant="success">Eslestirildi</Badge>
                        ) : pendingMappingId ? (
                          <Badge variant="warning">Secildi</Badge>
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
                              onClick={() => setEditingRowId(row.localCategoryId)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          ) : isEditing && !pendingMappingId ? (
                            <button
                              className="text-secondary-400 hover:text-secondary-600 p-1"
                              title="Vazgec"
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
                                  setSavingRowId(row.localCategoryId);
                                  singleSaveMutation.mutate({
                                    localId: row.localCategoryId,
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
                                  title="Vazgec"
                                  onClick={() => {
                                    setEditingRowId(null);
                                    setAcceptedMappings((prev) => {
                                      const next = new Map(prev);
                                      next.delete(row.localCategoryId);
                                      return next;
                                    });
                                    setAcceptedPaths((prev) => {
                                      const next = new Map(prev);
                                      next.delete(row.localCategoryId);
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
// Tab 3 — Ürünler (Marketplace Products)
// ==========================================
function ProductsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchId, setBatchId] = useState('');
  const [batchSearch, setBatchSearch] = useState('');

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['admin', 'ciceksepeti', 'products', search, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/admin/ciceksepeti/products', { params });
      return data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      const { data } = await api.post('/admin/ciceksepeti/products/send', {
        product_ids: productIds,
      });
      return data;
    },
    onSuccess: (resp) => {
      toast.success(resp.message);
      if (resp.batchId) setBatchId(resp.batchId);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin', 'ciceksepeti', 'products'] });
    },
    onError: () => toast.error('Gönderme basarisiz.'),
  });

  const batchQuery = useQuery({
    queryKey: ['admin', 'ciceksepeti', 'batch', batchSearch],
    queryFn: async () => {
      const { data } = await api.get(`/admin/ciceksepeti/batch/${batchSearch}`);
      return data;
    },
    enabled: !!batchSearch,
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
    if (selectedIds.size === products.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map((p) => p.productId)));
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
          placeholder="Ürün ara..."
          className="max-w-xs"
        />
        <select
          className="rounded-md border border-secondary-300 px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tüm Durumlar</option>
          <option value="pending">Bekliyor</option>
          <option value="approved">Onayli</option>
          <option value="rejected">Reddedildi</option>
          <option value="on_sale">Satista</option>
        </select>
        {selectedIds.size > 0 && (
          <Button
            onClick={() => sendMutation.mutate(Array.from(selectedIds))}
            loading={sendMutation.isPending}
            size="sm"
          >
            <Send className="h-4 w-4" />
            Secilenleri Gönder ({selectedIds.size})
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 max-w-lg">
        <Input
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          placeholder="Batch ID ile durum sorgula..."
          className="flex-1"
        />
        <Button
          onClick={() => setBatchSearch(batchId)}
          variant="outline"
          size="sm"
        >
          <Search className="h-4 w-4" />
          Sorgula
        </Button>
      </div>

      {batchSearch && batchQuery.data?.data && (
        <Alert variant="info" title={`Batch: ${batchSearch}`}>
          <pre className="text-xs mt-1 whitespace-pre-wrap">
            {JSON.stringify(batchQuery.data.data, null, 2)}
          </pre>
        </Alert>
      )}

      <div className="rounded-lg border border-secondary-200 bg-white overflow-x-auto">
        {isLoading ? (
          <div className="p-4 text-secondary-500">Yükleniyor...</div>
        ) : products.length === 0 ? (
          <div className="p-4 text-secondary-500">Ürün bulunamadi.</div>
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
                <th className="p-3">Ürün Adi</th>
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
    queryKey: ['admin', 'ciceksepeti', 'products', 'all'],
    queryFn: async () => {
      const { data } = await api.get('/admin/ciceksepeti/products', {
        params: { per_page: 100 },
      });
      return data;
    },
  });

  const products: MarketplaceProduct[] = productsData?.data ?? [];

  React.useEffect(() => {
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
  }, [products, items.length]);

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

      const { data } = await api.post('/admin/ciceksepeti/products/price-stock', {
        items: payload,
      });
      return data;
    },
    onSuccess: (resp) => {
      toast.success(resp.message);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin', 'ciceksepeti', 'products'] });
    },
    onError: () => toast.error('Güncelleme basarisiz.'),
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
            Secilenleri Güncelle ({selectedIds.size})
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-secondary-200 bg-white overflow-x-auto">
        {isLoading ? (
          <div className="p-4 text-secondary-500">Yükleniyor...</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-secondary-500">Ürün bulunamadi.</div>
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
                <th className="p-3">Ürün Adi</th>
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
export default function CiceksepetiPage() {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-secondary-900">Ciceksepeti Entegrasyonu</h1>

      <Tabs defaultValue="settings" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="settings">API & Ayarlar</TabsTrigger>
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
