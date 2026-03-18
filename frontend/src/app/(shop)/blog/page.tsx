import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { CalendarDays, User, ArrowRight } from 'lucide-react';
import { fetchApi } from '@/lib/api-server';
import type { BlogPost, PaginatedResponse } from '@/types/api';

export const metadata: Metadata = {
  title: 'Blog - Moda & Stil Rehberi',
  description: 'Moda trendleri, stil önerileri ve giyim bakım ipuçları.',
};

async function getBlogPosts() {
  try {
    const res = await fetchApi<{ data: BlogPost[]; meta: PaginatedResponse<BlogPost>['meta'] }>(
      '/blog?per_page=12',
      { revalidate: 300, tags: ['blog'] }
    );
    return res;
  } catch {
    return { data: [], meta: { current_page: 1, last_page: 1, per_page: 12, total: 0, from: null, to: null, path: '' } };
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function BlogPage() {
  const { data: posts } = await getBlogPosts();

  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  return (
    <div className="bg-white min-h-screen">
      <div className="container-main py-10">
        {/* Page header */}
        <div className="section-header mb-12">
          <p className="section-subtitle">Moda & Stil</p>
          <h1 className="section-title text-3xl lg:text-4xl">Blog</h1>
          <p className="section-desc">Moda trendleri, stil önerileri ve giyim bakım ipuçları</p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-secondary-500">Henüz blog yazısı yok.</p>
          </div>
        ) : (
          <>
            {/* Featured post - large card */}
            {featuredPost && (
              <Link href={`/blog/${featuredPost.slug}`} className="group block mb-12">
                <div className="relative overflow-hidden rounded-lg aspect-[21/9]">
                  {featuredPost.featuredImage ? (
                    <Image
                      src={featuredPost.featuredImage}
                      alt={featuredPost.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="100vw"
                      unoptimized
                    />
                  ) : (
                    <div className="h-full w-full bg-secondary-100" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
                    <div className="flex items-center gap-4 text-white/70 text-xs mb-3">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {featuredPost.author}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(featuredPost.publishedAt)}
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
                      {featuredPost.title}
                    </h2>
                    {featuredPost.excerpt && (
                      <p className="text-white/80 text-sm sm:text-base max-w-2xl line-clamp-2">
                        {featuredPost.excerpt}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-white border-b border-white/50 pb-0.5 group-hover:border-white transition-colors">
                      Devamını Oku <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Other posts - grid */}
            {otherPosts.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {otherPosts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                    <div className="relative overflow-hidden rounded-lg aspect-[16/10] mb-4">
                      {post.featuredImage ? (
                        <Image
                          src={post.featuredImage}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          unoptimized
                        />
                      ) : (
                        <div className="h-full w-full bg-secondary-100" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-secondary-400 mb-2">
                      <span>{post.author}</span>
                      <span>·</span>
                      <span>{formatDate(post.publishedAt)}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-secondary-900 group-hover:text-accent transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-2 text-sm text-secondary-500 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
