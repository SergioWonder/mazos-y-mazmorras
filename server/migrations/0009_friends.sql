-- Friends: players you have already played a multiplayer game with and saved, to pick them quickly when inviting.
-- One-way: each player keeps their own list.
CREATE TABLE friends (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, friend_id)
);
