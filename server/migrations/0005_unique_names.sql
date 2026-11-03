-- Display names are unique, ignoring case (names are stored trimmed). Production has a single name
-- («Morghur»), so the index cannot clash with existing data. NULL names (not chosen yet) are exempt.
CREATE UNIQUE INDEX idx_users_display_name ON users (lower(display_name)) WHERE display_name IS NOT NULL;
