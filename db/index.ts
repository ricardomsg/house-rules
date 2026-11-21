import { localDatabase, migrationsManaged } from './local-sqlite';

export const getDatabase = localDatabase;

let schemaReady: Promise<void> | null = null;

export function ensureSchema() {
  if (migrationsManaged) return Promise.resolve();
  if (!schemaReady) {
    const database = getDatabase();
    schemaReady = database
      .batch([
        database.prepare(`CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY NOT NULL,
          code TEXT NOT NULL UNIQUE,
          host_player_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'lobby',
          created_at INTEGER NOT NULL
        )`),
        database.prepare(`CREATE TABLE IF NOT EXISTS players (
          id TEXT PRIMARY KEY NOT NULL,
          room_id TEXT NOT NULL,
          name TEXT NOT NULL COLLATE NOCASE,
          avatar_color TEXT NOT NULL,
          session_token TEXT NOT NULL UNIQUE,
          is_host INTEGER NOT NULL DEFAULT 0,
          joined_at INTEGER NOT NULL,
          last_seen INTEGER NOT NULL,
          FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
          UNIQUE (room_id, name)
        )`),
        database.prepare(`CREATE TABLE IF NOT EXISTS seat_requests (
          id TEXT PRIMARY KEY NOT NULL,
          scope TEXT NOT NULL,
          name TEXT NOT NULL,
          player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
          issued_token TEXT NOT NULL
        )`),
        database.prepare(`CREATE TABLE IF NOT EXISTS seat_recoveries (
          id TEXT PRIMARY KEY NOT NULL,
          room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
          player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
          original_token TEXT NOT NULL,
          verification_code TEXT NOT NULL,
          approved_token TEXT,
          rejected INTEGER NOT NULL DEFAULT 0,
          expires_at INTEGER NOT NULL
        )`),
        database.prepare('CREATE INDEX IF NOT EXISTS idx_seat_recoveries_room ON seat_recoveries (room_id, expires_at)'),
        database.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_code ON rooms (code)'),
        database.prepare('CREATE INDEX IF NOT EXISTS idx_players_room_id ON players (room_id)'),
        database.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_players_session_token ON players (session_token)'),
        database.prepare(`CREATE TABLE IF NOT EXISTS game_sessions (
          id TEXT PRIMARY KEY NOT NULL,
          room_id TEXT NOT NULL UNIQUE,
          slug TEXT NOT NULL,
          state_json TEXT NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
        )`),
        database.prepare(`CREATE TABLE IF NOT EXISTS game_submissions (
          id TEXT PRIMARY KEY NOT NULL,
          session_id TEXT NOT NULL,
          round INTEGER NOT NULL,
          player_id TEXT NOT NULL,
          kind TEXT NOT NULL,
          value_json TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
          UNIQUE (session_id, round, player_id, kind)
        )`),
        database.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_game_sessions_room_id ON game_sessions (room_id)'),
        database.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_game_submissions_unique ON game_submissions (session_id, round, player_id, kind)'),
        database.prepare('CREATE INDEX IF NOT EXISTS idx_game_submissions_round ON game_submissions (session_id, round, kind)'),
        database.prepare(`CREATE TABLE IF NOT EXISTS room_results (
          id TEXT PRIMARY KEY NOT NULL,
          room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
          slug TEXT NOT NULL,
          outcome_json TEXT NOT NULL,
          finished_at INTEGER NOT NULL
        )`),
        database.prepare(`CREATE TABLE IF NOT EXISTS room_card_history (room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE, slug TEXT NOT NULL, card_index INTEGER NOT NULL, PRIMARY KEY (room_id, slug, card_index))`),
        database.prepare('CREATE INDEX IF NOT EXISTS idx_room_results_room ON room_results (room_id, finished_at)'),
      ])
      .then(() => undefined)
      .catch((error) => {
        schemaReady = null;
        throw error;
      });
  }
  return schemaReady;
}
