const REVALIDATE_SECRET = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'giyim-revalidate-2024';

export async function revalidateCache(tags: string[] = ['products']) {
  try {
    await fetch(`/revalidate?secret=${REVALIDATE_SECRET}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
  } catch {
    // Silently fail — cache will expire naturally
  }
}
