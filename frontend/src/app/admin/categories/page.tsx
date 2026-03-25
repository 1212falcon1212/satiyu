'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/ui/image-upload';
import { Tabs, TabsList, TabsTrigger, TabsPanel } from '@/components/ui/tabs';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  FolderTree,
  Search,
  ChevronsUpDown,
  GripVertical,
  ImageIcon,
  Eye,
  EyeOff,
  Package,
  Layers,
  Star,
  Merge,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductPicker } from '@/components/admin/product-picker';

// ─── Types (camelCase — matches API response) ───────────────────
interface Category {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  bannerImageUrl: string | null;
  depth: number;
  path: string | null;
  isActive: boolean;
  isFeatured: boolean;
  homepageProductIds: number[];
  showcaseTitle: string | null;
  sortOrder: number;
  metaTitle: string | null;
  metaDescription: string | null;
  productCount: number;
  children?: Category[];
}

interface CategoryFormData {
  name: string;
  slug: string;
  parent_id: number | null;
  description: string;
  icon: string;
  image_url: string;
  banner_image_url: string;
  is_active: boolean;
  is_featured: boolean;
  homepage_product_ids: number[];
  showcase_title: string;
  sort_order: number;
  meta_title: string;
  meta_description: string;
}

const EMPTY_FORM: CategoryFormData = {
  name: '',
  slug: '',
  parent_id: null,
  description: '',
  icon: '',
  image_url: '',
  banner_image_url: '',
  is_active: true,
  is_featured: false,
  homepage_product_ids: [],
  showcase_title: '',
  sort_order: 0,
  meta_title: '',
  meta_description: '',
};

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api$/, '');

function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

// ─── Tree helpers ───────────────────────────────────────────────
function flattenForSelect(
  categories: Category[],
  level = 0,
  excludeId?: number
): Array<{ value: number; label: string }> {
  const result: Array<{ value: number; label: string }> = [];
  categories.forEach((cat) => {
    if (cat.id === excludeId) return;
    result.push({
      value: cat.id,
      label: `${'—'.repeat(level)} ${cat.name}`.trim(),
    });
    if (cat.children?.length) {
      result.push(...flattenForSelect(cat.children, level + 1, excludeId));
    }
  });
  return result;
}

function getAllIds(categories: Category[]): number[] {
  const ids: number[] = [];
  categories.forEach((cat) => {
    if (cat.children?.length) {
      ids.push(cat.id);
      ids.push(...getAllIds(cat.children));
    }
  });
  return ids;
}

function filterTree(categories: Category[], query: string): Category[] {
  if (!query.trim()) return categories;
  const q = query.toLowerCase();
  return categories.reduce<Category[]>((acc, cat) => {
    const childMatches = cat.children?.length
      ? filterTree(cat.children, query)
      : [];
    if (cat.name.toLowerCase().includes(q) || childMatches.length > 0) {
      acc.push({
        ...cat,
        children: childMatches.length > 0 ? childMatches : cat.children,
      });
    }
    return acc;
  }, []);
}

function countTotal(categories: Category[]): number {
  let count = 0;
  categories.forEach((cat) => {
    count++;
    if (cat.children?.length) count += countTotal(cat.children);
  });
  return count;
}

function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = [];
  categories.forEach((cat) => {
    result.push(cat);
    if (cat.children?.length) result.push(...flattenCategories(cat.children));
  });
  return result;
}

// ─── CategoryTreeNode ───────────────────────────────────────────
function CategoryTreeNode({
  category,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onToggleFeatured,
  level = 0,
}: {
  category: Category;
  expanded: Record<number, boolean>;
  onToggle: (id: number) => void;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  onToggleFeatured: (cat: Category) => void;
  level?: number;
}) {
  const hasChildren = (category.children?.length ?? 0) > 0;
  const isExpanded = expanded[category.id];
  const imgSrc = resolveImageUrl(category.imageUrl);

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-all',
          'hover:border-secondary-200 hover:bg-secondary-50/80',
          level > 0 && 'ml-7 border-l-2 border-l-secondary-100'
        )}
      >
        {/* Drag handle hint */}
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-secondary-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />

        {/* Expand/collapse */}
        <button
          onClick={() => hasChildren && onToggle(category.id)}
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors',
            hasChildren
              ? 'text-secondary-500 hover:bg-secondary-200 hover:text-secondary-700'
              : 'invisible'
          )}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Thumbnail */}
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-secondary-200 bg-secondary-50">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={category.name}
              fill
              className="object-cover"
              sizes="36px"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <FolderTree className="h-4 w-4 text-secondary-300" />
            </div>
          )}
        </div>

        {/* Name + slug */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-secondary-800">
              {category.name}
            </span>
            {category.isFeatured && (
              <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
            )}
          </div>
          <span className="truncate text-xs text-secondary-400">
            /{category.slug}
          </span>
        </div>

        {/* Child count */}
        {hasChildren && (
          <span className="hidden text-xs text-secondary-400 sm:flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {category.children!.length}
          </span>
        )}

        {/* Product count */}
        <div className="flex items-center gap-1 text-xs text-secondary-400">
          <Package className="h-3 w-3" />
          {category.productCount}
        </div>

        {/* Status badge */}
        {category.isActive ? (
          <Badge variant="success" className="text-[10px] px-1.5 py-0">
            Aktif
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            Pasif
          </Badge>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onToggleFeatured(category)}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              category.isFeatured
                ? 'text-amber-400 hover:bg-amber-50 hover:text-amber-500'
                : 'text-secondary-300 hover:bg-amber-50 hover:text-amber-400'
            )}
            title={category.isFeatured ? 'Ana sayfadan kaldır' : 'Ana sayfada göster'}
          >
            <Star className={cn('h-3.5 w-3.5', category.isFeatured && 'fill-current')} />
          </button>
          <button
            onClick={() => onEdit(category)}
            className="rounded-md p-1.5 text-secondary-400 transition-colors hover:bg-secondary-200 hover:text-secondary-700"
            title="Düzenle"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(category)}
            className="rounded-md p-1.5 text-secondary-400 transition-colors hover:bg-red-50 hover:text-danger"
            title="Sil"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-0.5 space-y-0.5">
          {category.children!.map((child) => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              expanded={expanded}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleFeatured={onToggleFeatured}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Homepage Sections Preview ──────────────────────────────────
function HomepageSectionsPreview({
  categories,
  onRemoveBanner,
  onEditShowcase,
}: {
  categories: Category[];
  onRemoveBanner: (cat: Category) => void;
  onEditShowcase: (cat: Category) => void;
}) {
  const bannerCats = categories.filter((c) => c.isFeatured);
  const showcaseCats = categories.filter(
    (c) => (c.homepageProductIds?.length ?? 0) > 0
  );

  return (
    <div className="space-y-5">
      {/* ── Banner Daireleri ──────────────────────────────── */}
      <div>
        <div className="mb-2.5 flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-amber-100">
            <Star className="h-3 w-3 text-amber-600" />
          </div>
          <span className="text-xs font-semibold text-secondary-700">
            Kategori Banner&apos;ları
          </span>
          <Badge variant="outline" className="text-[10px]">
            {bannerCats.length}
          </Badge>
          <span className="text-[10px] text-secondary-400">
            — Ana sayfadaki yuvarlak görseller
          </span>
        </div>
        {bannerCats.length === 0 ? (
          <div className="rounded-lg border border-dashed border-secondary-200 bg-secondary-50 py-4 text-center">
            <p className="text-xs text-secondary-400">
              Ağaçtaki{' '}
              <Star className="inline h-3 w-3 text-amber-400 fill-amber-400" />{' '}
              ile kategori seçin
            </p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-1">
            {bannerCats.map((cat) => {
              const imgSrc = resolveImageUrl(cat.imageUrl);
              return (
                <div key={cat.id} className="group flex flex-col items-center gap-1.5 shrink-0">
                  <div className="relative h-16 w-16 overflow-hidden rounded-full bg-secondary-100 border-2 border-secondary-200">
                    {imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt={cat.name}
                        fill
                        className="object-contain scale-[0.85]"
                        sizes="64px"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-secondary-300" />
                      </div>
                    )}
                    <button
                      onClick={() => onRemoveBanner(cat)}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Kaldır"
                    >
                      <EyeOff className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                  <span className="text-[10px] font-medium text-secondary-600 max-w-[72px] truncate text-center">
                    {cat.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Vitrin Ürün Kategorileri ──────────────────────── */}
      <div>
        <div className="mb-2.5 flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-100">
            <Package className="h-3 w-3 text-blue-600" />
          </div>
          <span className="text-xs font-semibold text-secondary-700">
            Vitrin Ürünleri
          </span>
          <Badge variant="outline" className="text-[10px]">
            {showcaseCats.length}
          </Badge>
          <span className="text-[10px] text-secondary-400">
            — Ana sayfada ürünleri listelenen kategoriler
          </span>
        </div>
        {showcaseCats.length === 0 ? (
          <div className="rounded-lg border border-dashed border-secondary-200 bg-secondary-50 py-4 text-center">
            <p className="text-xs text-secondary-400">
              Kategori düzenle → Vitrin sekmesinden ürün seçin
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {showcaseCats.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onEditShowcase(cat)}
                className="flex items-center gap-2 rounded-lg border border-secondary-200 bg-white px-3 py-1.5 transition-colors hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
              >
                <Package className="h-3 w-3 text-blue-500" />
                <span className="text-xs font-medium text-secondary-700">
                  {cat.showcaseTitle || cat.name}
                </span>
                <Badge variant="info" className="text-[10px] px-1.5 py-0">
                  {cat.homepageProductIds.length} ürün
                </Badge>
                <Pencil className="h-2.5 w-2.5 text-secondary-300" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({ ...EMPTY_FORM });
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [defaultTab, setDefaultTab] = useState('general');
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState<number | ''>('');
  const [mergeTarget, setMergeTarget] = useState<number | ''>('');

  // ── Data fetching ────────────────────────────────────────────
  const {
    data: tree,
    isLoading,
    error,
  } = useQuery<Category[]>({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const { data } = await api.get('/admin/categories');
      return data.data ?? data;
    },
  });

  const categories = tree ?? [];

  const saveMutation = useMutation({
    mutationFn: async (raw: CategoryFormData) => {
      // Strip empty strings so nullable fields aren't sent as ""
      const payload: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(raw)) {
        if (val === '' || val === null) continue;
        payload[key] = val;
      }
      // Always include booleans and array even if falsy
      payload.is_active = raw.is_active;
      payload.is_featured = raw.is_featured;
      payload.homepage_product_ids = raw.homepage_product_ids;
      payload.sort_order = raw.sort_order;

      if (editingCategory) {
        const { data } = await api.put(
          `/admin/categories/${editingCategory.id}`,
          payload
        );
        return data;
      }
      const { data } = await api.post('/admin/categories', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      toast.success(
        editingCategory ? 'Kategori güncellendi.' : 'Kategori oluşturuldu.'
      );
      closeDialog();
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msg = axiosErr?.response?.data?.message;
      const fieldErrors = axiosErr?.response?.data?.errors;
      if (fieldErrors) {
        const first = Object.values(fieldErrors).flat()[0];
        toast.error(first || msg || 'İşlem başarısız oldu.');
      } else {
        toast.error(msg || 'İşlem başarısız oldu.');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      toast.success('Kategori silindi.');
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
    },
    onError: () => {
      toast.error(
        'Kategori silinemedi. Alt kategorileri veya ürünleri olabilir.'
      );
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({
      id,
      isFeatured,
    }: {
      id: number;
      isFeatured: boolean;
    }) => {
      await api.put(`/admin/categories/${id}`, {
        is_featured: isFeatured,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
    onError: () => {
      toast.error('Güncelleme başarısız.');
    },
  });

  const mergePreviewQuery = useQuery({
    queryKey: ['admin', 'categories', 'merge-preview', mergeSource, mergeTarget],
    queryFn: async () => {
      const { data } = await api.post('/admin/categories/merge-preview', {
        source_id: mergeSource,
        target_id: mergeTarget,
      });
      return data;
    },
    enabled: !!mergeSource && !!mergeTarget && mergeSource !== mergeTarget,
  });

  const mergeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/categories/merge', {
        source_id: mergeSource,
        target_id: mergeTarget,
      });
      return data;
    },
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      toast.success(resp.message);
      setMergeDialogOpen(false);
      setMergeSource('');
      setMergeTarget('');
    },
    onError: () => toast.error('Birleştirme başarısız.'),
  });

  // ── Derived data ─────────────────────────────────────────────
  const filteredTree = useMemo(
    () => filterTree(categories, searchQuery),
    [categories, searchQuery]
  );
  const parentOptions = useMemo(
    () => flattenForSelect(categories, 0, editingCategory?.id),
    [categories, editingCategory?.id]
  );
  const totalCount = useMemo(() => countTotal(categories), [categories]);
  const allCategoriesFlat = useMemo(
    () => flattenCategories(categories),
    [categories]
  );

  // ── Handlers ─────────────────────────────────────────────────
  const toggleExpand = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllExpanded = () => {
    const allIds = getAllIds(categories);
    const allExpanded = allIds.length > 0 && allIds.every((id) => expanded[id]);
    if (allExpanded) {
      setExpanded({});
    } else {
      const map: Record<number, boolean> = {};
      allIds.forEach((id) => (map[id] = true));
      setExpanded(map);
    }
  };

  const openCreate = () => {
    setEditingCategory(null);
    setFormData({ ...EMPTY_FORM });
    setDefaultTab('general');
    setDialogOpen(true);
  };

  const openEdit = (category: Category, tab = 'general') => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      parent_id: category.parentId,
      description: category.description ?? '',
      icon: category.icon ?? '',
      image_url: category.imageUrl ?? '',
      banner_image_url: category.bannerImageUrl ?? '',
      is_active: category.isActive,
      is_featured: category.isFeatured,
      homepage_product_ids: category.homepageProductIds ?? [],
      showcase_title: category.showcaseTitle ?? '',
      sort_order: category.sortOrder,
      meta_title: category.metaTitle ?? '',
      meta_description: category.metaDescription ?? '',
    });
    setDefaultTab(tab);
    setDialogOpen(true);
  };

  const openDelete = (category: Category) => {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormData({ ...EMPTY_FORM });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleToggleFeatured = (cat: Category) => {
    toggleFeaturedMutation.mutate({
      id: cat.id,
      isFeatured: !cat.isFeatured,
    });
  };

  const updateField = <K extends keyof CategoryFormData>(
    key: K,
    value: CategoryFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // ── Error state ──────────────────────────────────────────────
  if (error) {
    return (
      <Alert variant="error" title="Hata">
        Kategoriler yüklenirken bir hata oluştu.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">
            Kategoriler
          </h1>
          <p className="mt-1 text-sm text-secondary-500">
            {totalCount} kategori &middot; Ağaç yapısında yönetin, görselleri
            ekleyin
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setMergeDialogOpen(true); setMergeSource(''); setMergeTarget(''); }}>
            <Merge className="h-4 w-4" />
            Birleştir
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Yeni Kategori
          </Button>
        </div>
      </div>

      {/* ── Homepage Sections Preview ──────────────────────────── */}
      {!isLoading && (
        <div className="rounded-xl border border-secondary-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Eye className="h-4 w-4 text-secondary-400" />
            <h3 className="text-sm font-semibold text-secondary-700">
              Ana Sayfa Yönetimi
            </h3>
          </div>
          <HomepageSectionsPreview
            categories={allCategoriesFlat}
            onRemoveBanner={handleToggleFeatured}
            onEditShowcase={(cat) => openEdit(cat, 'showcase')}
          />
        </div>
      )}

      {/* ── Category Tree Panel ─────────────────────────────────── */}
      <div className="rounded-xl border border-secondary-200 bg-white">
        {/* Tree toolbar */}
        <div className="flex flex-col gap-3 border-b border-secondary-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-secondary-400" />
            <span className="text-sm font-semibold text-secondary-700">
              Kategori Ağacı
            </span>
            <Badge variant="outline" className="text-[10px]">
              {totalCount}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary-400" />
              <input
                type="text"
                placeholder="Kategori ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-48 rounded-lg border border-secondary-200 bg-secondary-50 pl-8 pr-3 text-xs text-secondary-700 placeholder:text-secondary-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
            </div>

            {/* Expand/Collapse all */}
            <button
              onClick={toggleAllExpanded}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-secondary-200 bg-secondary-50 px-3 text-xs font-medium text-secondary-600 transition-colors hover:bg-secondary-100"
              title="Tümünü Aç / Kapat"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Aç/Kapat</span>
            </button>
          </div>
        </div>

        {/* Tree content */}
        <div className="p-3">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-100">
                <FolderTree className="h-7 w-7 text-secondary-300" />
              </div>
              <p className="mt-4 text-sm font-medium text-secondary-600">
                {searchQuery
                  ? 'Aramanızla eşleşen kategori bulunamadı.'
                  : 'Henüz kategori bulunmuyor.'}
              </p>
              {!searchQuery && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={openCreate}
                >
                  <Plus className="h-3.5 w-3.5" />
                  İlk Kategoriyi Oluştur
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredTree.map((cat) => (
                <CategoryTreeNode
                  key={cat.id}
                  category={cat}
                  expanded={expanded}
                  onToggle={toggleExpand}
                  onEdit={openEdit}
                  onDelete={openDelete}
                  onToggleFeatured={handleToggleFeatured}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Create/Edit Dialog ──────────────────────────────────── */}
      <Dialog isOpen={dialogOpen} onClose={closeDialog} className="max-w-2xl">
        <DialogClose onClose={closeDialog} />
        <DialogHeader>
          <DialogTitle>
            {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogContent className="space-y-0 !py-0">
            <Tabs defaultValue={defaultTab} key={defaultTab}>
              <TabsList className="w-full">
                <TabsTrigger value="general">Genel</TabsTrigger>
                <TabsTrigger value="images">Görseller</TabsTrigger>
                <TabsTrigger value="showcase">Vitrin</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
              </TabsList>

              {/* ── General Tab ──────────────────────────────────── */}
              <TabsPanel value="general" className="space-y-4">
                <Input
                  label="Kategori Adı"
                  name="name"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                  placeholder="ör. Kadın Giyim"
                />

                <Input
                  label="Slug"
                  name="slug"
                  value={formData.slug}
                  onChange={(e) => updateField('slug', e.target.value)}
                  hint="Boş bırakılırsa otomatik oluşturulur."
                  placeholder="kadin-giyim"
                />

                <Textarea
                  label="Açıklama"
                  name="description"
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  textareaSize="sm"
                  placeholder="Kategori hakkında kısa açıklama..."
                />

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-secondary-700">
                    Üst Kategori
                  </label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 text-sm text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    value={formData.parent_id ?? ''}
                    onChange={(e) =>
                      updateField(
                        'parent_id',
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  >
                    <option value="">Üst kategori yok (Ana kategori)</option>
                    {parentOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Sıralama"
                    name="sort_order"
                    type="number"
                    value={String(formData.sort_order)}
                    onChange={(e) =>
                      updateField('sort_order', Number(e.target.value))
                    }
                  />
                  <Input
                    label="İkon URL"
                    name="icon"
                    value={formData.icon}
                    onChange={(e) => updateField('icon', e.target.value)}
                    hint="Opsiyonel"
                    placeholder="https://..."
                  />
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-secondary-100 bg-secondary-50/50 p-3">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      updateField('is_active', checked)
                    }
                    label="Aktif"
                  />
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) =>
                      updateField('is_featured', checked)
                    }
                    label="Ana Sayfada Göster"
                  />
                </div>
              </TabsPanel>

              {/* ── Images Tab ───────────────────────────────────── */}
              <TabsPanel value="images" className="space-y-6">
                <ImageUpload
                  label="Kategori Görseli"
                  hint="Ana sayfada kart görünümünde kullanılır. Önerilen oran: 4:5 (ör. 400x500px)"
                  value={formData.image_url}
                  onChange={(url) => updateField('image_url', url)}
                  folder="categories"
                />

                <ImageUpload
                  label="Banner Görseli"
                  hint="Kategori sayfası üst banner alanında görünür. Önerilen oran: 16:5 (ör. 1600x500px)"
                  value={formData.banner_image_url}
                  onChange={(url) => updateField('banner_image_url', url)}
                  folder="categories"
                />

                {/* Preview */}
                {formData.image_url && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-secondary-400">
                      Kart Önizleme
                    </p>
                    <div className="mx-auto w-44">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-secondary-200 bg-secondary-100 shadow-sm">
                        <Image
                          src={resolveImageUrl(formData.image_url)}
                          alt="Önizleme"
                          fill
                          className="object-cover"
                          sizes="176px"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-3">
                          <p className="text-sm font-bold text-white drop-shadow-lg">
                            {formData.name || 'Kategori Adı'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsPanel>

              {/* ── Showcase Tab ────────────────────────────────── */}
              <TabsPanel value="showcase" className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs text-blue-800">
                    Burada seçtiğiniz ürünler ana sayfada bu kategorinin altında
                    vitrin olarak görüntülenir. Banner daireleri için Genel
                    sekmesindeki <strong>&quot;Ana Sayfada Göster&quot;</strong>{' '}
                    seçeneğini kullanın.
                  </p>
                </div>

                <Input
                  label="Vitrin Başlığı"
                  name="showcase_title"
                  value={formData.showcase_title}
                  onChange={(e) =>
                    updateField('showcase_title', e.target.value)
                  }
                  placeholder={formData.name || 'Kategori adı kullanılır'}
                  hint="Boş bırakılırsa kategori adı gösterilir"
                />

                <ProductPicker
                  label="Vitrin Ürünleri"
                  hint="Ana sayfada gösterilecek ürünleri seçin"
                  value={formData.homepage_product_ids}
                  onChange={(ids) =>
                    updateField('homepage_product_ids', ids)
                  }
                  categoryId={editingCategory?.id ?? null}
                  max={10}
                />
              </TabsPanel>

              {/* ── SEO Tab ──────────────────────────────────────── */}
              <TabsPanel value="seo" className="space-y-4">
                <Input
                  label="Meta Başlık"
                  name="meta_title"
                  value={formData.meta_title}
                  onChange={(e) => updateField('meta_title', e.target.value)}
                  placeholder="Sayfa başlığı (boş bırakılırsa kategori adı kullanılır)"
                  hint={`${formData.meta_title.length}/60 karakter`}
                />
                <Textarea
                  label="Meta Açıklama"
                  name="meta_description"
                  value={formData.meta_description}
                  onChange={(e) =>
                    updateField('meta_description', e.target.value)
                  }
                  textareaSize="sm"
                  placeholder="Arama motorlarında görünecek açıklama..."
                  hint={`${formData.meta_description.length}/160 karakter`}
                />

                {/* SEO Preview */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-secondary-400">
                    Arama Sonucu Önizleme
                  </p>
                  <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4">
                    <p className="text-base font-medium text-blue-700">
                      {formData.meta_title ||
                        formData.name ||
                        'Sayfa Başlığı'}
                    </p>
                    <p className="mt-0.5 text-xs text-green-700">
                      siteniz.com/{formData.slug || 'kategori-slug'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-secondary-600">
                      {formData.meta_description ||
                        formData.description ||
                        'Kategori açıklaması burada görünür...'}
                    </p>
                  </div>
                </div>
              </TabsPanel>
            </Tabs>
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

      {/* ── Delete Confirmation Dialog ───────────────────────────── */}
      <Dialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogClose onClose={() => setDeleteDialogOpen(false)} />
        <DialogHeader>
          <DialogTitle>Kategoriyi Sil</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-secondary-600">
            <strong className="text-secondary-900">
              {deletingCategory?.name}
            </strong>{' '}
            kategorisini silmek istediğinize emin misiniz? Bu işlem geri
            alınamaz.
          </p>
          {(deletingCategory?.children?.length ?? 0) > 0 && (
            <Alert variant="warning" title="Dikkat" className="mt-3">
              Bu kategorinin alt kategorileri bulunuyor. Silmeden önce alt
              kategorileri taşıyın veya silin.
            </Alert>
          )}
          {(deletingCategory?.productCount ?? 0) > 0 && (
            <Alert variant="warning" title="Dikkat" className="mt-3">
              Bu kategoriye ait {deletingCategory!.productCount} ürün
              bulunuyor.
            </Alert>
          )}
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(false)}
          >
            İptal
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() =>
              deletingCategory && deleteMutation.mutate(deletingCategory.id)
            }
          >
            {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Merge Dialog ──────────────────────────────────────────── */}
      <Dialog
        isOpen={mergeDialogOpen}
        onClose={() => setMergeDialogOpen(false)}
      >
        <DialogClose onClose={() => setMergeDialogOpen(false)} />
        <DialogHeader>
          <DialogTitle>Kategorileri Birleştir</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-secondary-600 mb-4">
            Kaynak kategorideki tüm ürünler, alt kategoriler ve marketplace eşleştirmeleri hedef kategoriye taşınır. Kaynak kategori silinir.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Kaynak Kategori (silinecek)
              </label>
              <select
                className="w-full rounded-md border border-secondary-300 px-3 py-2 text-sm"
                value={mergeSource}
                onChange={(e) => setMergeSource(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Seçin...</option>
                {flattenForSelect(categories).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Hedef Kategori (korunacak)
              </label>
              <select
                className="w-full rounded-md border border-secondary-300 px-3 py-2 text-sm"
                value={mergeTarget}
                onChange={(e) => setMergeTarget(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Seçin...</option>
                {flattenForSelect(categories, 0, typeof mergeSource === 'number' ? mergeSource : undefined).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {mergePreviewQuery.data && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Etkilenecek veriler</span>
              </div>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>Ürünler: <strong>{mergePreviewQuery.data.affected.products}</strong></li>
                <li>Alt kategoriler: <strong>{mergePreviewQuery.data.affected.children}</strong></li>
                <li>Marketplace eşleştirmeleri: <strong>{mergePreviewQuery.data.affected.marketplace_mappings}</strong></li>
                <li>XML eşleştirmeleri: <strong>{mergePreviewQuery.data.affected.xml_mappings}</strong></li>
              </ul>
              <p className="mt-2 text-xs text-amber-600">
                <strong>{mergePreviewQuery.data.source.name}</strong> → <strong>{mergePreviewQuery.data.target.name}</strong> olarak birleştirilecek.
              </p>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
            İptal
          </Button>
          <Button
            variant="danger"
            loading={mergeMutation.isPending}
            disabled={!mergeSource || !mergeTarget || mergeSource === mergeTarget}
            onClick={() => mergeMutation.mutate()}
          >
            {mergeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Birleştiriliyor...
              </>
            ) : (
              <>
                <Merge className="h-4 w-4" />
                Birleştir
              </>
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
