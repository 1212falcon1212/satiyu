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
import { Alert } from '@/components/ui/alert';
import {
  Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, Loader2,
  Image as ImageIcon, LayoutGrid, Type, Star, Megaphone,
  ShoppingBag, Grid3X3, Shield, Mail, FolderOpen,
} from 'lucide-react';
import type { HomepageSectionAdmin, HomepageSectionType } from '@/types/api';

// ─── Section type metadata ──────────────────────────────────
const SECTION_TYPES: { value: HomepageSectionType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'hero_banner', label: 'Hero Banner', icon: ImageIcon, description: 'Ana sayfa slider banner' },
  { value: 'product_grid', label: 'Ürün Grid', icon: ShoppingBag, description: 'Ürün listesi (öne çıkan, kategori, indirimli vb.)' },
  { value: 'category_showcase', label: 'Kategori Vitrin', icon: FolderOpen, description: 'Kategori + alt kategoriler showcase' },
  { value: 'banner_group', label: 'Banner Grup', icon: Grid3X3, description: 'Üçlü veya çoklu banner alanı' },
  { value: 'text_block', label: 'Metin Bloku', icon: Type, description: 'SEO veya bilgilendirme metin alanı' },
  { value: 'advantage_bar', label: 'Avantaj Barı', icon: Star, description: 'Kargo, güvence, destek barı' },
  { value: 'brand_carousel', label: 'Marka Carousel', icon: Megaphone, description: 'Marka logoları carousel' },
  { value: 'trust_badges', label: 'Güven Rozetleri', icon: Shield, description: 'Neden bizi seçmelisiniz bölümü' },
  { value: 'newsletter', label: 'Bülten', icon: Mail, description: 'E-posta abonelik formu' },
  { value: 'featured_categories', label: 'Öne Çıkan Kategoriler', icon: LayoutGrid, description: 'Yuvarlak kategori görselleri' },
];

const typeMap = Object.fromEntries(SECTION_TYPES.map((t) => [t.value, t]));

const PRODUCT_SOURCES = [
  { value: 'featured', label: 'Öne Çıkan (Homepage)' },
  { value: 'new', label: 'Yeni Ürünler' },
  { value: 'discounted', label: 'İndirimli Ürünler' },
  { value: 'bestseller', label: 'Çok Satanlar' },
  { value: 'category', label: 'Kategori Bazlı' },
  { value: 'manual', label: 'Manuel Seçim (ID)' },
];

const BANNER_POSITIONS = [
  { value: 'hero', label: 'Ana Slider' },
  { value: 'mid', label: 'Orta Üçlü' },
];

function getDefaultConfig(type: HomepageSectionType): Record<string, unknown> {
  switch (type) {
    case 'hero_banner':
      return { position: 'hero' };
    case 'product_grid':
      return { source: 'featured', limit: 10, columns: 5, mode: 'grid' };
    case 'category_showcase':
      return { category_id: null };
    case 'banner_group':
      return { position: 'mid', layout: 'triple' };
    case 'text_block':
      return { content: '', expandable: false };
    default:
      return {};
  }
}

export default function HomepageSectionsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HomepageSectionAdmin | null>(null);
  const [deleting, setDeleting] = useState<HomepageSectionAdmin | null>(null);
  const [formType, setFormType] = useState<HomepageSectionType>('product_grid');
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formConfig, setFormConfig] = useState<Record<string, unknown>>({});

  const { data, isLoading, error } = useQuery<HomepageSectionAdmin[]>({
    queryKey: ['admin', 'homepage-sections'],
    queryFn: async () => {
      const { data } = await api.get('/admin/homepage-sections');
      return data.data ?? data;
    },
  });

  const sections = data ?? [];

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (editing) {
        await api.put(`/admin/homepage-sections/${editing.id}`, payload);
      } else {
        await api.post('/admin/homepage-sections', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'homepage-sections'] });
      toast.success(editing ? 'Bölüm güncellendi' : 'Bölüm eklendi');
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Kaydetme hatası'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/homepage-sections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'homepage-sections'] });
      toast.success('Bölüm silindi');
      setDeleteDialogOpen(false);
      setDeleting(null);
    },
    onError: () => toast.error('Silme hatası'),
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: { id: number; sort_order: number }[]) => {
      await api.put('/admin/homepage-sections-reorder', { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'homepage-sections'] });
    },
    onError: () => toast.error('Sıralama hatası'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      await api.put(`/admin/homepage-sections/${id}`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'homepage-sections'] });
    },
    onError: () => toast.error('Güncelleme hatası'),
  });

  function resetForm() {
    setEditing(null);
    setFormType('product_grid');
    setFormTitle('');
    setFormSubtitle('');
    setFormActive(true);
    setFormConfig({});
  }

  function openAdd() {
    resetForm();
    setTypeDialogOpen(true);
  }

  function selectTypeAndOpenForm(type: HomepageSectionType) {
    setFormType(type);
    setFormConfig(getDefaultConfig(type));
    setTypeDialogOpen(false);
    setDialogOpen(true);
  }

  function openEdit(section: HomepageSectionAdmin) {
    setEditing(section);
    setFormType(section.type);
    setFormTitle(section.title ?? '');
    setFormSubtitle(section.subtitle ?? '');
    setFormActive(section.isActive);
    setFormConfig(section.config ?? {});
    setDialogOpen(true);
  }

  function handleSave() {
    saveMutation.mutate({
      type: formType,
      title: formTitle || null,
      subtitle: formSubtitle || null,
      is_active: formActive,
      config: formConfig,
    });
  }

  function moveSection(index: number, direction: 'up' | 'down') {
    const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const items = sorted.map((s, i) => {
      if (i === index) return { id: s.id, sort_order: swapIndex };
      if (i === swapIndex) return { id: s.id, sort_order: index };
      return { id: s.id, sort_order: i };
    });

    reorderMutation.mutate(items);
  }

  function updateConfig(key: string, value: unknown) {
    setFormConfig((prev) => ({ ...prev, [key]: value }));
  }

  const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Ana Sayfa Yönetimi</h1>
          <p className="mt-1 text-sm text-secondary-500">
            Ana sayfa bölümlerini ekleyin, düzenleyin ve sıralayın.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Bölüm Ekle
        </Button>
      </div>

      {error && <Alert variant="error">Bölümler yüklenirken hata oluştu.</Alert>}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-secondary-400" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-secondary-300 bg-secondary-50 p-12 text-center">
          <LayoutGrid className="mx-auto h-10 w-10 text-secondary-300" />
          <p className="mt-3 text-sm text-secondary-500">Henüz bölüm eklenmemiş.</p>
          <Button variant="outline" className="mt-4" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            İlk Bölümü Ekle
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((section, index) => {
            const typeMeta = typeMap[section.type];
            const Icon = typeMeta?.icon ?? LayoutGrid;

            return (
              <div
                key={section.id}
                className="flex items-center gap-3 rounded-lg border border-secondary-200 bg-white px-4 py-3"
              >
                {/* Sort controls */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveSection(index, 'up')}
                    disabled={index === 0}
                    className="rounded p-0.5 text-secondary-400 hover:text-secondary-700 disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(index, 'down')}
                    disabled={index === sorted.length - 1}
                    className="rounded p-0.5 text-secondary-400 hover:text-secondary-700 disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {/* Icon */}
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-100">
                  <Icon className="h-4 w-4 text-secondary-600" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-secondary-900">
                      {section.title || typeMeta?.label || section.type}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {typeMeta?.label || section.type}
                    </Badge>
                  </div>
                  {section.subtitle && (
                    <p className="text-xs text-secondary-500 truncate">{section.subtitle}</p>
                  )}
                </div>

                {/* Active toggle */}
                <Switch
                  checked={section.isActive}
                  onCheckedChange={(checked: boolean) => toggleMutation.mutate({ id: section.id, is_active: checked })}
                />

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(section)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setDeleting(section); setDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Type selection dialog */}
      <Dialog isOpen={typeDialogOpen} onClose={() => setTypeDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Bölüm Türü Seçin</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="grid grid-cols-2 gap-2 py-4">
            {SECTION_TYPES.map((st) => {
              const SIcon = st.icon;
              return (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => selectTypeAndOpenForm(st.value)}
                  className="flex items-start gap-3 rounded-lg border border-secondary-200 p-3 text-left transition-colors hover:bg-secondary-50 hover:border-secondary-300"
                >
                  <SIcon className="mt-0.5 h-5 w-5 text-secondary-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-secondary-900">{st.label}</p>
                    <p className="text-xs text-secondary-500">{st.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Create dialog */}
      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Bölüm Düzenle' : `Yeni ${typeMap[formType]?.label ?? formType}`}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="max-h-[60vh] overflow-y-auto">
          <div className="space-y-4 py-4">
            <Input
              label="Başlık"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Bölüm başlığı (opsiyonel)"
            />
            <Input
              label="Alt Başlık"
              value={formSubtitle}
              onChange={(e) => setFormSubtitle(e.target.value)}
              placeholder="Alt başlık (opsiyonel)"
            />

            <ConfigForm
              type={formType}
              config={formConfig}
              onUpdate={updateConfig}
            />

            <Switch
              checked={formActive}
              onCheckedChange={setFormActive}
              label="Aktif"
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
          <Button onClick={handleSave} loading={saveMutation.isPending}>
            {editing ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Bölümü Sil</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-secondary-600 py-2">
            &quot;{deleting?.title || typeMap[deleting?.type ?? '']?.label}&quot; bölümünü silmek istediğinize emin misiniz?
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button
            variant="danger"
            onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            loading={deleteMutation.isPending}
          >
            Sil
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

// ─── Type-specific config forms ──────────────────────────────
function ConfigForm({
  type,
  config,
  onUpdate,
}: {
  type: HomepageSectionType;
  config: Record<string, unknown>;
  onUpdate: (key: string, value: unknown) => void;
}) {
  switch (type) {
    case 'hero_banner':
      return (
        <Select
          label="Banner Pozisyonu"
          value={(config.position as string) ?? 'hero'}
          onChange={(e) => onUpdate('position', e.target.value)}
          options={BANNER_POSITIONS}
        />
      );

    case 'product_grid':
      return (
        <div className="space-y-3">
          <Select
            label="Ürün Kaynağı"
            value={(config.source as string) ?? 'featured'}
            onChange={(e) => onUpdate('source', e.target.value)}
            options={PRODUCT_SOURCES}
          />
          {config.source === 'category' && (
            <Input
              label="Kategori ID"
              type="number"
              value={String(config.category_id ?? '')}
              onChange={(e) => onUpdate('category_id', e.target.value ? Number(e.target.value) : null)}
            />
          )}
          {config.source === 'manual' && (
            <Input
              label="Ürün ID'leri (virgülle)"
              value={((config.product_ids as number[]) ?? []).join(', ')}
              onChange={(e) => {
                const ids = e.target.value
                  .split(',')
                  .map((s) => parseInt(s.trim(), 10))
                  .filter((n) => !isNaN(n));
                onUpdate('product_ids', ids);
              }}
              placeholder="1, 2, 3"
            />
          )}
          <Input
            label="Limit"
            type="number"
            value={String(config.limit ?? 10)}
            onChange={(e) => onUpdate('limit', Number(e.target.value))}
          />
          <Select
            label="Kolon Sayısı"
            value={String(config.columns ?? 5)}
            onChange={(e) => onUpdate('columns', Number(e.target.value))}
            options={[
              { value: '4', label: '4 Kolon' },
              { value: '5', label: '5 Kolon' },
              { value: '6', label: '6 Kolon' },
            ]}
          />
          <Select
            label="Görünüm"
            value={(config.mode as string) ?? 'grid'}
            onChange={(e) => onUpdate('mode', e.target.value)}
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'carousel', label: 'Carousel' },
            ]}
          />
          <Input
            label="Tümünü Gör Linki"
            value={(config.href as string) ?? ''}
            onChange={(e) => onUpdate('href', e.target.value || null)}
            placeholder="/kategori/..."
          />
        </div>
      );

    case 'category_showcase':
      return (
        <div className="space-y-3">
          <Input
            label="Kategori ID"
            type="number"
            value={String(config.category_id ?? '')}
            onChange={(e) => onUpdate('category_id', e.target.value ? Number(e.target.value) : null)}
          />
          <Input
            label="Banner Görsel URL"
            value={(config.banner_image as string) ?? ''}
            onChange={(e) => onUpdate('banner_image', e.target.value || null)}
            placeholder="/storage/..."
          />
        </div>
      );

    case 'banner_group':
      return (
        <div className="space-y-3">
          <Select
            label="Banner Pozisyonu"
            value={(config.position as string) ?? 'mid'}
            onChange={(e) => onUpdate('position', e.target.value)}
            options={BANNER_POSITIONS}
          />
          <Input
            label="Banner ID'leri (opsiyonel, virgülle)"
            value={((config.banner_ids as number[]) ?? []).join(', ')}
            onChange={(e) => {
              const ids = e.target.value
                .split(',')
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => !isNaN(n));
              onUpdate('banner_ids', ids.length > 0 ? ids : []);
            }}
            placeholder="Boş bırakılırsa pozisyona göre çeker"
          />
          <Select
            label="Layout"
            value={(config.layout as string) ?? 'triple'}
            onChange={(e) => onUpdate('layout', e.target.value)}
            options={[
              { value: 'triple', label: 'Üçlü' },
              { value: 'double', label: 'İkili' },
            ]}
          />
        </div>
      );

    case 'text_block':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">İçerik (HTML)</label>
            <textarea
              value={(config.content as string) ?? ''}
              onChange={(e) => onUpdate('content', e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-secondary-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              placeholder="<p>SEO içerik...</p>"
            />
          </div>
          <Switch
            checked={(config.expandable as boolean) ?? false}
            onCheckedChange={(val: boolean) => onUpdate('expandable', val)}
            label="Genişletilebilir"
          />
        </div>
      );

    case 'advantage_bar':
    case 'brand_carousel':
    case 'trust_badges':
    case 'newsletter':
    case 'featured_categories':
      return (
        <p className="text-xs text-secondary-500">
          Bu bölüm türü için ek konfigürasyon gerekmez. Veriler otomatik çekilir.
        </p>
      );

    default:
      return null;
  }
}
