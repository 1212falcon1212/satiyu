'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ImageUpload } from '@/components/ui/image-upload';
import { Alert } from '@/components/ui/alert';
import { ArrowLeft, ExternalLink, Save } from 'lucide-react';
import { RichTextEditor } from '@/components/admin/RichTextEditor';

interface BlogPostData {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featuredImage: string | null;
  author: string;
  isActive: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
}

const emptyForm = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featured_image: '',
  author: 'Admin',
  is_active: true,
  meta_title: '',
  meta_description: '',
  published_at: '',
};

export default function AdminBlogPostEditPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const isNew = id === 'new';

  const [form, setForm] = useState(emptyForm);
  const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual');

  const { data: post, isLoading, error } = useQuery<BlogPostData>({
    queryKey: ['admin', 'blog-post', id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/blog-posts/${id}`);
      return data.data ?? data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (post) {
      setForm({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || '',
        content: post.content || '',
        featured_image: post.featuredImage || '',
        author: post.author || 'Admin',
        is_active: post.isActive,
        meta_title: post.metaTitle || '',
        meta_description: post.metaDescription || '',
        published_at: post.publishedAt ? post.publishedAt.slice(0, 16) : '',
      });
    }
  }, [post]);

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const body = {
        ...payload,
        published_at: payload.published_at || new Date().toISOString(),
      };
      if (isNew) return api.post('/admin/blog-posts', body);
      return api.put(`/admin/blog-posts/${id}`, body);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-posts'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-post', id] });
      // Revalidate frontend cache so blog pages show updated content
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        await fetch(`${siteUrl}/api/revalidate?secret=giyim-revalidate-2024`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: ['blog'] }),
        });
      } catch { /* ignore revalidation errors */ }
      toast.success(isNew ? 'Yazı oluşturuldu.' : 'Yazı güncellendi.');
      if (isNew) router.push('/admin/blog-posts');
    },
    onError: () => toast.error('İşlem başarısız oldu.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  if (!isNew && isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-secondary-200 animate-pulse" />
        <div className="h-96 rounded-lg bg-secondary-100 animate-pulse" />
      </div>
    );
  }

  if (!isNew && error) {
    return <Alert variant="error">Blog yazısı yüklenirken hata oluştu.</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/blog-posts"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-secondary-200 text-secondary-500 hover:bg-secondary-50 hover:text-secondary-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              {isNew ? 'Yeni Blog Yazısı' : 'Yazı Düzenle'}
            </h1>
            {!isNew && post && (
              <p className="text-sm text-secondary-500 mt-0.5">/{post.slug}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && post && (
            <a
              href={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/blog/${post.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-secondary-200 px-3 py-2 text-sm font-medium text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Yazıyı Görüntüle
            </a>
          )}
          <Button onClick={handleSubmit} loading={saveMutation.isPending}>
            <Save className="h-4 w-4" />
            Kaydet
          </Button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left - Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Slug */}
            <div className="rounded-lg border border-secondary-200 bg-white p-5 space-y-4">
              <Input
                label="Başlık"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
              <Input
                label="Slug"
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                hint="Boş bırakılırsa otomatik oluşturulur."
              />
            </div>

            {/* Excerpt */}
            <div className="rounded-lg border border-secondary-200 bg-white p-5">
              <Textarea
                label="Özet"
                value={form.excerpt}
                onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                rows={3}
                hint="Blog listesinde görünecek kısa açıklama."
              />
            </div>

            {/* Content editor */}
            <div className="rounded-lg border border-secondary-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-secondary-700">İçerik</label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditorMode('visual')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      editorMode === 'visual'
                        ? 'bg-secondary-900 text-white'
                        : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                    }`}
                  >
                    Görsel Editör
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('html')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      editorMode === 'html'
                        ? 'bg-secondary-900 text-white'
                        : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                    }`}
                  >
                    HTML
                  </button>
                </div>
              </div>

              {editorMode === 'visual' ? (
                <RichTextEditor
                  value={form.content}
                  onChange={(html) => setForm((p) => ({ ...p, content: html }))}
                  placeholder="Blog içeriğinizi buraya yazın..."
                />
              ) : (
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  rows={20}
                  className="font-mono text-xs leading-relaxed"
                  placeholder="<p>HTML içerik buraya...</p>"
                />
              )}
            </div>

            {/* SEO */}
            <div className="rounded-lg border border-secondary-200 bg-white p-5 space-y-4">
              <h3 className="text-sm font-semibold text-secondary-900 uppercase tracking-wider">SEO</h3>
              <Input
                label="Meta Title"
                value={form.meta_title}
                onChange={(e) => setForm((p) => ({ ...p, meta_title: e.target.value }))}
              />
              <Textarea
                label="Meta Description"
                value={form.meta_description}
                onChange={(e) => setForm((p) => ({ ...p, meta_description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          {/* Right - Sidebar */}
          <div className="space-y-6">
            {/* Publish settings */}
            <div className="rounded-lg border border-secondary-200 bg-white p-5 space-y-4">
              <h3 className="text-sm font-semibold text-secondary-900 uppercase tracking-wider">Yayınlama</h3>
              <Switch
                checked={form.is_active}
                onCheckedChange={(c) => setForm((p) => ({ ...p, is_active: c }))}
                label="Aktif (Yayınla)"
              />
              <Input
                label="Yayın Tarihi"
                type="datetime-local"
                value={form.published_at}
                onChange={(e) => setForm((p) => ({ ...p, published_at: e.target.value }))}
                hint="Boş bırakılırsa şimdi yayınlanır."
              />
              <Input
                label="Yazar"
                value={form.author}
                onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
              />
            </div>

            {/* Featured Image */}
            <div className="rounded-lg border border-secondary-200 bg-white p-5 space-y-3">
              <h3 className="text-sm font-semibold text-secondary-900 uppercase tracking-wider">Öne Çıkan Görsel</h3>
              <ImageUpload
                value={form.featured_image}
                onChange={(url) => setForm((p) => ({ ...p, featured_image: url }))}
                folder="blog"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
