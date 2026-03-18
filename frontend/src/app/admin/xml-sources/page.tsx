'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Alert } from '@/components/ui/alert';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  History,
  Settings2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface XmlSource {
  id: number;
  name: string;
  url: string;
  type: 'supplier' | 'custom';
  mappingConfig: Record<string, unknown> | null;
  autoSync: boolean;
  syncInterval: string | null;
  lastSyncedAt: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  [key: string]: unknown;
}

interface XmlSourceFormData {
  name: string;
  url: string;
  type: 'supplier' | 'custom';
  auto_sync: boolean;
  sync_interval: string;
  is_active: boolean;
  source_mode: 'url' | 'file';
  file: File | null;
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

interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
  };
}

const defaultForm: XmlSourceFormData = {
  name: '',
  url: '',
  type: 'supplier',
  auto_sync: false,
  sync_interval: 'daily',
  is_active: true,
  source_mode: 'url',
  file: null,
};

export default function XmlSourcesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<XmlSource | null>(null);
  const [deletingSource, setDeletingSource] = useState<XmlSource | null>(null);
  const [logsSourceId, setLogsSourceId] = useState<number | null>(null);
  const [formData, setFormData] = useState<XmlSourceFormData>(defaultForm);
  const [expandedError, setExpandedError] = useState<number | null>(null);
  const [importingSourceId, setImportingSourceId] = useState<number | null>(null);

  // Sources list
  const { data: response, isLoading, error } = useQuery<PaginatedResponse<XmlSource>>({
    queryKey: ['admin', 'xml-sources', page, perPage],
    queryFn: async () => {
      const { data } = await api.get('/admin/xml-sources', {
        params: { page, per_page: perPage },
      });
      return data;
    },
  });

  const sources = response?.data ?? [];
  const total = response?.meta?.total ?? 0;

  // Logs query
  const { data: logsResponse, isLoading: logsLoading } = useQuery<PaginatedResponse<ImportLog>>({
    queryKey: ['admin', 'xml-sources', logsSourceId, 'logs'],
    queryFn: async () => {
      const { data } = await api.get(`/admin/xml-sources/${logsSourceId}/logs`);
      return data;
    },
    enabled: logsSourceId !== null,
  });

  // Save mutation (edit only)
  const saveMutation = useMutation({
    mutationFn: async (payload: XmlSourceFormData) => {
      if (!editingSource) return;
      const { data } = await api.put(`/admin/xml-sources/${editingSource.id}`, {
        name: payload.name,
        url: payload.url,
        type: payload.type,
        auto_sync: payload.auto_sync,
        sync_interval: payload.sync_interval,
        is_active: payload.is_active,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'xml-sources'] });
      toast.success('Kaynak güncellendi.');
      closeDialog();
    },
    onError: () => {
      toast.error('Güncelleme başarısız oldu.');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/xml-sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'xml-sources'] });
      toast.success('Kaynak silindi.');
      setDeleteDialogOpen(false);
      setDeletingSource(null);
    },
    onError: () => {
      toast.error('Kaynak silinemedi.');
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (id: number) => {
      setImportingSourceId(id);
      const { data } = await api.post(`/admin/xml-sources/${id}/import`);
      return { data, id };
    },
    onSuccess: (_result, id) => {
      toast.success('Import işlemi kuyruğa eklendi.');
      router.push(`/admin/xml-sources/${id}?step=4`);
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 409) {
        toast.error('Bu kaynak için zaten aktif bir import işlemi var.');
      } else {
        toast.error('Import başlatılamadı.');
      }
    },
    onSettled: () => setImportingSourceId(null),
  });

  const openCreate = () => {
    router.push('/admin/xml-sources/new');
  };

  const openEdit = (source: XmlSource) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      url: source.url,
      type: source.type,
      auto_sync: source.autoSync,
      sync_interval: source.syncInterval ?? 'daily',
      is_active: source.isActive,
      source_mode: 'url',
      file: null,
    });
    setDialogOpen(true);
  };

  const openDelete = (source: XmlSource) => {
    setDeletingSource(source);
    setDeleteDialogOpen(true);
  };

  const openLogs = (sourceId: number) => {
    setLogsSourceId(sourceId);
    setExpandedError(null);
    setLogsDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingSource(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

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

  const truncateUrl = (url: string, maxLen = 40) => {
    if (url.length <= maxLen) return url;
    return url.slice(0, maxLen) + '...';
  };

  const columns: Column<XmlSource>[] = [
    {
      key: 'name',
      header: 'Kaynak Adı',
      render: (s) => <span className="font-medium text-secondary-900">{s.name}</span>,
    },
    {
      key: 'url',
      header: 'URL',
      render: (s) => (
        <span className="text-xs text-secondary-500" title={s.url}>
          {truncateUrl(s.url)}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Tip',
      render: (s) => (
        <Badge variant={s.type === 'supplier' ? 'info' : 'outline'}>
          {s.type === 'supplier' ? 'Tedarikci' : 'Özel'}
        </Badge>
      ),
    },
    {
      key: 'autoSync',
      header: 'Oto. Senk',
      render: (s) => (
        <Badge variant={s.autoSync ? 'success' : 'outline'}>
          {s.autoSync ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
    {
      key: 'lastSyncedAt',
      header: 'Son Senk.',
      render: (s) => (
        <span className="text-xs text-secondary-500">{formatDate(s.lastSyncedAt)}</span>
      ),
    },
    {
      key: 'productCount',
      header: 'Ürün',
      render: (s) => <span className="font-medium">{s.productCount ?? 0}</span>,
    },
    {
      key: 'isActive',
      header: 'Durum',
      render: (s) => (
        <Badge variant={s.isActive ? 'success' : 'outline'}>
          {s.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'İşlemler',
      sortable: false,
      render: (s) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(s)}
            className="rounded p-1.5 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-700 transition-colors"
            title="Düzenle"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => importMutation.mutate(s.id)}
            className="rounded p-1.5 text-secondary-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            title="Import Başlat"
            disabled={importingSourceId === s.id}
          >
            <RefreshCw className={`h-4 w-4 ${importingSourceId === s.id ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => openLogs(s.id)}
            className="rounded p-1.5 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-700 transition-colors"
            title="Loglar"
          >
            <History className="h-4 w-4" />
          </button>
          <Link
            href={`/admin/xml-sources/${s.id}`}
            className="rounded p-1.5 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-700 transition-colors"
            title="Eşleştirme & Detay"
          >
            <Settings2 className="h-4 w-4" />
          </Link>
          <button
            onClick={() => openDelete(s)}
            className="rounded p-1.5 text-secondary-400 hover:bg-red-50 hover:text-danger transition-colors"
            title="Sil"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <Alert variant="error" title="Hata">
        XML kaynaklari yüklenirken bir hata oluştu.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">XML Kaynakları</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Yeni Kaynak
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={sources}
        isLoading={isLoading}
        emptyMessage="Henüz XML kaynağı bulunmuyor."
        page={page}
        perPage={perPage}
        total={total}
        onPageChange={setPage}
        onPerPageChange={(v) => {
          setPerPage(v);
          setPage(1);
        }}
        keyExtractor={(s) => s.id}
      />

      {/* Edit Dialog */}
      <Dialog isOpen={dialogOpen} onClose={closeDialog}>
        <DialogClose onClose={closeDialog} />
        <DialogHeader>
          <DialogTitle>Kaynağı Düzenle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogContent className="space-y-4">
            <Input
              label="Kaynak Adı"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <Input
              label="XML URL"
              name="url"
              value={formData.url}
              onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))}
              required
              hint="XML dosyasinin tam URL adresi"
            />
            <Select
              label="Tip"
              value={formData.type}
              onChange={(e) =>
                setFormData((p) => ({
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
              checked={formData.auto_sync}
              onCheckedChange={(checked) =>
                setFormData((p) => ({ ...p, auto_sync: checked }))
              }
              label="Otomatik Senkronizasyon"
            />
            {formData.auto_sync && (
              <Select
                label="Senkronizasyon Aralığı"
                value={formData.sync_interval}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, sync_interval: e.target.value }))
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
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData((p) => ({ ...p, is_active: checked }))
              }
              label="Aktif"
            />
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeDialog}>
              İptal
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogClose onClose={() => setDeleteDialogOpen(false)} />
        <DialogHeader>
          <DialogTitle>Kaynağı Sil</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-secondary-600">
            <strong>{deletingSource?.name}</strong> kaynağını silmek istediğinize emin misiniz?
            Bu işlem geri alınamaz ve kaynağa bağlı ürünler etkilenebilir.
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
            İptal
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deletingSource && deleteMutation.mutate(deletingSource.id)}
          >
            {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Import Logs Dialog */}
      <Dialog
        isOpen={logsDialogOpen}
        onClose={() => {
          setLogsDialogOpen(false);
          setLogsSourceId(null);
        }}
      >
        <DialogClose
          onClose={() => {
            setLogsDialogOpen(false);
            setLogsSourceId(null);
          }}
        />
        <DialogHeader>
          <DialogTitle>Import Geçmişi</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {logsLoading ? (
            <p className="text-sm text-secondary-500">Yükleniyor...</p>
          ) : !logsResponse?.data?.length ? (
            <p className="text-sm text-secondary-500">Henüz import geçmişi yok.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-secondary-500">
                    <th className="pb-2 pr-3">Tarih</th>
                    <th className="pb-2 pr-3">Toplam</th>
                    <th className="pb-2 pr-3">Yeni</th>
                    <th className="pb-2 pr-3">Gunc.</th>
                    <th className="pb-2 pr-3">Başarısız</th>
                    <th className="pb-2">Sure</th>
                  </tr>
                </thead>
                <tbody>
                  {logsResponse.data.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr className="border-b last:border-0">
                        <td className="py-2 pr-3 text-xs">{formatDate(log.startedAt)}</td>
                        <td className="py-2 pr-3">{log.totalProducts}</td>
                        <td className="py-2 pr-3 text-green-600">{log.created}</td>
                        <td className="py-2 pr-3 text-blue-600">{log.updated}</td>
                        <td className="py-2 pr-3">
                          {log.failed > 0 ? (
                            <button
                              onClick={() =>
                                setExpandedError(expandedError === log.id ? null : log.id)
                              }
                              className="text-red-600 underline cursor-pointer"
                            >
                              {log.failed}
                            </button>
                          ) : (
                            <span className="text-secondary-400">0</span>
                          )}
                        </td>
                        <td className="py-2 text-xs">{formatDuration(log.duration)}</td>
                      </tr>
                      {expandedError === log.id && log.errorLog?.length > 0 && (
                        <tr>
                          <td colSpan={6}>
                            <div className="mb-2 rounded bg-red-50 p-2 text-xs text-red-700">
                              {log.errorLog.map((err, i) => (
                                <div key={i}>{err}</div>
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
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setLogsDialogOpen(false);
              setLogsSourceId(null);
            }}
          >
            Kapat
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
