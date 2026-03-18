'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Alert } from '@/components/ui/alert';
import {
  Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { MOCK_ADMIN_VARIANT_TYPES } from '@/lib/mock-admin-data';

interface VariantOption {
  id: number;
  value: string;
  colorCode: string | null;
  sortOrder: number;
}

interface VariantType {
  id: number;
  name: string;
  displayType: string;
  sortOrder: number;
  options?: VariantOption[];
  [key: string]: unknown;
}

const displayTypeOptions = [
  { value: 'button', label: 'Buton' },
  { value: 'color_swatch', label: 'Renk' },
  { value: 'dropdown', label: 'Dropdown' },
];

export default function VariantTypesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VariantType | null>(null);
  const [deleting, setDeleting] = useState<VariantType | null>(null);
  const [form, setForm] = useState({ name: '', display_type: 'button', sort_order: 0 });

  const { data, isLoading, error } = useQuery<VariantType[]>({
    queryKey: ['admin', 'variant-types'],
    queryFn: async () => {
      const { data } = await api.get('/admin/variant-types');
      return data.data ?? data;
    },
  });

  const apiTypes = data ?? [];
  const mockTypes: VariantType[] = MOCK_ADMIN_VARIANT_TYPES.map((t) => ({ id: t.id, name: t.name, displayType: t.displayType, sortOrder: 0, options: Array.from({ length: t.optionsCount }).map((_, i) => ({ id: i + 1, value: `Seçenek ${i + 1}`, colorCode: null, sortOrder: i })) }));
  const types = apiTypes.length > 0 ? apiTypes : mockTypes;

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      if (editing) {
        return api.put(`/admin/variant-types/${editing.id}`, payload);
      }
      return api.post('/admin/variant-types', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'variant-types'] });
      toast.success(editing ? 'Varyant tipi güncellendi.' : 'Varyant tipi oluşturuldu.');
      closeDialog();
    },
    onError: () => toast.error('İşlem başarısız oldu.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/variant-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'variant-types'] });
      toast.success('Varyant tipi silindi.');
      setDeleteDialogOpen(false);
    },
    onError: () => toast.error('Silinemedi.'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', display_type: 'button', sort_order: 0 });
    setDialogOpen(true);
  };

  const openEdit = (t: VariantType) => {
    setEditing(t);
    setForm({ name: t.name, display_type: t.displayType, sort_order: t.sortOrder });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const columns: Column<VariantType>[] = [
    { key: 'name', header: 'Ad', render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: 'displayType', header: 'Gösterim Tipi',
      render: (r) => <Badge variant="info">{r.displayType}</Badge>,
    },
    { key: 'sortOrder', header: 'Sira' },
    {
      key: 'options', header: 'Seçenekler',
      render: (r) => <span className="text-sm text-secondary-500">{r.options?.length ?? 0} adet</span>,
    },
    {
      key: 'actions', header: 'İşlemler', sortable: false,
      render: (r) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(r)} className="rounded p-1.5 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-700"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => { setDeleting(r); setDeleteDialogOpen(true); }} className="rounded p-1.5 text-secondary-400 hover:bg-red-50 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  if (error) return <Alert variant="error">Varyant tipleri yüklenirken hata oluştu.</Alert>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">Varyant Tipleri</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Yeni Tip</Button>
      </div>

      <DataTable columns={columns} data={types} isLoading={isLoading} emptyMessage="Henüz varyant tipi yok." keyExtractor={(t) => t.id} />

      <Dialog isOpen={dialogOpen} onClose={closeDialog}>
        <DialogClose onClose={closeDialog} />
        <DialogHeader><DialogTitle>{editing ? 'Tipi Düzenle' : 'Yeni Varyant Tipi'}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}>
          <DialogContent className="space-y-4">
            <Input label="Ad" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            <Select label="Gösterim Tipi" options={displayTypeOptions} value={form.display_type} onChange={(e) => setForm((p) => ({ ...p, display_type: e.target.value }))} />
            <Input label="Sıralama" type="number" value={String(form.sort_order)} onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))} />
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeDialog}>İptal</Button>
            <Button type="submit" loading={saveMutation.isPending}>Kaydet</Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogClose onClose={() => setDeleteDialogOpen(false)} />
        <DialogHeader><DialogTitle>Tipi Sil</DialogTitle></DialogHeader>
        <DialogContent><p className="text-sm text-secondary-600"><strong>{deleting?.name}</strong> tipini silmek istediğinize emin misiniz?</p></DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleting && deleteMutation.mutate(deleting.id)}>Sil</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
