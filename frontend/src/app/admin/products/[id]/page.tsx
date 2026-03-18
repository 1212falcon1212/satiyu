'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsPanel } from '@/components/ui/tabs';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, GripVertical, RefreshCw, ExternalLink, Check } from 'lucide-react';
import { revalidateCache } from '@/lib/revalidate';

/* ─── Local Interfaces ─── */

interface ApiCategory {
  id: number;
  name: string;
  depth: number;
  parentId: number | null;
}

interface ApiBrand {
  id: number;
  name: string;
}

interface ApiVariantType {
  id: number;
  name: string;
  displayType: string;
  options?: Array<{ id: number; value: string; colorCode?: string | null }>;
}

interface ApiVariantValue {
  id: number;
  optionValue: string;
  typeName: string;
  displayType?: string;
}

interface ApiVariant {
  id: number;
  sku: string | null;
  barcode: string | null;
  price: number | null;
  comparePrice: number | null;
  stockQuantity: number;
  isActive: boolean;
  variantValues: ApiVariantValue[];
}

interface ApiImage {
  id: number;
  imageUrl: string;
  sortOrder: number;
  isMain: boolean;
}

interface FormImage {
  id?: number;
  url: string;
  sort_order: number;
}

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: string;
  compare_price: string;
  cost_price: string;
  sku: string;
  barcode: string;
  stock_quantity: string;
  weight: string;
  category_id: string;
  brand_id: string;
  is_active: boolean;
  is_featured: boolean;
  show_on_homepage: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  meta_title: string;
  meta_description: string;
}

const defaultForm: ProductFormData = {
  name: '',
  slug: '',
  description: '',
  price: '',
  compare_price: '',
  cost_price: '',
  sku: '',
  barcode: '',
  stock_quantity: '0',
  weight: '',
  category_id: '',
  brand_id: '',
  is_active: true,
  is_featured: false,
  show_on_homepage: false,
  is_bestseller: false,
  is_new: false,
  meta_title: '',
  meta_description: '',
};

/* ─── Page ─── */

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const productId = params.id as string;
  const isNew = productId === 'new';

  const [formData, setFormData] = useState<ProductFormData>(defaultForm);
  const [images, setImages] = useState<FormImage[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [selectedVariantTypes, setSelectedVariantTypes] = useState<number[]>([]);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<number, number[]>>({});
  const [addVariantDialogOpen, setAddVariantDialogOpen] = useState(false);
  const [addVariantSelections, setAddVariantSelections] = useState<Record<number, number>>({});
  const [bulkComparePrice, setBulkComparePrice] = useState('');
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  /* ─── Queries ─── */

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['admin', 'product', productId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/products/${productId}`, {
        params: { include: 'images,category,brand,variants.variantValues' },
      });
      return data.data ?? data;
    },
    enabled: !isNew,
  });

  const { data: categories } = useQuery<ApiCategory[]>({
    queryKey: ['admin', 'categories-flat'],
    queryFn: async () => {
      const { data } = await api.get('/admin/categories', { params: { flat: true } });
      return data.data ?? data;
    },
  });

  const { data: brands } = useQuery<ApiBrand[]>({
    queryKey: ['admin', 'brands-all'],
    queryFn: async () => {
      const { data } = await api.get('/admin/brands', { params: { per_page: 999 } });
      return data.data ?? data;
    },
  });

  const { data: variantTypes } = useQuery<ApiVariantType[]>({
    queryKey: ['admin', 'variant-types'],
    queryFn: async () => {
      const { data } = await api.get('/admin/variant-types');
      return data.data ?? data;
    },
  });

  const { data: variants, refetch: refetchVariants } = useQuery<ApiVariant[]>({
    queryKey: ['admin', 'product', productId, 'variants'],
    queryFn: async () => {
      const { data } = await api.get(`/admin/products/${productId}/variants`);
      return data.data ?? data;
    },
    enabled: !isNew,
  });

  /* ─── Populate Form ─── */

  useEffect(() => {
    if (!product) return;

    setFormData({
      name: product.name ?? '',
      slug: product.slug ?? '',
      description: product.description ?? '',
      price: product.price?.toString() ?? '',
      compare_price: product.comparePrice?.toString() ?? '',
      cost_price: product.costPrice?.toString() ?? '',
      sku: product.sku ?? '',
      barcode: product.barcode ?? '',
      stock_quantity: product.stockQuantity?.toString() ?? '0',
      weight: product.weight?.toString() ?? '',
      category_id: product.categoryId?.toString() ?? '',
      brand_id: product.brandId?.toString() ?? '',
      is_active: product.isActive ?? true,
      is_featured: product.isFeatured ?? false,
      show_on_homepage: product.showOnHomepage ?? false,
      is_bestseller: product.isBestseller ?? false,
      is_new: product.isNew ?? false,
      meta_title: product.metaTitle ?? '',
      meta_description: product.metaDescription ?? '',
    });

    setImages(
      (product.images ?? []).map((img: ApiImage, i: number) => ({
        id: img.id,
        url: img.imageUrl,
        sort_order: img.sortOrder ?? i,
      }))
    );

    // Restore selected variant types from product variants
    if (product.variants?.length) {
      const typeNames = new Set<string>();
      for (const v of product.variants) {
        for (const vv of v.variantValues ?? []) {
          typeNames.add(vv.typeName);
        }
      }
      // We'll match by name when variantTypes loads
    }
  }, [product]);

  /* ─── Mutations ─── */

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (isNew) {
        const { data } = await api.post('/admin/products', payload);
        return data;
      }
      const { data } = await api.put(`/admin/products/${productId}`, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] });
      revalidateCache(['products']);
      toast.success(isNew ? 'Ürün oluşturuldu.' : 'Ürün güncellendi.');
      if (isNew && data?.data?.id) {
        router.replace(`/admin/products/${data.data.id}`);
      }
    },
    onError: () => {
      toast.error('Kaydetme başarısız oldu.');
    },
  });

  const generateVariantsMutation = useMutation({
    mutationFn: async () => {
      const allSelectedOptionIds = Object.entries(selectedVariantOptions)
        .filter(([typeId]) => selectedVariantTypes.includes(Number(typeId)))
        .flatMap(([, ids]) => ids);

      const { data } = await api.post(`/admin/products/${productId}/variants/generate`, {
        variant_type_ids: selectedVariantTypes,
        ...(allSelectedOptionIds.length > 0 ? { variant_option_ids: allSelectedOptionIds } : {}),
      });
      return data;
    },
    onSuccess: () => {
      refetchVariants();
      toast.success('Varyantlar oluşturuldu.');
    },
    onError: () => {
      toast.error('Varyant oluşturma başarısız.');
    },
  });

  const updateVariantMutation = useMutation({
    mutationFn: async ({ variantId, payload }: { variantId: number; payload: Record<string, unknown> }) => {
      const { data } = await api.put(`/admin/products/${productId}/variants/${variantId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId, 'variants'] });
      toast.success('Varyant güncellendi.');
    },
    onError: () => {
      toast.error('Varyant güncellenemedi.');
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (variantId: number) => {
      await api.delete(`/admin/products/${productId}/variants/${variantId}`);
    },
    onSuccess: () => {
      refetchVariants();
      toast.success('Varyant silindi.');
    },
    onError: () => {
      toast.error('Varyant silinemedi.');
    },
  });

  const storeVariantMutation = useMutation({
    mutationFn: async (variantOptionIds: number[]) => {
      const { data } = await api.post(`/admin/products/${productId}/variants`, {
        variant_option_ids: variantOptionIds,
      });
      return data;
    },
    onSuccess: () => {
      refetchVariants();
      setAddVariantDialogOpen(false);
      setAddVariantSelections({});
      toast.success('Varyant eklendi.');
    },
    onError: () => {
      toast.error('Varyant eklenemedi.');
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.put(`/admin/products/${productId}/variants/bulk-update`, payload);
      return data;
    },
    onSuccess: () => {
      refetchVariants();
      setBulkComparePrice('');
      setBulkPrice('');
      setBulkStock('');
      toast.success('Tüm varyantlar güncellendi.');
    },
    onError: () => {
      toast.error('Toplu güncelleme başarısız.');
    },
  });

  /* ─── Handlers ─── */

  const handleChange = (field: keyof ProductFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const payload = {
      name: formData.name,
      slug: formData.slug || slugify(formData.name),
      description: formData.description || null,
      price: parseFloat(formData.price) || 0,
      compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
      sku: formData.sku || null,
      barcode: formData.barcode || null,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      brand_id: formData.brand_id ? parseInt(formData.brand_id) : null,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
      show_on_homepage: formData.show_on_homepage,
      is_bestseller: formData.is_bestseller,
      is_new: formData.is_new,
      meta_title: formData.meta_title || null,
      meta_description: formData.meta_description || null,
      images: images.map((img, i) => ({ url: img.url, sort_order: i })),
      variant_type_ids: selectedVariantTypes,
    };
    saveMutation.mutate(payload);
  };

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    setImages((prev) => [...prev, { url: newImageUrl.trim(), sort_order: prev.length }]);
    setNewImageUrl('');
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;
    setImages((prev) => {
      const arr = [...prev];
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr;
    });
  };

  const toggleVariantType = (typeId: number) => {
    setSelectedVariantTypes((prev) => {
      const next = prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId];
      // Clear selected options for removed types
      if (!next.includes(typeId)) {
        setSelectedVariantOptions((prevOpts) => {
          const copy = { ...prevOpts };
          delete copy[typeId];
          return copy;
        });
      }
      return next;
    });
  };

  const toggleVariantOption = (typeId: number, optionId: number) => {
    setSelectedVariantOptions((prev) => {
      const current = prev[typeId] ?? [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [typeId]: next };
    });
  };

  const selectAllOptions = (typeId: number) => {
    const vt = variantTypes?.find((t) => t.id === typeId);
    if (!vt?.options) return;
    setSelectedVariantOptions((prev) => ({
      ...prev,
      [typeId]: vt.options!.map((o) => o.id),
    }));
  };

  const clearOptions = (typeId: number) => {
    setSelectedVariantOptions((prev) => ({
      ...prev,
      [typeId]: [],
    }));
  };

  const handleAddVariantSubmit = () => {
    const optionIds = Object.values(addVariantSelections).filter(Boolean);
    if (optionIds.length === 0) {
      toast.error('Her varyant tipi icin bir deger secin.');
      return;
    }
    storeVariantMutation.mutate(optionIds);
  };

  const handleBulkApply = () => {
    if (!variants || variants.length === 0) return;
    const payload: Record<string, unknown> = {};
    const variantsData = variants.map((v) => {
      const update: Record<string, unknown> = { id: v.id };
      if (bulkComparePrice !== '') update.compare_price = parseFloat(bulkComparePrice) || 0;
      if (bulkPrice !== '') update.price = parseFloat(bulkPrice) || 0;
      if (bulkStock !== '') update.stock_quantity = parseInt(bulkStock) || 0;
      return update;
    });
    // Only send if at least one field is set
    if (bulkComparePrice === '' && bulkPrice === '' && bulkStock === '') {
      toast.error('En az bir alan doldurun.');
      return;
    }
    payload.variants = variantsData;
    bulkUpdateMutation.mutate(payload);
  };

  /* ─── Sort categories for display ─── */
  const sortedCategories = (categories ?? []).slice().sort((a, b) => {
    if (a.parentId === null && b.parentId !== null) return -1;
    if (a.parentId !== null && b.parentId === null) return 1;
    return 0;
  });

  /* ─── Loading state ─── */

  if (!isNew && productLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/products')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-secondary-900">
            {isNew ? 'Yeni Ürün' : formData.name || 'Ürün Düzenle'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && formData.slug && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/urun/${formData.slug}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Ürünü Göster
            </Button>
          )}
          <Button onClick={handleSave} loading={saveMutation.isPending}>
            {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
          <TabsTrigger value="images">Görseller</TabsTrigger>
          <TabsTrigger value="variants">Varyantlar</TabsTrigger>
        </TabsList>

        {/* ── General Tab ── */}
        <TabsPanel value="general">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Temel Bilgiler</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Ürün Adı"
                    name="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                  />
                  <Input
                    label="Slug"
                    name="slug"
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    hint="Boş bırakılırsa otomatik oluşturulur."
                  />
                  <Textarea
                    label="Açıklama"
                    name="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    textareaSize="lg"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fiyatlandırma</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Input
                      label="Fiyat (TL)"
                      name="compare_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.compare_price}
                      onChange={(e) => handleChange('compare_price', e.target.value)}
                    />
                    <Input
                      label="İndirimli Fiyat (TL)"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => handleChange('price', e.target.value)}
                      required
                    />
                    <Input
                      label="Maliyet Fiyatı (TL)"
                      name="cost_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cost_price}
                      onChange={(e) => handleChange('cost_price', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Stok ve Kargo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Input
                      label="SKU"
                      name="sku"
                      value={formData.sku}
                      onChange={(e) => handleChange('sku', e.target.value)}
                    />
                    <Input
                      label="Barkod"
                      name="barcode"
                      value={formData.barcode}
                      onChange={(e) => handleChange('barcode', e.target.value)}
                    />
                    <Input
                      label="Stok Miktarı"
                      name="stock_quantity"
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => handleChange('stock_quantity', e.target.value)}
                    />
                    <Input
                      label="Ağırlık (kg)"
                      name="weight"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.weight}
                      onChange={(e) => handleChange('weight', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>SEO</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Meta Başlık"
                    name="meta_title"
                    value={formData.meta_title}
                    onChange={(e) => handleChange('meta_title', e.target.value)}
                    hint="Boş bırakılırsa ürün adı kullanılır."
                  />
                  <Textarea
                    label="Meta Açıklama"
                    name="meta_description"
                    value={formData.meta_description}
                    onChange={(e) => handleChange('meta_description', e.target.value)}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Durum</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleChange('is_active', checked)}
                    label="Aktif"
                  />
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => handleChange('is_featured', checked)}
                    label="Öne Çıkan"
                  />
                  <Switch
                    checked={formData.show_on_homepage}
                    onCheckedChange={(checked) => handleChange('show_on_homepage', checked)}
                    label="Ana Sayfada Göster"
                  />
                  <Switch
                    checked={formData.is_bestseller}
                    onCheckedChange={(checked) => handleChange('is_bestseller', checked)}
                    label="Çok Satan"
                  />
                  <Switch
                    checked={formData.is_new}
                    onCheckedChange={(checked) => handleChange('is_new', checked)}
                    label="Yeni Ürün"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Kategori</CardTitle>
                </CardHeader>
                <CardContent>
                  <select
                    className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 text-sm text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    value={formData.category_id}
                    onChange={(e) => handleChange('category_id', e.target.value)}
                  >
                    <option value="">Kategori seçin</option>
                    {sortedCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {'—'.repeat(cat.depth ?? 0)} {cat.name}
                      </option>
                    ))}
                  </select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Marka</CardTitle>
                </CardHeader>
                <CardContent>
                  <select
                    className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 text-sm text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    value={formData.brand_id}
                    onChange={(e) => handleChange('brand_id', e.target.value)}
                  >
                    <option value="">Marka seçin</option>
                    {(brands ?? []).map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsPanel>

        {/* ── Images Tab ── */}
        <TabsPanel value="images">
          <Card>
            <CardHeader>
              <CardTitle>Ürün Görselleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Görsel URL'si girin"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addImage();
                    }
                  }}
                />
                <Button onClick={addImage} variant="outline">
                  <Plus className="h-4 w-4" />
                  Ekle
                </Button>
              </div>

              {images.length === 0 ? (
                <p className="py-8 text-center text-secondary-500">
                  Henüz görsel eklenmemiş.
                </p>
              ) : (
                <div className="space-y-2">
                  {images.map((img, index) => (
                    <div
                      key={`${img.id ?? index}-${index}`}
                      className="flex items-center gap-3 rounded-lg border border-secondary-200 p-3"
                    >
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveImage(index, 'up')}
                          disabled={index === 0}
                          className="text-secondary-400 hover:text-secondary-700 disabled:opacity-30"
                          aria-label="Yukarı taşı"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary-100">
                        <img
                          src={img.url}
                          alt={`Görsel ${index + 1}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm text-secondary-700">{img.url}</p>
                        <p className="text-xs text-secondary-400">Sıra: {index + 1}</p>
                      </div>
                      {index === 0 && (
                        <Badge variant="info">Ana Görsel</Badge>
                      )}
                      <button
                        onClick={() => removeImage(index)}
                        className="rounded p-1.5 text-secondary-400 hover:bg-red-50 hover:text-danger transition-colors"
                        aria-label="Kaldır"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsPanel>

        {/* ── Variants Tab ── */}
        <TabsPanel value="variants">
          <div className="space-y-6">
            {/* Variant Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Varyant Tipleri</CardTitle>
              </CardHeader>
              <CardContent>
                {!variantTypes || variantTypes.length === 0 ? (
                  <p className="text-sm text-secondary-500">
                    Henüz varyant tipi tanımlanmamış. Yönetim panelindeki &quot;Varyant Tipleri&quot; sayfasından ekleyebilirsiniz.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Type chips */}
                    <div className="flex flex-wrap gap-2">
                      {variantTypes.map((vt) => (
                        <button
                          key={vt.id}
                          onClick={() => toggleVariantType(vt.id)}
                          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                            selectedVariantTypes.includes(vt.id)
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-secondary-200 text-secondary-600 hover:border-secondary-300'
                          }`}
                        >
                          {selectedVariantTypes.includes(vt.id) && (
                            <Check className="h-4 w-4" />
                          )}
                          {vt.name}
                          {vt.options && vt.options.length > 0 && (
                            <span className="text-xs opacity-60">
                              ({vt.options.length})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Options per selected type with checkboxes */}
                    {selectedVariantTypes.length > 0 && (
                      <div className="space-y-4 rounded-lg border border-secondary-200 bg-secondary-50 p-4">
                        {variantTypes
                          .filter((vt) => selectedVariantTypes.includes(vt.id))
                          .map((vt) => {
                            const selected = selectedVariantOptions[vt.id] ?? [];
                            const allSelected = (vt.options ?? []).length > 0 && selected.length === (vt.options ?? []).length;
                            return (
                              <div key={vt.id}>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-secondary-500">
                                    {vt.name}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => selectAllOptions(vt.id)}
                                      className={`text-xs font-medium transition-colors ${
                                        allSelected
                                          ? 'text-secondary-400 cursor-default'
                                          : 'text-primary-600 hover:text-primary-700'
                                      }`}
                                      disabled={allSelected}
                                    >
                                      Tümünü Seç
                                    </button>
                                    <span className="text-secondary-300">|</span>
                                    <button
                                      type="button"
                                      onClick={() => clearOptions(vt.id)}
                                      className={`text-xs font-medium transition-colors ${
                                        selected.length === 0
                                          ? 'text-secondary-400 cursor-default'
                                          : 'text-danger hover:text-red-700'
                                      }`}
                                      disabled={selected.length === 0}
                                    >
                                      Temizle
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {(vt.options ?? []).map((opt) => {
                                    const isSelected = selected.includes(opt.id);
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => toggleVariantOption(vt.id, opt.id)}
                                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                          isSelected
                                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                                            : 'border-secondary-200 bg-white text-secondary-600 hover:border-secondary-300'
                                        }`}
                                      >
                                        {opt.colorCode && (
                                          <span
                                            className="h-3 w-3 rounded-full border border-secondary-300"
                                            style={{ backgroundColor: opt.colorCode }}
                                          />
                                        )}
                                        {isSelected && <Check className="h-3 w-3" />}
                                        {opt.value}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {/* Generate button */}
                    {!isNew && selectedVariantTypes.length > 0 && (
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateVariantsMutation.mutate()}
                          loading={generateVariantsMutation.isPending}
                        >
                          <RefreshCw className="mr-1.5 h-4 w-4" />
                          Varyantları Oluştur
                        </Button>
                        <p className="text-xs text-secondary-500">
                          Seçili tiplere göre tüm kombinasyonlar oluşturulur. Mevcut varyantlar silinir.
                        </p>
                      </div>
                    )}

                    {isNew && selectedVariantTypes.length > 0 && (
                      <Alert variant="info">
                        Ürünü kaydettikten sonra varyant kombinasyonlarını oluşturabilirsiniz.
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Existing Variants Table */}
            {!isNew && variants && variants.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      Varyant Kombinasyonları
                      <span className="ml-2 text-sm font-normal text-secondary-400">
                        ({variants.length} adet)
                      </span>
                    </CardTitle>
                    {selectedVariantTypes.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAddVariantSelections({});
                          setAddVariantDialogOpen(true);
                        }}
                      >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Varyant Ekle
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Bulk update row */}
                  <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-secondary-300 bg-secondary-50 p-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-secondary-500 self-center">
                      Tümüne Uygula:
                    </span>
                    <div className="w-28">
                      <label className="mb-1 block text-xs text-secondary-500">Fiyat</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-8 w-full rounded border border-secondary-300 px-2 text-sm focus:border-primary-500 focus:outline-none"
                        placeholder="0.00"
                        value={bulkComparePrice}
                        onChange={(e) => setBulkComparePrice(e.target.value)}
                      />
                    </div>
                    <div className="w-28">
                      <label className="mb-1 block text-xs text-secondary-500">İnd. Fiyat</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-8 w-full rounded border border-secondary-300 px-2 text-sm focus:border-primary-500 focus:outline-none"
                        placeholder="0.00"
                        value={bulkPrice}
                        onChange={(e) => setBulkPrice(e.target.value)}
                      />
                    </div>
                    <div className="w-20">
                      <label className="mb-1 block text-xs text-secondary-500">Stok</label>
                      <input
                        type="number"
                        min="0"
                        className="h-8 w-full rounded border border-secondary-300 px-2 text-sm focus:border-primary-500 focus:outline-none"
                        placeholder="0"
                        value={bulkStock}
                        onChange={(e) => setBulkStock(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkApply}
                      loading={bulkUpdateMutation.isPending}
                    >
                      Uygula
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-secondary-200">
                          <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">
                            Varyant
                          </th>
                          <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">
                            SKU
                          </th>
                          <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">
                            Barkod
                          </th>
                          <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">
                            Fiyat
                          </th>
                          <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">
                            İnd. Fiyat
                          </th>
                          <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">
                            Stok
                          </th>
                          <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-500">
                            Durum
                          </th>
                          <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-secondary-500">
                            İşlem
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-secondary-100">
                        {variants.map((variant) => (
                          <tr key={variant.id} className="hover:bg-secondary-50">
                            <td className="py-3 text-sm">
                              <div className="flex flex-wrap gap-1">
                                {variant.variantValues?.map((val) => (
                                  <Badge key={val.id} variant="outline">
                                    {val.typeName}: {val.optionValue}
                                  </Badge>
                                ))}
                                {(!variant.variantValues || variant.variantValues.length === 0) && (
                                  <span className="text-xs text-secondary-400">-</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3">
                              <input
                                type="text"
                                className="h-8 w-36 rounded border border-secondary-300 px-2 text-xs focus:border-primary-500 focus:outline-none"
                                defaultValue={variant.sku ?? ''}
                                placeholder="SKU"
                                onBlur={(e) => {
                                  const val = e.target.value.trim();
                                  if (val !== (variant.sku ?? '')) {
                                    updateVariantMutation.mutate({
                                      variantId: variant.id,
                                      payload: { sku: val || null },
                                    });
                                  }
                                }}
                              />
                            </td>
                            <td className="py-3">
                              <input
                                type="text"
                                className="h-8 w-32 rounded border border-secondary-300 px-2 text-xs focus:border-primary-500 focus:outline-none"
                                defaultValue={variant.barcode ?? ''}
                                placeholder="Barkod"
                                onBlur={(e) => {
                                  const val = e.target.value.trim();
                                  if (val !== (variant.barcode ?? '')) {
                                    updateVariantMutation.mutate({
                                      variantId: variant.id,
                                      payload: { barcode: val || null },
                                    });
                                  }
                                }}
                              />
                            </td>
                            <td className="py-3">
                              <input
                                type="number"
                                step="0.01"
                                className="h-8 w-24 rounded border border-secondary-300 px-2 text-sm focus:border-primary-500 focus:outline-none"
                                defaultValue={variant.comparePrice ?? ''}
                                placeholder="Fiyat"
                                onBlur={(e) => {
                                  const val = e.target.value;
                                  updateVariantMutation.mutate({
                                    variantId: variant.id,
                                    payload: { compare_price: val ? parseFloat(val) : null },
                                  });
                                }}
                              />
                            </td>
                            <td className="py-3">
                              <input
                                type="number"
                                step="0.01"
                                className="h-8 w-24 rounded border border-secondary-300 px-2 text-sm focus:border-primary-500 focus:outline-none"
                                defaultValue={variant.price ?? ''}
                                placeholder="İnd. Fiyat"
                                onBlur={(e) => {
                                  const val = e.target.value;
                                  updateVariantMutation.mutate({
                                    variantId: variant.id,
                                    payload: { price: val ? parseFloat(val) : null },
                                  });
                                }}
                              />
                            </td>
                            <td className="py-3">
                              <input
                                type="number"
                                min="0"
                                className="h-8 w-20 rounded border border-secondary-300 px-2 text-sm focus:border-primary-500 focus:outline-none"
                                defaultValue={variant.stockQuantity}
                                onBlur={(e) => {
                                  updateVariantMutation.mutate({
                                    variantId: variant.id,
                                    payload: { stock_quantity: parseInt(e.target.value) || 0 },
                                  });
                                }}
                              />
                            </td>
                            <td className="py-3">
                              <Switch
                                checked={variant.isActive}
                                onCheckedChange={(checked) => {
                                  updateVariantMutation.mutate({
                                    variantId: variant.id,
                                    payload: { is_active: checked },
                                  });
                                }}
                              />
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => deleteVariantMutation.mutate(variant.id)}
                                className="rounded p-1.5 text-secondary-400 hover:bg-red-50 hover:text-danger transition-colors"
                                aria-label="Varyanti sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty state */}
            {!isNew && (!variants || variants.length === 0) && (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="text-secondary-500">
                    Bu ürün için henüz varyant oluşturulmamış.
                  </p>
                  {selectedVariantTypes.length > 0 && (
                    <div className="mt-3 flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAddVariantSelections({});
                          setAddVariantDialogOpen(true);
                        }}
                      >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Varyant Ekle
                      </Button>
                    </div>
                  )}
                  {selectedVariantTypes.length === 0 && (
                    <p className="mt-2 text-sm text-secondary-400">
                      Önce yukarıdan varyant tiplerini seçin.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Add Single Variant Dialog */}
          <Dialog isOpen={addVariantDialogOpen} onClose={() => setAddVariantDialogOpen(false)}>
            <DialogClose onClose={() => setAddVariantDialogOpen(false)} />
            <DialogHeader>
              <DialogTitle>Varyant Ekle</DialogTitle>
            </DialogHeader>
            <DialogContent>
              <div className="space-y-4">
                {variantTypes
                  ?.filter((vt) => selectedVariantTypes.includes(vt.id))
                  .map((vt) => (
                    <div key={vt.id}>
                      <label className="mb-1.5 block text-sm font-medium text-secondary-700">
                        {vt.name}
                      </label>
                      <select
                        className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 text-sm text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        value={addVariantSelections[vt.id] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAddVariantSelections((prev) => ({
                            ...prev,
                            [vt.id]: val ? parseInt(val) : 0,
                          }));
                        }}
                      >
                        <option value="">Seçiniz</option>
                        {(vt.options ?? []).map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.value}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
              </div>
            </DialogContent>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddVariantDialogOpen(false)}
              >
                İptal
              </Button>
              <Button
                onClick={handleAddVariantSubmit}
                loading={storeVariantMutation.isPending}
              >
                Ekle
              </Button>
            </DialogFooter>
          </Dialog>
        </TabsPanel>
      </Tabs>
    </div>
  );
}
