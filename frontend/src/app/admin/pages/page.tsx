'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Alert } from '@/components/ui/alert';
import {
  Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { MOCK_ADMIN_PAGES } from '@/lib/mock-admin-data';

interface PageItem {
  id: number;
  title: string;
  slug: string;
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  [key: string]: unknown;
}

const emptyForm = {
  title: '',
  slug: '',
  content: '',
  meta_title: '',
  meta_description: '',
  is_active: true,
};

export default function AdminPagesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PageItem | null>(null);
  const [deleting, setDeleting] = useState<PageItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading, error } = useQuery<PageItem[]>({
    queryKey: ['admin', 'pages'],
    queryFn: async () => {
      const { data } = await api.get('/admin/pages');
      return data.data ?? data;
    },
  });

  const apiPages = data ?? [];
  const mockPages: PageItem[] = MOCK_ADMIN_PAGES.map((p) => ({ ...p }));
  const pages = apiPages.length > 0 ? apiPages : mockPages;

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      if (editing) return api.put(`/admin/pages/${editing.id}`, payload);
      return api.post('/admin/pages', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
      toast.success(editing ? 'Sayfa güncellendi.' : 'Sayfa oluşturuldu.');
      closeDialog();
    },
    onError: () => toast.error('İşlem başarısız oldu.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/pages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
      toast.success('Sayfa silindi.');
      setDeleteDialogOpen(false);
    },
    onError: () => toast.error('Silinemedi.'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: PageItem) => {
    setEditing(p);
    setForm({
      title: p.title,
      slug: p.slug,
      content: p.content,
      meta_title: p.metaTitle || '',
      meta_description: p.metaDescription || '',
      is_active: p.isActive,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const columns: Column<PageItem>[] = [
    { key: 'title', header: 'Başlık', render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'slug', header: 'Slug', render: (r) => <span className="text-sm text-secondary-500">/{r.slug}</span> },
    {
      key: 'isActive', header: 'Durum',
      render: (r) => <Badge variant={r.isActive ? 'success' : 'outline'}>{r.isActive ? 'Aktif' : 'Pasif'}</Badge>,
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

  if (error) return <Alert variant="error">Sayfalar yüklenirken hata oluştu.</Alert>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">Sayfalar</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Yeni Sayfa</Button>
      </div>

      <DataTable columns={columns} data={pages} isLoading={isLoading} emptyMessage="Henüz sayfa yok." keyExtractor={(p) => p.id} />

      <Dialog isOpen={dialogOpen} onClose={closeDialog}>
        <DialogClose onClose={closeDialog} />
        <DialogHeader><DialogTitle>{editing ? 'Sayfa Düzenle' : 'Yeni Sayfa'}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}>
          <DialogContent className="space-y-4">
            <Input label="Başlık" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
            <Input label="Slug" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} hint="Boş bırakılırsa otomatik oluşturulur." />
            <Textarea label="İçerik (HTML)" value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} rows={8} />
            <Input label="Meta Title" value={form.meta_title} onChange={(e) => setForm((p) => ({ ...p, meta_title: e.target.value }))} />
            <Input label="Meta Description" value={form.meta_description} onChange={(e) => setForm((p) => ({ ...p, meta_description: e.target.value }))} />
            <Switch checked={form.is_active} onCheckedChange={(c) => setForm((p) => ({ ...p, is_active: c }))} label="Aktif" />
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeDialog}>İptal</Button>
            <Button type="submit" loading={saveMutation.isPending}>Kaydet</Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogClose onClose={() => setDeleteDialogOpen(false)} />
        <DialogHeader><DialogTitle>Sayfa Sil</DialogTitle></DialogHeader>
        <DialogContent><p className="text-sm text-secondary-600"><strong>{deleting?.title}</strong> sayfasını silmek istediğinize emin misiniz?</p></DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleting && deleteMutation.mutate(deleting.id)}>Sil</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
