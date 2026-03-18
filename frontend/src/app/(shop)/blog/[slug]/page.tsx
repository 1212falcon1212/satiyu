import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { CalendarDays, User, ArrowLeft } from 'lucide-react';
import { fetchApi } from '@/lib/api-server';
import type { BlogPost } from '@/types/api';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  const res = await fetchApi<{ data: BlogPost }>(`/blog/${slug}`, {
    revalidate: 300,
    tags: ['blog', `blog-${slug}`],
  });
  return res.data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await getPost(slug);
    return {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt || undefined,
      openGraph: {
        title: post.title,
        description: post.excerpt || undefined,
        type: 'article',
        ...(post.featuredImage && { images: [{ url: post.featuredImage }] }),
      },
    };
  } catch {
    return { title: 'Blog Yazısı' };
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

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  let post: BlogPost;
  try {
    post = await getPost(slug);
  } catch {
    notFound();
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Featured image */}
      {post.featuredImage && (
        <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[480px]">
          <Image
            src={post.featuredImage}
            alt={post.title}
            fill
            className="object-cover"
            sizes="100vw"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}

      <div className="container-main py-10">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-secondary-500 hover:text-accent transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Blog&apos;a Dön
        </Link>

        <article className="mx-auto max-w-3xl">
          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-secondary-400 mb-4">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {formatDate(post.publishedAt)}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-secondary-900 mb-6">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-lg text-secondary-600 mb-8 border-l-4 border-accent pl-4">
              {post.excerpt}
            </p>
          )}

          {/* Content */}
          {post.content && (
            <div
              className="prose prose-lg max-w-none prose-headings:text-secondary-900 prose-p:text-secondary-600 prose-a:text-accent hover:prose-a:text-accent-700 prose-img:rounded-lg"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          )}
        </article>
      </div>
    </div>
  );
}
