import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const rooms = sqliteTable(
  'rooms',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    hostPlayerId: text('host_player_id').notNull(),
    status: text('status').notNull().default('lobby'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [uniqueIndex('idx_rooms_code').on(table.code)],
);

export const players = sqliteTable(
  'players',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id').notNull(),
    name: text('name').notNull(),
    avatarColor: text('avatar_color').notNull(),
    sessionToken: text('session_token').notNull(),
    isHost: integer('is_host', { mode: 'boolean' }).notNull().default(false),
    joinedAt: integer('joined_at').notNull(),
    lastSeen: integer('last_seen').notNull(),
  },
  (table) => [
    uniqueIndex('idx_players_session_token').on(table.sessionToken),
    uniqueIndex('idx_players_room_name').on(table.roomId, table.name),
  ],
);

export const gameSessions = sqliteTable(
  'game_sessions',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id').notNull(),
    slug: text('slug').notNull(),
    stateJson: text('state_json').notNull(),
    version: integer('version').notNull().default(1),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [uniqueIndex('idx_game_sessions_room_id').on(table.roomId)],
);

export const gameSubmissions = sqliteTable(
  'game_submissions',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull(),
    round: integer('round').notNull(),
    playerId: text('player_id').notNull(),
    kind: text('kind').notNull(),
    valueJson: text('value_json').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [uniqueIndex('idx_game_submissions_unique').on(table.sessionId, table.round, table.playerId, table.kind)],
);

export const roomResults = sqliteTable('room_results', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  outcomeJson: text('outcome_json').notNull(),
  finishedAt: integer('finished_at').notNull(),
}, (table) => [index('idx_room_results_room').on(table.roomId, table.finishedAt)]);

export const seatRequests = sqliteTable('seat_requests', {
  id: text('id').primaryKey(),
  scope: text('scope').notNull(),
  name: text('name').notNull(),
  playerId: text('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
  issuedToken: text('issued_token').notNull(),
});

export const seatRecoveries = sqliteTable('seat_recoveries', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  playerId: text('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
  originalToken: text('original_token').notNull(),
  verificationCode: text('verification_code').notNull(),
  approvedToken: text('approved_token'),
  rejected: integer('rejected').notNull().default(0),
  expiresAt: integer('expires_at').notNull(),
}, table => [index('idx_seat_recoveries_room').on(table.roomId, table.expiresAt)]);

export const roomCardHistory = sqliteTable('room_card_history', {
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  cardIndex: integer('card_index').notNull(),
}, table => [primaryKey({ columns: [table.roomId, table.slug, table.cardIndex] })]);
