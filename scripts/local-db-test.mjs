import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importTypeScript } from './load-typescript.mjs';

const { LocalDatabase } = await importTypeScript('db/local-sqlite.ts');
const directory = mkdtempSync(join(tmpdir(), 'house-rules-db-'));
const filename = join(directory, 'test.sqlite');
let db = new LocalDatabase(filename);
try {
  await db.batch([
    db.prepare('CREATE TABLE rooms (id TEXT PRIMARY KEY, version INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE results (id TEXT PRIMARY KEY, room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE)'),
    db.prepare('INSERT INTO rooms VALUES (?, ?)').bind('room', 1),
  ]);
  await assert.rejects(db.batch([
    db.prepare('UPDATE rooms SET version = 2 WHERE id = ?').bind('room'),
    db.prepare('INSERT INTO rooms VALUES (?, ?)').bind('room', 99),
  ]));
  assert.equal((await db.prepare('SELECT version FROM rooms').first()).version, 1, 'Failed batch rolls back previous writes');
  await assert.rejects(db.prepare('INSERT INTO results VALUES (?, ?)').bind('orphan', 'missing').run());
  const record = () => db.batch([
    db.prepare('UPDATE rooms SET version = version + 1 WHERE id = ? AND version = 1').bind('room'),
    db.prepare("INSERT INTO results SELECT 'result', 'room' WHERE changes() = 1"),
  ]);
  const concurrent = await Promise.all([record(), record()]);
  assert.deepEqual(concurrent.map(result => result[0].meta.changes), [1, 0]);
  assert.equal((await db.prepare('SELECT * FROM results').all()).results.length, 1, 'Conditional result saved once');
  db.close();
  db = new LocalDatabase(filename);
  assert.equal((await db.prepare('SELECT version FROM rooms').first()).version, 2, 'State survives connection restart');
  assert.equal((await db.prepare('SELECT * FROM results').all()).results.length, 1, 'Scoreboard survives connection restart');
  await db.prepare('DELETE FROM rooms').run();
  assert.equal((await db.prepare('SELECT * FROM results').all()).results.length, 0, 'Foreign key cascades enabled');
  console.log('Local SQLite: atomic rollback, guarded writes, foreign keys and restart persistence passed.');
} finally {
  db.close();
  rmSync(directory, { recursive: true, force: true });
}
