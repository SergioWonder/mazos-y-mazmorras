-- Multiplayer games: the host plays `cara`, the guest plays `cruz`. A NULL guest is the debugging bot.
CREATE TABLE multi_games (
  id TEXT PRIMARY KEY,
  host_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  guest_user_id TEXT REFERENCES users (id) ON DELETE CASCADE,
  host_class TEXT NOT NULL,
  guest_class TEXT,
  status TEXT NOT NULL CHECK (status IN ('invited', 'declined', 'active', 'finished')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_multi_games_host ON multi_games (host_user_id, status);
CREATE INDEX idx_multi_games_guest ON multi_games (guest_user_id, status);
-- One pending invitation per host/guest pair (also closes the race between two concurrent invites).
CREATE UNIQUE INDEX idx_multi_games_pending ON multi_games (host_user_id, guest_user_id) WHERE status = 'invited';

-- Web Push subscriptions (one per browser/device endpoint).
CREATE TABLE push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions (user_id);
