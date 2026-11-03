-- The Dungeon Master fell (true ending): ranks above any other victory.
ALTER TABLE runs ADD COLUMN dm_defeated INTEGER NOT NULL DEFAULT 0;
