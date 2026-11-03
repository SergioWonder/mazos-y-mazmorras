-- Finished multiplayer games for the duo leaderboard. The Sala records them itself when the game ends (bot games are
-- never recorded). The id is the game's id, so recording twice is harmless.
CREATE TABLE duo_runs (
  id TEXT PRIMARY KEY,
  host_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  guest_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  host_class TEXT NOT NULL,
  guest_class TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('victory', 'defeat')),
  dm_defeated INTEGER NOT NULL DEFAULT 0,
  chapter INTEGER NOT NULL,
  floor INTEGER NOT NULL,
  turns INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_duo_runs_users ON duo_runs (host_user_id, guest_user_id);
CREATE INDEX idx_duo_runs_leaderboard ON duo_runs (result, chapter, floor, turns);
