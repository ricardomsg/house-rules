import { DatabaseSync, backup } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const source = resolve(process.env.DATABASE_PATH || './data/house-rules.sqlite');
const stamp = new Date().toISOString().replaceAll(':', '-');
const destination = resolve(process.argv[2] || `./backups/house-rules-${stamp}.sqlite`);
if (!existsSync(source)) throw new Error(`Database not found: ${source}. Create a room first.`);
if (existsSync(destination)) throw new Error(`Refusing to overwrite: ${destination}`);
mkdirSync(dirname(destination), { recursive: true });
const database = new DatabaseSync(source, { readOnly: true, timeout: 5000 });
try {
  // SQLite's backup API includes committed WAL data while the app is running.
  await backup(database, destination);
  console.log(`Database backup saved: ${destination}`);
} finally {
  database.close();
}
