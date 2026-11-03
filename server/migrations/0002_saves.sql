-- Cloud copy of the local saves, one row per player and slot.
-- data is NULL after a delete: the row stays as a tombstone so a stale device cannot resurrect it.
CREATE TABLE saves (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  slot TEXT NOT NULL,
  data TEXT,
  revision INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, slot)
);
