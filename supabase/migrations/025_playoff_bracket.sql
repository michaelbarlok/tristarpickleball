-- ============================================================
-- Migration 025: Add 'playoff' bracket type for round robin playoffs
-- Round robin tournaments use pool play → playoff bracket with 3rd place game
-- ============================================================

ALTER TABLE tournament_matches DROP CONSTRAINT IF EXISTS tournament_matches_bracket_check;

ALTER TABLE tournament_matches ADD CONSTRAINT tournament_matches_bracket_check
  CHECK (bracket IN ('winners', 'losers', 'grand_final', 'playoff'));
