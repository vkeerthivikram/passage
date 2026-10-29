import { api } from './api';
import { database, put } from './database';
import type { Change, Operation, Review, Session } from './types';

const active = new Map<string, Promise<void>>();
export function synchronize(session: Session): Promise<void> {
  const scope = `${session.server}\n${session.userId}`;
  if (active.has(scope)) return active.get(scope)!;
  const job = run(session).finally(() => active.delete(scope));
  active.set(scope, job);
  return job;
}
async function run(session: Session) {
  const db = await database(session);
  // Push one operation at a time: a highlight must never overtake its source.
  for (const row of await db.getAllAsync<{ opId: string; data: string; error: string | null }>('SELECT opId,data,error FROM outbox ORDER BY seq')) {
    if (row.error) throw new Error(`Sync needs attention: ${row.error}. Unsynced capture remains on this device.`);
    const op = JSON.parse(row.data) as Operation;
    const response = await api<{ results: { opId: string; status: string; error?: unknown }[] }>(session, '/sync/push', { method: 'POST', body: JSON.stringify({ operations: [op] }) });
    const result = response.results.find(item => item.opId === op.opId);
    if (!result || !['applied', 'duplicate'].includes(result.status)) {
      const message = typeof result?.error === 'string' ? result.error : JSON.stringify(result?.error ?? result?.status ?? 'Missing acknowledgment');
      await db.runAsync('UPDATE outbox SET error=? WHERE opId=?', message, op.opId);
      throw new Error(`Sync needs attention: ${message}. Local changes preserved.`);
    }
    await db.runAsync('DELETE FROM outbox WHERE opId=?', op.opId);
  }
  let cursor = (await db.getFirstAsync<{ value: string }>('SELECT value FROM metadata WHERE key=?', 'cursor'))?.value ?? '';
  let hasMore = true;
  let pages = 0;
  while (hasMore && pages++ < 100) {
    const page = await api<{ changes: Change[]; cursor: string; hasMore: boolean }>(session, `/sync/pull?cursor=${encodeURIComponent(cursor)}`);
    await db.withExclusiveTransactionAsync(async tx => {
      for (const change of page.changes) {
        // A foreground capture can arrive while the network request is in flight.
        if (await tx.getFirstAsync('SELECT opId FROM outbox WHERE entityId=?', change.id)) continue;
        if (change.deleted) await tx.runAsync(`DELETE FROM ${change.entity === 'source' ? 'sources' : 'highlights'} WHERE id=?`, change.id);
        else if (change.data) await put(tx, change.entity, change.data);
      }
      await tx.runAsync('INSERT OR REPLACE INTO metadata (key,value) VALUES (?,?)', 'cursor', page.cursor);
    });
    cursor = page.cursor;
    hasMore = page.hasMore;
  }
  const review = await api<Review>(session, '/daily-review');
  await db.runAsync('INSERT OR REPLACE INTO metadata (key,value) VALUES (?,?)', 'review', JSON.stringify(review));
}
export async function retrySyncErrors(session: Session) {
  await (await database(session)).runAsync('UPDATE outbox SET error=NULL');
  await synchronize(session);
}
