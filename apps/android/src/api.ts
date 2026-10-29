import type { Session } from './types';
export async function api<T>(session: Session, path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(`${session.server}/api/v1${path}`, {
      ...init, credentials: 'omit', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}`, ...init.headers }
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(response.status === 401 ? 'Session expired. Sign out and sign in again; unsynced captures stay on this device.' : error.error?.message ?? error.message ?? `Server returned ${response.status}`);
    }
    return await response.json() as T;
  } finally { clearTimeout(timeout); }
}
