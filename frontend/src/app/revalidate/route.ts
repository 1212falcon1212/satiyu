import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || 'giyim-revalidate-2024';

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const secret = searchParams.get('secret');

  if (secret !== REVALIDATE_SECRET) {
    return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const tags: string[] = body.tags ?? ['products'];

    for (const tag of tags) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (revalidateTag as any)(tag);
    }

    return NextResponse.json({ revalidated: true, tags });
  } catch {
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}
