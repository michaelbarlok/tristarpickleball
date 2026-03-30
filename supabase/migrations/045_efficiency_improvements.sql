-- ============================================================
-- 045: Efficiency improvements
-- Batch waitlist reorder RPCs and missing indexes
-- ============================================================

-- ============================================================
-- 1. Missing indexes
-- ============================================================

-- forum_threads: badge query for post count
CREATE INDEX IF NOT EXISTS idx_forum_threads_author
  ON forum_threads (author_id);

-- free_play_matches: active-session queries
CREATE INDEX IF NOT EXISTS idx_free_play_matches_group_status
  ON free_play_matches (group_id, status);

-- ============================================================
-- 2. Batch reorder functions (replace sequential per-row updates)
-- ============================================================

-- Reorder tournament waitlist in a single UPDATE instead of
-- one UPDATE per row in application code.
CREATE OR REPLACE FUNCTION reorder_tournament_waitlist(
  p_tournament_id uuid,
  p_division text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE tournament_registrations tr
  SET waitlist_position = sub.new_pos
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY waitlist_position NULLS LAST) AS new_pos
    FROM tournament_registrations
    WHERE tournament_id = p_tournament_id
      AND status = 'waitlist'
      AND (p_division IS NULL OR division = p_division)
  ) sub
  WHERE tr.id = sub.id;
$$;

-- Reorder sheet waitlist in a single UPDATE instead of
-- one UPDATE per row in application code.
CREATE OR REPLACE FUNCTION reorder_sheet_waitlist(
  p_sheet_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE registrations r
  SET waitlist_position = sub.new_pos
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY waitlist_position NULLS LAST) AS new_pos
    FROM registrations
    WHERE sheet_id = p_sheet_id
      AND status = 'waitlist'
  ) sub
  WHERE r.id = sub.id;
$$;
