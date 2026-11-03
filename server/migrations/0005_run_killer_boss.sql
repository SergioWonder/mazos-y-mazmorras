-- Leaderboard tooltips: who killed the hero (defeats) and which final boss fell (victories). Names as shown in game.
ALTER TABLE runs ADD COLUMN killer TEXT;
ALTER TABLE runs ADD COLUMN final_boss TEXT;
