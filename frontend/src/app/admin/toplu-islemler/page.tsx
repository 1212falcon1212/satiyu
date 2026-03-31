'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface BulkProduct {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  stock_quantity: number;
  brand_name: string | null;
  category_name: string | null;
}

interface PreviewItem {
  id: number;
  name: string;
  before: Record<string, string | null>;
  after: Record<string, string | null>;
}

type TabType = 'barcode' | 'sku' | 'name';

export default function BulkOperationsPage() {
  const [tab, setTab] = useState<TabType>('barcode');
  const [products, setProducts] = useState<BulkProduct[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; total: number; last_page: number }>({ current_page: 1, total: 0, last_page: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Operation state
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<'prefix' | 'suffix'>('suffix');
  const [nameMode, setNameMode] = useState<'prefix' | 'suffix'>('prefix');
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [applying, setApplying] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('per_page', '15');
      if (search) params.set('search', search);
      const { data } = await api.get(`/admin/bulk-products?${params}`);
      setProducts(data.data || []);
      setMeta(data.meta || { current_page: 1, total: 0, last_page: 1 });
    } catch {
      toast.error('Ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setPage(1); }, [search]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const allIds = products.map(p => p.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      allIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const getOperationName = (): string => {
    if (tab === 'barcode') return mode === 'suffix' ? 'barcode_suffix' : 'barcode_prefix';
    if (tab === 'sku') return mode === 'suffix' ? 'sku_suffix' : 'sku_prefix';
    return 'name_modify';
  };

  const getParams = (): Record<string, unknown> => {
    const ids = scope === 'selected' ? Array.from(selectedIds) : undefined;
    if (tab === 'name') return { mode: nameMode, value, product_ids: ids };
    return { [mode]: value, product_ids: ids };
  };

  const handlePreview = async () => {
    if (!value.trim()) { toast.error('Değer girmelisiniz'); return; }
    try {
      const params: Record<string, unknown> = { operation: getOperationName(), params: getParams() };
      const { data } = await api.post('/admin/bulk-products/preview', params);
      setPreview(data.data || []);
    } catch {
      toast.error('Önizleme alınamadı');
    }
  };

  const handleApply = async () => {
    if (!value.trim()) { toast.error('Değer girmelisiniz'); return; }
    setApplying(true);
    try {
      let endpoint = '';
      let body: Record<string, unknown> = {};
      const ids = scope === 'selected' ? Array.from(selectedIds) : undefined;

      if (tab === 'barcode') {
        endpoint = mode === 'suffix' ? '/admin/bulk-products/barcode-suffix' : '/admin/bulk-products/barcode-prefix';
        body = { [mode]: value, product_ids: ids };
      } else if (tab === 'sku') {
        endpoint = mode === 'suffix' ? '/admin/bulk-products/sku-suffix' : '/admin/bulk-products/sku-prefix';
        body = { [mode]: value, product_ids: ids };
      } else {
        endpoint = '/admin/bulk-products/name-modify';
        body = { mode: nameMode, value, product_ids: ids };
      }

      const { data } = await api.post(endpoint, body);
      toast.success(data.message || 'İşlem tamamlandı');
      setPreview([]);
      fetchProducts();
    } catch {
      toast.error('İşlem başarısız');
    } finally {
      setApplying(false);
    }
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'barcode', label: 'Barkod İşlemleri' },
    { key: 'sku', label: 'SKU İşlemleri' },
    { key: 'name', label: 'Ürün Adı İşlemleri' },
  ];

  const fieldLabel = tab === 'barcode' ? 'Barkod' : tab === 'sku' ? 'SKU' : 'Ürün Adı';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary-900">Toplu İşlemler</h1>
        <p className="mt-1 text-sm text-secondary-500">Ürünlerin barkod, SKU ve isimlerini toplu olarak düzenleyin</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-secondary-100 p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPreview([]); setValue(''); }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Operation Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-lg border border-secondary-200 bg-white p-5 space-y-4">
            <h3 className="font-semibold text-secondary-900">{fieldLabel} Düzenleme</h3>

            {/* Mode selector for barcode/sku */}
            {tab !== 'name' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('prefix')}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${mode === 'prefix' ? 'border-accent bg-accent/10 text-accent' : 'border-secondary-200 text-secondary-600 hover:border-secondary-300'}`}
                >
                  Ön Ek Ekle
                </button>
                <button
                  onClick={() => setMode('suffix')}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${mode === 'suffix' ? 'border-accent bg-accent/10 text-accent' : 'border-secondary-200 text-secondary-600 hover:border-secondary-300'}`}
                >
                  Son Ek Ekle
                </button>
              </div>
            )}

            {/* Mode selector for name */}
            {tab === 'name' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setNameMode('prefix')}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${nameMode === 'prefix' ? 'border-accent bg-accent/10 text-accent' : 'border-secondary-200 text-secondary-600 hover:border-secondary-300'}`}
                >
                  Başına Ekle
                </button>
                <button
                  onClick={() => setNameMode('suffix')}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${nameMode === 'suffix' ? 'border-accent bg-accent/10 text-accent' : 'border-secondary-200 text-secondary-600 hover:border-secondary-300'}`}
                >
                  Sonuna Ekle
                </button>
              </div>
            )}

            <Input
              label={tab === 'name' ? 'Eklenecek metin' : `${mode === 'prefix' ? 'Ön ek' : 'Son ek'} değeri`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={tab === 'name' ? 'Örn: Yeni Sezon' : 'Örn: STY'}
            />

            {/* Scope */}
            <div className="flex gap-2">
              <button
                onClick={() => setScope('all')}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${scope === 'all' ? 'border-accent bg-accent/10 text-accent' : 'border-secondary-200 text-secondary-600'}`}
              >
                Tüm Ürünler ({meta.total})
              </button>
              <button
                onClick={() => setScope('selected')}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${scope === 'selected' ? 'border-accent bg-accent/10 text-accent' : 'border-secondary-200 text-secondary-600'}`}
              >
                Seçili ({selectedIds.size})
              </button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handlePreview} disabled={!value.trim()}>
                Önizle
              </Button>
              <Button className="flex-1" onClick={handleApply} disabled={!value.trim() || applying}>
                {applying ? 'Uygulanıyor...' : 'Uygula'}
              </Button>
            </div>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="rounded-lg border border-secondary-200 bg-white p-5">
              <h3 className="font-semibold text-secondary-900 mb-3">Önizleme ({preview.length} ürün)</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {preview.map(p => {
                  const field = Object.keys(p.before)[0];
                  return (
                    <div key={p.id} className="text-sm border-b border-secondary-100 pb-2">
                      <p className="font-medium text-secondary-900 truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-secondary-400 line-through truncate max-w-[45%]">{p.before[field] || '-'}</span>
                        <span className="text-secondary-300">→</span>
                        <span className="text-green-600 font-medium truncate max-w-[45%]">{p.after[field] || '-'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Product List */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-secondary-200 bg-white">
            <div className="flex items-center gap-3 border-b border-secondary-200 p-4">
              <Input
                placeholder="Ürün adı, SKU veya barkod ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              {scope === 'selected' && selectedIds.size > 0 && (
                <Badge variant="default">{selectedIds.size} seçili</Badge>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-secondary-100 bg-secondary-50">
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" onChange={selectAll} checked={products.length > 0 && products.every(p => selectedIds.has(p.id))} className="rounded" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-secondary-600">Ürün</th>
                    <th className="px-4 py-3 text-left font-medium text-secondary-600">SKU</th>
                    <th className="px-4 py-3 text-left font-medium text-secondary-600">Barkod</th>
                    <th className="px-4 py-3 text-left font-medium text-secondary-600">Marka</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-secondary-400">Yükleniyor...</td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-secondary-400">Ürün bulunamadı</td></tr>
                  ) : products.map(p => (
                    <tr key={p.id} className={`border-b border-secondary-50 hover:bg-secondary-50 cursor-pointer ${selectedIds.has(p.id) ? 'bg-accent/5' : ''}`} onClick={() => toggleSelect(p.id)}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-secondary-900 line-clamp-1">{p.name}</span>
                      </td>
                      <td className="px-4 py-3 text-secondary-600 font-mono text-xs">{p.sku || '-'}</td>
                      <td className="px-4 py-3 text-secondary-600 font-mono text-xs">{p.barcode || '-'}</td>
                      <td className="px-4 py-3 text-secondary-500">{p.brand_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-secondary-200 px-4 py-3">
                <span className="text-sm text-secondary-500">Toplam {meta.total} ürün</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Önceki</Button>
                  <span className="flex items-center px-3 text-sm text-secondary-600">{page} / {meta.last_page}</span>
                  <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>Sonraki</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
