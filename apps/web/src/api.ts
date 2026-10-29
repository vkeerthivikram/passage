export type Category = 'books' | 'articles' | 'tweets' | 'podcasts' | 'freeform';
export type Source = { id: string; title: string; author: string | null; category: Category; sourceUrl: string | null; coverUrl: string | null; note: string | null; tags: string[]; weight: number; highlightCount?: number; createdAt: string };
export type Highlight = { id: string; sourceId: string; text: string; note: string | null; tags: string[]; location: string | null; favorite: boolean; discarded: boolean; createdAt: string; source?: Source };
export type Page = { items: Highlight[]; total: number; page: number; limit: number };
export type Settings = { timezone: string; reviewSize: number; reviewFrequency: string; [key: string]: unknown };
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path.startsWith('/api/') ? path : `/api/v1${path}`, { credentials: 'include', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body?.error?.message || body?.message || `Request failed (${response.status})`);
  return body as T;
}
export const post = <T,>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const patch = <T,>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export function list<T>(data: T[] | { items: T[] } | undefined): T[] { return Array.isArray(data) ? data : data?.items || []; }
export const tagsFrom = (value: string) => [...new Set(value.split(',').map(t => t.trim()).filter(Boolean))];
