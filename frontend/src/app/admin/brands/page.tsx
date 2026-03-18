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
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ImageUpload } from '@/components/ui/image-upload';
import { Plus, Pencil, Trash2, ImageIcon, Search } from 'lucide-react';
import Image from 'next/image';

interface Brand {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  [key: string]: unknown;
}

interface BrandFormData {
  name: string;
  slug: string;
  logo_url: string;
  is_active: boolean;
  is_featured: boolean;
}

interface PaginatedResponse {
  data: Brand[];
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
  };
}

const statusOptions = [
  { value: '', label: 'Tümü' },
  { value: '1', label: 'Aktif' },
  { value: '0', label: 'Pasif' },
];

const featuredOptions = [
  { value: '', label: 'Tümü' },
  { value: '1', label: 'Gösterilen' },
  { value: '0', label: 'Gizlenen' },
];

function BrandLogo({ url, name }: { url: string | null; name: string }) {
  if (!url) {
    return (
      <div className="flex h-10 w-20 items-center justify-center rounded bg-secondary-100">
        <ImageIcon className="h-4 w-4 text-secondary-300" />
      </div>
    );
  }

  const src = url.startsWith('http')
    ? url
    : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${url}`;

  return (
    <div className="relative h-10 w-20 overflow-hidden rounded bg-white">
      <Image
        src={src}
        alt={name}
        fill
        className="object-contain"
        sizes="80px"
        unoptimized
      />
    </div>
  );
}

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState('');

  const [formData, setFormData] = useState<BrandFormData>({
    name: '',
    slug: '',
    logo_url: '',
    is_active: true,
    is_featured: false,
  });

  const { data: response, isLoading, error } = useQuery<PaginatedResponse>({
    queryKey: ['admin', 'brands', page, perPage, searchQuery, statusFilter, featuredFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: perPage };
      if (searchQuery) params['filter[name]'] = searchQuery;
      if (statusFilter) params['filter[is_active]'] = statusFilter;
      if (featuredFilter) params['filter[is_featured]'] = featuredFilter;
      const { data } = await api.get('/admin/brands', { params });
      return data;
    },
  });

  const brands = response?.data ?? [];
  const total = response?.meta?.total ?? brands.length;

  const saveMutation = useMutation({
    mutationFn: async (payload: BrandFormData) => {
      if (editingBrand) {
        const { data } = await api.put(`/admin/brands/${editingBrand.id}`, payload);
        return data;
      }
      const { data } = await api.post('/admin/brands', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'brands'] });
      toast.success(editingBrand ? 'Marka güncellendi.' : 'Marka oluşturuldu.');
      closeDialog();
    },
    onError: () => {
      toast.error('İşlem başarısız oldu.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/brands/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'brands'] });
      toast.success('Marka silindi.');
      setDeleteDialogOpen(false);
      setDeletingBrand(null);
    },
    onError: () => {
      toast.error('Marka silinemedi.');
    },
  });

  const openCreate = () => {
    setEditingBrand(null);
    setFormData({ name: '', slug: '', logo_url: '', is_active: true, is_featured: false });
    setDialogOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      slug: brand.slug,
      logo_url: brand.logoUrl || '',
      is_active: brand.isActive,
      is_featured: brand.isFeatured,
    });
    setDialogOpen(true);
  };

  const openDelete = (brand: Brand) => {
    setDeletingBrand(brand);
    setDeleteDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingBrand(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleFeaturedChange = (value: string) => {
    setFeaturedFilter(value);
    setPage(1);
  };

  const columns: Column<Brand>[] = [
    {
      key: 'logoUrl',
      header: 'Logo',
      sortable: false,
      render: (brand) => <BrandLogo url={brand.logoUrl} name={brand.name} />,
    },
    {
      key: 'name',
      header: 'Marka Adı',
      render: (brand) => (
        <span className="font-medium text-secondary-900">{brand.name}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Durum',
      render: (brand) => (
        <Badge variant={brand.isActive ? 'success' : 'outline'}>
          {brand.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
    {
      key: 'isFeatured',
      header: 'Ana Sayfa',
      render: (brand) => (
        <Badge variant={brand.isFeatured ? 'info' : 'outline'}>
          {brand.isFeatured ? 'Göster' : 'Gizle'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'İşlemler',
      sortable: false,
      render: (brand) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(brand)}
            className="rounded p-1.5 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-700 transition-colors"
            aria-label="Düzenle"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => openDelete(brand)}
            className="rounded p-1.5 text-secondary-400 hover:bg-red-50 hover:text-danger transition-colors"
            aria-label="Sil"
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
        Markalar yüklenirken bir hata oluştu.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Markalar</h1>
          <p className="mt-1 text-sm text-secondary-500">
            Marka listesini yönetin, logo ekleyin ve ana sayfada gösterilecek markaları belirleyin.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Yeni Marka
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Marka ara..."
              className="h-10 w-full rounded-lg border border-secondary-300 bg-white pl-10 pr-3 text-sm text-secondary-900 placeholder:text-secondary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>
        <div className="w-full sm:w-36">
          <Select
            selectSize="md"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            placeholder="Durum"
          />
        </div>
        <div className="w-full sm:w-36">
          <Select
            selectSize="md"
            options={featuredOptions}
            value={featuredFilter}
            onChange={(e) => handleFeaturedChange(e.target.value)}
            placeholder="Ana Sayfa"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={brands}
        isLoading={isLoading}
        emptyMessage="Henüz marka bulunmuyor."
        page={page}
        perPage={perPage}
        total={total}
        onPageChange={setPage}
        onPerPageChange={(newPerPage) => {
          setPerPage(newPerPage);
          setPage(1);
        }}
        keyExtractor={(brand) => brand.id}
      />

      {/* Add/Edit Dialog */}
      <Dialog isOpen={dialogOpen} onClose={closeDialog}>
        <DialogClose onClose={closeDialog} />
        <DialogHeader>
          <DialogTitle>
            {editingBrand ? 'Marka Düzenle' : 'Yeni Marka'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogContent className="space-y-4">
            <Input
              label="Marka Adı"
              name="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
            <Input
              label="Slug"
              name="slug"
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: e.target.value }))
              }
              hint="Boş bırakılırsa otomatik oluşturulur."
            />
            <ImageUpload
              label="Marka Logosu"
              value={formData.logo_url}
              onChange={(url) => setFormData((prev) => ({ ...prev, logo_url: url }))}
              folder="brands"
              hint="Önerilen: Şeffaf arka planlı PNG, 200x80 piksel"
            />
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_active: checked }))
              }
              label="Aktif"
            />
            <Switch
              checked={formData.is_featured}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_featured: checked }))
              }
              label="Ana Sayfada Göster"
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
          <DialogTitle>Markayı Sil</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-secondary-600">
            <strong>{deletingBrand?.name}</strong> markasını silmek istediğinize emin misiniz?
            Bu işlem geri alınamaz.
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
            İptal
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deletingBrand && deleteMutation.mutate(deletingBrand.id)}
          >
            {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
