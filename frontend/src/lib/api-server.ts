const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface FetchOptions extends RequestInit {
  revalidate?: number | false;
  tags?: string[];
}

export async function fetchApi<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { revalidate, tags, ...fetchOptions } = options;

  const url = `${API_URL}${path}`;

  const nextOptions: NextFetchRequestConfig = {};
  if (revalidate !== undefined) {
    nextOptions.revalidate = revalidate;
  }
  if (tags?.length) {
    nextOptions.tags = tags;
  }

  const res = await fetch(url, {
    ...fetchOptions,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    next: nextOptions,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText} [${path}]`);
  }

  return res.json();
}
