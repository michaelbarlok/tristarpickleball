-- ============================================================
-- Migration 033: Free Play Sessions
-- ============================================================
-- Adds session-based play for Free Play groups: check-in players,
-- auto-generate rounds with partner rotation, track scores, end session.

-- 1. Stats reset support
ALTER TABLE shootout_groups ADD COLUMN stats_reset_at TIMESTAMPTZ;

-- 2. Sessions table
CREATE TABLE free_play_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES shootout_groups(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  current_round JSONB,
  round_number  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ
);

ALTER TABLE free_play_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view sessions"
  ON free_play_sessions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = free_play_sessions.group_id
        AND gm.player_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Group members can create sessions"
  ON free_play_sessions FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = free_play_sessions.group_id
        AND gm.player_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Group members can update sessions"
  ON free_play_sessions FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = free_play_sessions.group_id
        AND gm.player_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- 3. Session players (checked in for this session)
CREATE TABLE free_play_session_players (
  session_id UUID NOT NULL REFERENCES free_play_sessions(id) ON DELETE CASCADE,
  player_id  UUID NOT NULL REFERENCES profiles(id),
  PRIMARY KEY (session_id, player_id)
);

ALTER TABLE free_play_session_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view session players"
  ON free_play_session_players FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM free_play_sessions s
      JOIN group_memberships gm ON gm.group_id = s.group_id
      WHERE s.id = free_play_session_players.session_id
        AND gm.player_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Group members can manage session players"
  ON free_play_session_players FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM free_play_sessions s
      JOIN group_memberships gm ON gm.group_id = s.group_id
      WHERE s.id = free_play_session_players.session_id
        AND gm.player_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- 4. Add session tracking to matches
ALTER TABLE free_play_matches
  ADD COLUMN session_id UUID REFERENCES free_play_sessions(id) ON DELETE CASCADE,
  ADD COLUMN round_number INTEGER;

-- 5. Recreate stats view to respect stats_reset_at
DROP VIEW IF EXISTS free_play_player_stats;
CREATE VIEW free_play_player_stats AS
SELECT
  group_id,
  player_id,
  COUNT(*) FILTER (WHERE won)     AS wins,
  COUNT(*) FILTER (WHERE NOT won) AS losses,
  SUM(point_diff)                 AS total_point_diff
FROM (
  SELECT m.group_id, m.team_a_p1 AS player_id,
    (m.score_a > m.score_b) AS won,
    (m.score_a - m.score_b) AS point_diff,
    m.played_at
  FROM free_play_matches m
  UNION ALL
  SELECT m.group_id, m.team_a_p2, (m.score_a > m.score_b), (m.score_a - m.score_b), m.played_at
  FROM free_play_matches m WHERE m.team_a_p2 IS NOT NULL
  UNION ALL
  SELECT m.group_id, m.team_b_p1, (m.score_b > m.score_a), (m.score_b - m.score_a), m.played_at
  FROM free_play_matches m
  UNION ALL
  SELECT m.group_id, m.team_b_p2, (m.score_b > m.score_a), (m.score_b - m.score_a), m.played_at
  FROM free_play_matches m WHERE m.team_b_p2 IS NOT NULL
) sub
JOIN shootout_groups g ON g.id = sub.group_id
WHERE sub.player_id IS NOT NULL
  AND (g.stats_reset_at IS NULL OR sub.played_at >= g.stats_reset_at)
GROUP BY group_id, player_id;

-- 6. Indexes
CREATE INDEX idx_free_play_sessions_group_status
  ON free_play_sessions(group_id, status);
