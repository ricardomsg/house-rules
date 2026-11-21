import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

type QueryResult<T> = { results: T[]; success: true; meta: { changes: number } };

// Keep prepared statements and batches on one connection: game transitions use
// changes() plus version guards, and an entire batch must commit or roll back.
class LocalStatement {
  private connection: DatabaseSync;
  private sql: string;
  private values: SQLInputValue[];

  constructor(connection: DatabaseSync, sql: string, values: SQLInputValue[] = []) {
    this.connection = connection;
    this.sql = sql;
    this.values = values;
  }

  bind(...values: SQLInputValue[]) {
    return new LocalStatement(this.connection, this.sql, values);
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    return (this.connection.prepare(this.sql).get(...this.values) as T | undefined) ?? null;
  }

  async all<T = Record<string, unknown>>(): Promise<QueryResult<T>> {
    const results = this.connection.prepare(this.sql).all(...this.values) as T[];
    return { results, success: true, meta: { changes: 0 } };
  }

  execute(): QueryResult<never> {
    const result = this.connection.prepare(this.sql).run(...this.values);
    return { results: [], success: true, meta: { changes: Number(result.changes) } };
  }

  async run() { return this.execute(); }
}

export class LocalDatabase {
  private connection: DatabaseSync;

  constructor(filename: string) {
    if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
    this.connection = new DatabaseSync(filename, { timeout: 5000 });
    this.connection.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  }

  prepare(sql: string) { return new LocalStatement(this.connection, sql); }

  async batch(statements: LocalStatement[]) {
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      // No await inside the transaction: unrelated requests cannot interleave.
      const results = statements.map(statement => statement.execute());
      this.connection.exec('COMMIT');
      return results;
    } catch (error) {
      this.connection.exec('ROLLBACK');
      throw error;
    }
  }

  close() { this.connection.close(); }
}

const connections = globalThis as typeof globalThis & { houseRulesDatabase?: LocalDatabase };

export function localDatabase() {
  // Survives development hot reloads; the file survives process/computer restarts.
  return connections.houseRulesDatabase ??= new LocalDatabase(
    resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH || './data/house-rules.sqlite'),
  );
}

export const migrationsManaged = false;
