CREATE TABLE IF NOT EXISTS room_card_history (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  card_index INTEGER NOT NULL,
  PRIMARY KEY (room_id, slug, card_index)
);
