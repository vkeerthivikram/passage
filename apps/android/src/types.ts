export interface Session { server: string; token: string; userId: string; email: string }
export interface Source { id: string; title: string; author?: string | null; type?: string; revision?: number }
export interface Highlight { id: string; sourceId: string; text: string; note?: string | null; tags: string[]; location?: string | null; revision?: number; createdAt?: string }
export interface Operation { opId: string; entity: 'source' | 'highlight'; action: 'create' | 'update' | 'delete'; id: string; payload: Record<string, unknown>; baseRevision?: number }
export interface Review { date: string; cards: Highlight[]; completed: number; streak: number }
export interface Change { entity: 'source' | 'highlight'; id: string; deleted?: boolean; data: Source | Highlight | null }
