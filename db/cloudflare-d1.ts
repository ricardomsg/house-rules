import { env } from 'cloudflare:workers';
import type { localDatabase as sqliteDatabase } from './local-sqlite';

// Vite swaps this adapter into the hosted build. The local Next server keeps SQLite.
export const migrationsManaged = true;
export function localDatabase(): ReturnType<typeof sqliteDatabase> {
  if (!env.DB) throw new Error('Cloudflare D1 binding DB is unavailable.');
  return env.DB as unknown as ReturnType<typeof sqliteDatabase>;
}
