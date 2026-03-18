'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Alert } from '@/components/ui/alert';
import {
  Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';

interface BlogPostItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  author: string;
  isActive: boolean;
  publishedAt: string | null;
  [key: string]: unknown;
}

export default function AdminBlogPostsPage() {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<BlogPostItem | null>(null);

  const { data, isLoading, error } = useQuery<BlogPostItem[]>({
    queryKey: ['admin', 'blog-posts'],
    queryFn: async () => {
      const { data } = await api.get('/admin/blog-posts');
      return data.data ?? data;
    },
  });

  const posts = data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/blog-posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-posts'] });
      toast.success('Yazı silindi.');
      setDeleteDialogOpen(false);
    },
    onError: () => toast.error('Silinemedi.'),
  });

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const columns: Column<BlogPostItem>[] = [
    {
      key: 'featuredImage', header: 'Görsel', sortable: false,
      render: (r) => r.featuredImage ? (
        <img src={r.featuredImage} alt="" className="h-10 w-16 rounded object-cover" />
      ) : (
        <div className="h-10 w-16 rounded bg-secondary-100" />
      ),
    },
    { key: 'title', header: 'Başlık', render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'author', header: 'Yazar', render: (r) => <span className="text-sm text-secondary-500">{r.author}</span> },
    {
      key: 'publishedAt', header: 'Yayın Tarihi',
      render: (r) => <span className="text-sm text-secondary-500">{formatDate(r.publishedAt)}</span>,
    },
    {
      key: 'isActive', header: 'Durum',
      render: (r) => <Badge variant={r.isActive ? 'success' : 'outline'}>{r.isActive ? 'Aktif' : 'Taslak'}</Badge>,
    },
    {
      key: 'actions', header: 'İşlemler', sortable: false,
      render: (r) => (
        <div className="flex gap-1">
          <Link href={`/admin/blog-posts/${r.id}`} className="rounded p-1.5 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-700">
            <Pencil className="h-4 w-4" />
          </Link>
          <a href={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/blog/${r.slug}`} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-700">
            <ExternalLink className="h-4 w-4" />
          </a>
          <button onClick={() => { setDeleting(r); setDeleteDialogOpen(true); }} className="rounded p-1.5 text-secondary-400 hover:bg-red-50 hover:text-danger">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (error) return <Alert variant="error">Blog yazıları yüklenirken hata oluştu.</Alert>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">Blog Yazıları</h1>
        <Link href="/admin/blog-posts/new">
          <Button><Plus className="h-4 w-4" />Yeni Yazı</Button>
        </Link>
      </div>

      <DataTable columns={columns} data={posts} isLoading={isLoading} emptyMessage="Henüz blog yazısı yok." keyExtractor={(p) => p.id} />

      {/* Delete Dialog */}
      <Dialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogClose onClose={() => setDeleteDialogOpen(false)} />
        <DialogHeader><DialogTitle>Yazı Sil</DialogTitle></DialogHeader>
        <DialogContent><p className="text-sm text-secondary-600"><strong>{deleting?.title}</strong> yazısını silmek istediğinize emin misiniz?</p></DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleting && deleteMutation.mutate(deleting.id)}>Sil</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
