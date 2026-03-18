import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchApi } from '@/lib/api-server';
import type { Page } from '@/types/api';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPage(slug: string): Promise<Page | null> {
  try {
    const res = await fetchApi<{ data: Page }>(`/pages/${slug}`, {
      revalidate: 300,
      tags: ['pages', slug],
    });
    return res.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: 'Sayfa Bulunamadi' };
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
  };
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPage(slug);

  if (!page) {
    notFound();
  }

  return (
    <div className="container-main py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-secondary-900">{page.title}</h1>
        <div
          className="mt-6 prose prose-stone max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </div>
  );
}
