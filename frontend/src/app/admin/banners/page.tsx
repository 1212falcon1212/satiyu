'use client';

import { useState } from 'react';
import Image from 'next/image';
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
import { ImageUpload } from '@/components/ui/image-upload';
import {
  Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ImageIcon } from 'lucide-react';
import { MOCK_ADMIN_BANNERS } from '@/lib/mock-admin-data';

interface Banner {
  id: number;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  buttonText: string | null;
  titleColor: string;
  subtitleColor: string;
  buttonColor: string;
  position: string;
  sortOrder: number;
  isActive: boolean;
  [key: string]: unknown;
}

const positionOptions = [
  { value: 'hero', label: 'Ana Sayfa Slider' },
  { value: 'mid', label: 'Orta Üçlü Banner' },
  { value: 'bottom', label: 'Alt Üçlü Banner' },
];

const positionLabels: Record<string, string> = {
  hero: 'Ana Slider',
  mid: 'Orta Üçlü',
  bottom: 'Alt Üçlü',
};

const emptyForm = {
  title: '', subtitle: '', image_url: '', mobile_image_url: '', link_url: '',
  button_text: '', title_color: '#FFFFFF', subtitle_color: '#FFFFFF', button_color: '#FFFFFF',
  position: 'hero', sort_order: 0, is_active: true,
};

function BannerPreview({ url }: { url: string }) {
  if (!url) {
    return (
      <div className="flex h-12 w-20 items-center justify-center rounded-md bg-secondary-100">
        <ImageIcon className="h-5 w-5 text-secondary-300" />
      </div>
    );
  }

  const src = url.startsWith('http')
    ? url
    : `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '')}${url}`;

  return (
    <div className="relative h-12 w-20 overflow-hidden rounded-md bg-secondary-100">
      <Image
        src={src}
        alt="Banner"
        fill
        className="object-cover"
        sizes="80px"
        unoptimized
      />
    </div>
  );
}

export default function BannersPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading, error } = useQuery<Banner[]>({
    queryKey: ['admin', 'banners'],
    queryFn: async () => {
      const { data } = await api.get('/admin/banners');
      return data.data ?? data;
    },
  });

  const apiBanners = data ?? [];
  const mockBanners: Banner[] = MOCK_ADMIN_BANNERS.map((b) => ({ ...b, isActive: true }));
  const banners = apiBanners.length > 0 ? apiBanners : mockBanners;

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      if (editing) return api.put(`/admin/banners/${editing.id}`, payload);
      return api.post('/admin/banners', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      toast.success(editing ? 'Banner güncellendi.' : 'Banner oluşturuldu.');
      closeDialog();
    },
    onError: () => toast.error('İşlem başarısız oldu.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      toast.success('Banner silindi.');
      setDeleteDialogOpen(false);
    },
    onError: () => toast.error('Silinemedi.'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title || '', subtitle: b.subtitle || '', image_url: b.imageUrl, mobile_image_url: b.mobileImageUrl || '',
      link_url: b.linkUrl || '', button_text: b.buttonText || '',
      title_color: b.titleColor || '#FFFFFF', subtitle_color: b.subtitleColor || '#FFFFFF', button_color: b.buttonColor || '#FFFFFF',
      position: b.position, sort_order: b.sortOrder, is_active: b.isActive,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const columns: Column<Banner>[] = [
    {
      key: 'imageUrl',
      header: 'Görsel',
      sortable: false,
      render: (r) => <BannerPreview url={r.imageUrl} />,
    },
    {
      key: 'title',
      header: 'Başlık',
      render: (r) => (
        <div>
          <span className="font-medium text-secondary-900">{r.title || '-'}</span>
          {r.linkUrl && (
            <p className="mt-0.5 truncate text-xs text-secondary-400 max-w-[200px]">{r.linkUrl}</p>
          )}
        </div>
      ),
    },
    {
      key: 'position',
      header: 'Pozisyon',
      render: (r) => (
        <Badge variant="info">{positionLabels[r.position] || r.position}</Badge>
      ),
    },
    { key: 'sortOrder', header: 'Sıra' },
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

  if (error) return <Alert variant="error">Bannerlar yüklenirken hata oluştu.</Alert>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Banner Yönetimi</h1>
          <p className="mt-1 text-sm text-secondary-500">
            Ana sayfa ve site genelindeki bannerlari yönetiniz.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Yeni Banner</Button>
      </div>

      <DataTable columns={columns} data={banners} isLoading={isLoading} emptyMessage="Henüz banner yok." keyExtractor={(b) => b.id} />

      {/* Create / Edit Dialog */}
      <Dialog isOpen={dialogOpen} onClose={closeDialog} className="max-w-2xl">
        <DialogClose onClose={closeDialog} />
        <DialogHeader><DialogTitle>{editing ? 'Banner Düzenle' : 'Yeni Banner'}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DialogContent className="space-y-5">
            <Input
              label="Başlık"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              hint="Banner üzerinde görüntülenecek ana başlık"
            />

            <Input
              label="Alt Başlık"
              value={form.subtitle}
              onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
              hint="Başlık üstünde küçük yazı (örn: Yeni Koleksiyon, Fırsat)"
            />

            <ImageUpload
              label="Banner Görseli"
              value={form.image_url}
              onChange={(url) => setForm((p) => ({ ...p, image_url: url }))}
              folder="banners"
              hint="Önerilen boyut: Sol slider için 1200x600, Sağ yan banner için 600x300"
            />

            <ImageUpload
              label="Mobil Görsel (Opsiyonel)"
              value={form.mobile_image_url}
              onChange={(url) => setForm((p) => ({ ...p, mobile_image_url: url }))}
              folder="banners"
              hint="Mobil cihazlarda gösterilecek görsel. Boş bırakılırsa ana görsel kullanılır."
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Link URL"
                value={form.link_url}
                onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))}
                placeholder="/kategori/kadin-giyim"
                hint="Tıklandığında gidilecek sayfa"
              />
              <Input
                label="Buton Metni"
                value={form.button_text}
                onChange={(e) => setForm((p) => ({ ...p, button_text: e.target.value }))}
                placeholder="Alışverişe Başla"
                hint="Link butonunun yazısı"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-secondary-700">Başlık Rengi</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.title_color || '#FFFFFF'} onChange={(e) => setForm((p) => ({ ...p, title_color: e.target.value }))} className="h-9 w-10 cursor-pointer rounded border border-secondary-300" />
                  <Input value={form.title_color || '#FFFFFF'} onChange={(e) => setForm((p) => ({ ...p, title_color: e.target.value }))} className="flex-1 text-xs" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-secondary-700">Alt Başlık Rengi</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.subtitle_color || '#FFFFFF'} onChange={(e) => setForm((p) => ({ ...p, subtitle_color: e.target.value }))} className="h-9 w-10 cursor-pointer rounded border border-secondary-300" />
                  <Input value={form.subtitle_color || '#FFFFFF'} onChange={(e) => setForm((p) => ({ ...p, subtitle_color: e.target.value }))} className="flex-1 text-xs" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-secondary-700">Buton Rengi</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.button_color || '#FFFFFF'} onChange={(e) => setForm((p) => ({ ...p, button_color: e.target.value }))} className="h-9 w-10 cursor-pointer rounded border border-secondary-300" />
                  <Input value={form.button_color || '#FFFFFF'} onChange={(e) => setForm((p) => ({ ...p, button_color: e.target.value }))} className="flex-1 text-xs" />
                </div>
              </div>
            </div>

            <Select
              label="Pozisyon"
              options={positionOptions}
              value={form.position}
              onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
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
        <DialogHeader><DialogTitle>Banner Sil</DialogTitle></DialogHeader>
        <DialogContent>
          <p className="text-sm text-secondary-600">
            <strong>{deleting?.title || 'Bu banner'}</strong>&apos;i silmek istediğinize emin misiniz?
          </p>
          {deleting?.imageUrl && (
            <div className="mt-3">
              <BannerPreview url={deleting.imageUrl} />
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleting && deleteMutation.mutate(deleting.id)}>Sil</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
