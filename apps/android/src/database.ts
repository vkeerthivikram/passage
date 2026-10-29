import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { Highlight, Operation, Review, Session, Source } from './types';

const open = new Map<string, Promise<SQLite.SQLiteDatabase>>();
export async function database(session: Session) {
  const scope = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${session.server}\n${session.userId}`);
  if (!open.has(scope)) open.set(scope, (async () => {
    const db = await SQLite.openDatabaseAsync(`passage-${scope}.db`);
    await db.execAsync(`PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS highlights (id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, opId TEXT UNIQUE NOT NULL, entityId TEXT NOT NULL, data TEXT NOT NULL, error TEXT);
      CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
    return db;
  })());
  return open.get(scope)!;
}
export async function rows<T>(db: SQLite.SQLiteDatabase, table: 'sources' | 'highlights') {
  return (await db.getAllAsync<{ data: string }>(`SELECT data FROM ${table}`)).map(row => JSON.parse(row.data) as T);
}
export async function put(db: SQLite.SQLiteDatabase, entity: 'source' | 'highlight', value: Source | Highlight) {
  await db.runAsync(`INSERT OR REPLACE INTO ${entity === 'source' ? 'sources' : 'highlights'} (id,data) VALUES (?,?)`, value.id, JSON.stringify(value));
}
export async function queue(db: SQLite.SQLiteDatabase, operation: Omit<Operation, 'opId'>) {
  const op = { ...operation, opId: Crypto.randomUUID() };
  await db.runAsync('INSERT INTO outbox (opId,entityId,data) VALUES (?,?,?)', op.opId, op.id, JSON.stringify(op));
}
export async function capture(session: Session, fields: { sourceId?: string; title: string; author: string; text: string; note: string; tags: string[]; location: string }) {
  if (!fields.text.trim() || !fields.title.trim()) throw new Error('Add a source title and passage text.');
  const db = await database(session);
  let sourceId = fields.sourceId;
  await db.withExclusiveTransactionAsync(async tx => {
    if (!sourceId) {
      const source: Source = { id: Crypto.randomUUID(), title: fields.title.trim(), author: fields.author.trim() || null, type: 'book' };
      sourceId = source.id;
      await put(tx, 'source', source);
      await queue(tx, { entity: 'source', action: 'create', id: source.id, payload: { ...source } });
    }
    const highlight: Highlight = { id: Crypto.randomUUID(), sourceId: sourceId!, text: fields.text.trim(), note: fields.note.trim() || null, tags: fields.tags, location: fields.location.trim() || null, createdAt: new Date().toISOString() };
    await put(tx, 'highlight', highlight);
    await queue(tx, { entity: 'highlight', action: 'create', id: highlight.id, payload: { ...highlight } });
  });
}
export async function editHighlight(session: Session, value: Highlight, remove = false) {
  const db = await database(session);
  await db.withExclusiveTransactionAsync(async tx => {
    if (remove) await tx.runAsync('DELETE FROM highlights WHERE id=?', value.id);
    else await put(tx, 'highlight', value);
    // Explicit server conflict is safer than silently overwriting a concurrent edit.
    await queue(tx, { entity: 'highlight', action: remove ? 'delete' : 'update', id: value.id, payload: { text: value.text, note: value.note, tags: value.tags, location: value.location }, baseRevision: value.revision });
  });
}
export async function cachedReview(session: Session): Promise<Review | null> {
  const row = await (await database(session)).getFirstAsync<{ value: string }>('SELECT value FROM metadata WHERE key=?', 'review');
  return row ? JSON.parse(row.value) as Review : null;
}
