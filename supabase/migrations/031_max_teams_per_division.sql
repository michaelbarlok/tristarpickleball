-- Add per-division team cap to tournaments
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS max_teams_per_division INTEGER DEFAULT NULL;

COMMENT ON COLUMN tournaments.max_teams_per_division IS 'Maximum number of teams/players allowed per division. NULL means unlimited.';
