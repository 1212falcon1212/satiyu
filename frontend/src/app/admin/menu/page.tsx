'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical, ChevronRight, ChevronDown, FolderTree, ArrowRight, ArrowLeft } from 'lucide-react';

interface MenuItemData {
  id: number;
  parentId: number | null;
  label: string;
  type: 'category' | 'custom_link';
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  url: string | null;
  openNewTab: boolean;
  sortOrder: number;
  depth: number;
  isActive: boolean;
}

interface CategoryOption {
  id: number;
  name: string;
  slug: string;
  depth: number;
}

const emptyForm = {
  label: '',
  type: 'category' as 'category' | 'custom_link',
  category_id: null as number | null,
  url: '',
  open_new_tab: false,
  is_active: true,
};

export default function MenuPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItemData | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<MenuItemData[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkParentId, setBulkParentId] = useState<string>('');

  const { data, isLoading } = useQuery<MenuItemData[]>({
    queryKey: ['admin', 'menu-items'],
    queryFn: async () => {
      const { data } = await api.get('/admin/menu-items');
      return data.data ?? data;
    },
  });

  const { data: categoriesData } = useQuery<CategoryOption[]>({
    queryKey: ['admin', 'categories-flat'],
    queryFn: async () => {
      const { data } = await api.get('/admin/categories?flat=1');
      const raw = data.data ?? data;
      const flat: CategoryOption[] = [];
      const flatten = (cats: CategoryOption[], depth = 0) => {
        for (const cat of cats) {
          flat.push({ ...cat, depth });
          if ((cat as unknown as { children?: CategoryOption[] }).children) {
            flatten((cat as unknown as { children: CategoryOption[] }).children, depth + 1);
          }
        }
      };
      if (Array.isArray(raw)) flatten(raw);
      return flat;
    },
  });

  const categories = categoriesData ?? [];

  useEffect(() => {
    if (data) setItems(data);
  }, [data]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const body = {
        ...payload,
        category_id: payload.type === 'category' ? payload.category_id : null,
        url: payload.type === 'custom_link' ? payload.url : null,
        open_new_tab: payload.type === 'custom_link' ? payload.open_new_tab : false,
      };
      if (editing) return api.put(`/admin/menu-items/${editing.id}`, body);
      return api.post('/admin/menu-items', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu-items'] });
      toast.success(editing ? 'Güncellendi.' : 'Eklendi.');
      closeDialog();
    },
    onError: () => toast.error('İşlem başarısız.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/menu-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu-items'] });
      toast.success('Silindi.');
    },
    onError: () => toast.error('Silinemedi.'),
  });

  const reorderMutation = useMutation({
    mutationFn: (reorderItems: { id: number; sort_order: number; parent_id: number | null; depth: number }[]) =>
      api.put('/admin/menu-items-reorder', { items: reorderItems }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'menu-items'] }),
    onError: () => toast.error('Sıralama güncellenemedi.'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.put(`/admin/menu-items/${id}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'menu-items'] }),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post('/admin/menu-items-sync-categories'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu-items'] });
      toast.success(res.data.message);
    },
    onError: () => toast.error('Senkronizasyon başarısız.'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItemData) => {
    setEditing(item);
    setForm({
      label: item.label,
      type: item.type,
      category_id: item.categoryId,
      url: item.url || '',
      open_new_tab: item.openNewTab,
      is_active: item.isActive,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  // Indent: make item child of previous sibling
  const indentItem = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    const item = newItems[index];
    const prevItem = newItems[index - 1];

    // Can't indent deeper than prev + 1
    if (item.depth > prevItem.depth) return;

    item.depth += 1;
    item.parentId = prevItem.depth < item.depth ? prevItem.id : prevItem.parentId;

    // Also indent children
    for (let i = index + 1; i < newItems.length; i++) {
      if (newItems[i].depth <= items[index].depth - 1) break;
      newItems[i].depth += 1;
    }

    setItems(newItems);
    saveOrder(newItems);
  };

  // Outdent: move item up one level
  const outdentItem = (index: number) => {
    const newItems = [...items];
    const item = newItems[index];
    if (item.depth === 0) return;

    item.depth -= 1;

    // Find new parent
    let newParentId: number | null = null;
    for (let i = index - 1; i >= 0; i--) {
      if (newItems[i].depth < item.depth) {
        newParentId = newItems[i].id;
        break;
      }
    }
    item.parentId = newParentId;

    // Also outdent children
    for (let i = index + 1; i < newItems.length; i++) {
      if (newItems[i].depth <= items[index].depth) break;
      newItems[i].depth -= 1;
    }

    setItems(newItems);
    saveOrder(newItems);
  };

  // Drag and drop
  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;

    const newItems = [...items];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(targetIndex, 0, moved);

    // Recalculate parent_id based on depth
    for (let i = 0; i < newItems.length; i++) {
      if (newItems[i].depth === 0) {
        newItems[i].parentId = null;
      } else {
        for (let j = i - 1; j >= 0; j--) {
          if (newItems[j].depth < newItems[i].depth) {
            newItems[i].parentId = newItems[j].id;
            break;
          }
        }
      }
    }

    setItems(newItems);
    setDragIndex(null);
    setDragOverIndex(null);
    saveOrder(newItems);
  };

  const saveOrder = (orderedItems: MenuItemData[]) => {
    reorderMutation.mutate(
      orderedItems.map((item, idx) => ({
        id: item.id,
        sort_order: idx,
        parent_id: item.parentId,
        depth: item.depth,
      }))
    );
  };

  // Get all descendant IDs of an item (children, grandchildren, etc.)
  const getDescendantIds = (parentId: number): number[] => {
    const ids: number[] = [];
    const parentIndex = items.findIndex(i => i.id === parentId);
    if (parentIndex === -1) return ids;
    const parentDepth = items[parentIndex].depth;
    for (let i = parentIndex + 1; i < items.length; i++) {
      if (items[i].depth <= parentDepth) break;
      ids.push(items[i].id);
    }
    return ids;
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const descendants = getDescendantIds(id);
      if (next.has(id)) {
        // Deselect: only this item, children stay (manual removal)
        next.delete(id);
      } else {
        // Select: this item + all descendants
        next.add(id);
        descendants.forEach(d => next.add(d));
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  // Bulk move selected items under a parent
  const bulkMoveUnder = (parentId: number | null) => {
    if (selectedIds.size === 0) return;
    const parentItem = parentId ? items.find(i => i.id === parentId) : null;
    const parentDepth = parentItem ? parentItem.depth : -1;

    const newItems = [...items];
    for (const item of newItems) {
      if (selectedIds.has(item.id)) {
        item.parentId = parentId;
        item.depth = parentDepth + 1;
      }
    }
    setItems(newItems);
    saveOrder(newItems);
    setSelectedIds(new Set());
    setBulkParentId('');
    toast.success(`${selectedIds.size} öğe taşındı.`);
  };

  // Bulk indent/outdent
  const bulkIndent = () => {
    const newItems = [...items];
    for (let i = 0; i < newItems.length; i++) {
      if (selectedIds.has(newItems[i].id) && i > 0 && newItems[i].depth <= newItems[i - 1].depth) {
        newItems[i].depth += 1;
        newItems[i].parentId = newItems[i - 1].depth < newItems[i].depth ? newItems[i - 1].id : newItems[i - 1].parentId;
      }
    }
    setItems(newItems);
    saveOrder(newItems);
  };

  const bulkOutdent = () => {
    const newItems = [...items];
    for (const item of newItems) {
      if (selectedIds.has(item.id) && item.depth > 0) {
        item.depth -= 1;
        let newParent: number | null = null;
        const idx = newItems.indexOf(item);
        for (let j = idx - 1; j >= 0; j--) {
          if (newItems[j].depth < item.depth) { newParent = newItems[j].id; break; }
        }
        item.parentId = newParent;
      }
    }
    setItems(newItems);
    saveOrder(newItems);
  };

  // Bulk delete
  const bulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size} öğeyi silmek istediğinize emin misiniz?`)) return;
    Promise.all(Array.from(selectedIds).map(id => api.delete(`/admin/menu-items/${id}`))).then(() => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu-items'] });
      toast.success(`${selectedIds.size} öğe silindi.`);
      setSelectedIds(new Set());
    });
  };

  // Bulk toggle active
  const bulkToggleActive = (active: boolean) => {
    if (selectedIds.size === 0) return;
    Promise.all(Array.from(selectedIds).map(id => api.put(`/admin/menu-items/${id}`, { is_active: active }))).then(() => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu-items'] });
      toast.success(`${selectedIds.size} öğe ${active ? 'aktif' : 'pasif'} yapıldı.`);
      setSelectedIds(new Set());
    });
  };

  const getDisplayUrl = (item: MenuItemData): string => {
    if (item.type === 'category' && item.categorySlug) return `/kategori/${item.categorySlug}`;
    return item.url || '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Menü Yönetimi</h1>
          <p className="mt-1 text-sm text-secondary-500">
            Navbar menüsünü özelleştirin. Sürükle bırak ile sıralayın, ok tuşları ile hiyerarşi oluşturun.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            <FolderTree className="h-4 w-4" />
            {syncMutation.isPending ? 'Ekleniyor...' : 'Kategorilerden Ekle'}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Yeni Öğe Ekle
          </Button>
        </div>
      </div>

      {/* Bulk actions toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
          <span className="text-sm font-medium text-secondary-700">{selectedIds.size} öğe seçili</span>
          <div className="h-4 w-px bg-secondary-300" />
          <div className="flex items-center gap-2">
            <select
              value={bulkParentId}
              onChange={(e) => setBulkParentId(e.target.value)}
              className="h-8 rounded-md border border-secondary-300 px-2 text-xs"
            >
              <option value="">Taşınacak yer seçin...</option>
              <option value="root">Ana Menü (Kök)</option>
              {items.filter(i => !selectedIds.has(i.id)).map(i => (
                <option key={i.id} value={String(i.id)}>{'—'.repeat(i.depth)} {i.label}</option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={() => bulkMoveUnder(bulkParentId === 'root' ? null : bulkParentId ? Number(bulkParentId) : null)} disabled={!bulkParentId}>
              Taşı
            </Button>
          </div>
          <div className="h-4 w-px bg-secondary-300" />
          <Button size="sm" variant="outline" onClick={bulkIndent}>
            <ArrowRight className="h-3.5 w-3.5" /> İçe Al
          </Button>
          <Button size="sm" variant="outline" onClick={bulkOutdent}>
            <ArrowLeft className="h-3.5 w-3.5" /> Dışa Al
          </Button>
          <div className="h-4 w-px bg-secondary-300" />
          <Button size="sm" variant="outline" onClick={() => bulkToggleActive(true)}>Aktif Yap</Button>
          <Button size="sm" variant="outline" onClick={() => bulkToggleActive(false)}>Pasif Yap</Button>
          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={bulkDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Sil
          </Button>
          <div className="ml-auto">
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Seçimi Temizle</Button>
          </div>
        </div>
      )}

      {/* Menu items */}
      <div className="rounded-lg border border-secondary-200 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-secondary-400">Henüz menü öğesi eklenmedi.</p>
            <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
              <FolderTree className="h-4 w-4" />
              Kategorilerden Otomatik Oluştur
            </Button>
          </div>
        ) : (
          <>
          <div className="flex items-center gap-2 border-b border-secondary-200 px-4 py-2 bg-secondary-50">
            <input type="checkbox" checked={items.length > 0 && selectedIds.size === items.length} onChange={selectAll} className="rounded" />
            <span className="text-xs text-secondary-500 font-medium">Tümünü Seç</span>
          </div>
          <ul>
            {items.map((item, index) => (
              <li
                key={item.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                className={`flex items-center gap-2 border-b border-secondary-100 px-4 py-2.5 transition-colors ${
                  dragOverIndex === index ? 'bg-accent/10 border-accent' : ''
                } ${dragIndex === index ? 'opacity-40' : ''} ${!item.isActive ? 'opacity-50' : ''} ${selectedIds.has(item.id) ? 'bg-primary-50/50' : ''}`}
                style={{ paddingLeft: `${16 + item.depth * 32}px` }}
              >
                {/* Checkbox */}
                <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded flex-shrink-0" />

                {/* Drag handle */}
                <GripVertical className="h-4 w-4 text-secondary-300 cursor-grab flex-shrink-0" />

                {/* Depth indicator */}
                {item.depth > 0 && (
                  <span className="text-secondary-300 text-xs">{'└─'}</span>
                )}

                {/* Label & info */}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-secondary-900 text-sm">{item.label}</span>
                  <span className="ml-2 text-xs text-secondary-400">{getDisplayUrl(item)}</span>
                </div>

                {/* Type badge */}
                <Badge variant={item.type === 'category' ? 'default' : 'outline'} className="text-[10px] flex-shrink-0">
                  {item.type === 'category' ? 'Kategori' : 'Link'}
                </Badge>

                {/* Indent/Outdent */}
                <button
                  onClick={() => outdentItem(index)}
                  disabled={item.depth === 0}
                  className="p-1 text-secondary-400 hover:text-secondary-600 disabled:opacity-30"
                  title="Sola kaydır"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => indentItem(index)}
                  disabled={index === 0 || item.depth > items[index - 1].depth}
                  className="p-1 text-secondary-400 hover:text-secondary-600 disabled:opacity-30"
                  title="Sağa kaydır (alt öğe yap)"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                {/* Active toggle */}
                <Switch
                  checked={item.isActive}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: item.id, is_active: checked })}
                  className="scale-75"
                />

                {/* Edit */}
                <button onClick={() => openEdit(item)} className="p-1 text-secondary-400 hover:text-primary-600">
                  <Pencil className="h-3.5 w-3.5" />
                </button>

                {/* Delete */}
                <button onClick={() => deleteMutation.mutate(item.id)} className="p-1 text-secondary-400 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          </>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog isOpen={dialogOpen} onClose={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Menü Öğesi Düzenle' : 'Yeni Menü Öğesi'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              label="Başlık"
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="Menü başlığı"
            />
            <Select
              label="Tür"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as 'category' | 'custom_link' }))}
              options={[
                { label: 'Kategori', value: 'category' },
                { label: 'Özel Link', value: 'custom_link' },
              ]}
            />
            {form.type === 'category' && (
              <Select
                label="Kategori"
                value={form.category_id ? String(form.category_id) : ''}
                onChange={(e) => {
                  const catId = e.target.value ? Number(e.target.value) : null;
                  const cat = categories.find((c) => c.id === catId);
                  setForm((p) => ({
                    ...p,
                    category_id: catId,
                    label: p.label || cat?.name || '',
                  }));
                }}
                options={[
                  { label: 'Kategori seçin...', value: '' },
                  ...categories.map((c) => ({
                    label: `${'—'.repeat(c.depth)} ${c.name}`,
                    value: String(c.id),
                  })),
                ]}
              />
            )}
            {form.type === 'custom_link' && (
              <>
                <Input
                  label="URL"
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://..."
                />
                <Switch
                  checked={form.open_new_tab}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, open_new_tab: checked }))}
                  label="Yeni sekmede aç"
                />
              </>
            )}
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
              label="Aktif"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>İptal</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
