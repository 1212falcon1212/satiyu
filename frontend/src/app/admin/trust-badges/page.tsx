'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Alert } from '@/components/ui/alert';
import {
  Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { trustBadgeIconMap, trustBadgeIconOptions } from '@/lib/trust-badge-icons';
import { ShieldCheck } from 'lucide-react';

interface TrustBadgeRow {
  id: number;
  icon: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  [key: string]: unknown;
}

const emptyForm = {
  icon: 'ShieldCheck',
  title: '',
  description: '',
  sort_order: 0,
  is_active: true,
};

export default function TrustBadgesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TrustBadgeRow | null>(null);
  const [deleting, setDeleting] = useState<TrustBadgeRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading, error } = useQuery<TrustBadgeRow[]>({
    queryKey: ['admin', 'trust-badges'],
    queryFn: async () => {
      const { data } = await api.get('/admin/trust-badges');
      return data.data ?? data;
    },
  });

  const badges = data ?? [];

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      if (editing) return api.put(`/admin/trust-badges/${editing.id}`, payload);
      return api.post('/admin/trust-badges', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trust-badges'] });
      toast.success(editing ? 'Rozet güncellendi.' : 'Rozet oluşturuldu.');
      closeDialog();
    },
    onError: () => toast.error('İşlem başarısız oldu.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/trust-badges/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trust-badges'] });
      toast.success('Rozet silindi.');
      setDeleteDialogOpen(false);
    },
    onError: () => toast.error('Silinemedi.'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (b: TrustBadgeRow) => {
    setEditing(b);
    setForm({
      icon: b.icon,
      title: b.title,
      description: b.description || '',
      sort_order: b.sortOrder,
      is_active: b.isActive,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const columns: Column<TrustBadgeRow>[] = [
    {
      key: 'icon',
      header: 'İkon',
      sortable: false,
      render: (r) => {
        const Icon = trustBadgeIconMap[r.icon] || ShieldCheck;
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
            <Icon className="h-5 w-5 text-primary-600" />
          </div>
        );
      },
    },
    {
      key: 'title',
      header: 'Başlık',
      render: (r) => (
        <span className="font-medium text-secondary-900">{r.title}</span>
      ),
    },
    {
      key: 'description',
      header: 'Açıklama',
      render: (r) => (
        <span className="text-sm text-secondary-500 max-w-[250px] truncate block">
          {r.description || '-'}
        </span>
      ),
    },
    { key: 'sortOrder', header: 'Sıra' },
    {
      key: 'isActive',
      header: 'Durum',
      render: (r) => (
        <Badge variant={r.isActive ? 'success' : 'outline'}>
          {r.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'İşlemler',
      sortable: false,
      render: (r) => (
        <div className="flex gap-1">
          <button
            onClick={() => openEdit(r)}
            className="rounded p-1.5 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-700"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setDeleting(r); setDeleteDialogOpen(true); }}
            className="rounded p-1.5 text-secondary-400 hover:bg-red-50 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (error) return <Alert variant="error">Rozetler yüklenirken hata oluştu.</Alert>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Güven Rozetleri</h1>
          <p className="mt-1 text-sm text-secondary-500">
            Ana sayfada görüntülenecek güven rozetlerini yönetin.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Yeni Rozet</Button>
      </div>

      <DataTable
        columns={columns}
        data={badges}
        isLoading={isLoading}
        emptyMessage="Henüz rozet yok."
        keyExtractor={(b) => b.id}
      />

      {/* Create / Edit Dialog */}
      <Dialog isOpen={dialogOpen} onClose={closeDialog} className="max-w-lg">
        <DialogClose onClose={closeDialog} />
        <DialogHeader>
          <DialogTitle>{editing ? 'Rozet Düzenle' : 'Yeni Rozet'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <DialogContent className="space-y-5">
            <Select
              label="İkon"
              options={trustBadgeIconOptions}
              value={form.icon}
              onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
            />

            <Input
              label="Başlık"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
            />

            <Input
              label="Açıklama"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              hint="Rozetin altında görünecek kısa açıklama"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Sıralama"
                type="number"
                value={String(form.sort_order)}
                onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                hint="Küçük sayı = önce görünür"
              />
              <div className="flex items-end pb-1">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(c) => setForm((p) => ({ ...p, is_active: c }))}
                  label="Aktif"
                />
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeDialog}>İptal</Button>
            <Button type="submit" loading={saveMutation.isPending}>Kaydet</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogClose onClose={() => setDeleteDialogOpen(false)} />
        <DialogHeader><DialogTitle>Rozet Sil</DialogTitle></DialogHeader>
        <DialogContent>
          <p className="text-sm text-secondary-600">
            <strong>{deleting?.title || 'Bu rozet'}</strong>&apos;i silmek istediğinize emin misiniz?
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleting && deleteMutation.mutate(deleting.id)}
          >
            Sil
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
