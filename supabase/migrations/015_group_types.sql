-- ============================================================
-- 015: Group Types (Free Play & Ladder League)
-- ============================================================

-- 1. Enum for group types
CREATE TYPE group_type_enum AS ENUM ('ladder_league', 'free_play');

-- 2. Add group_type column (default ladder_league so existing groups keep working)
ALTER TABLE shootout_groups
  ADD COLUMN group_type group_type_enum NOT NULL DEFAULT 'ladder_league';

-- 3. Free Play matches table
CREATE TABLE free_play_matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES shootout_groups(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  played_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  team_a_p1     UUID NOT NULL REFERENCES profiles(id),
  team_a_p2     UUID REFERENCES profiles(id),
  team_b_p1     UUID NOT NULL REFERENCES profiles(id),
  team_b_p2     UUID REFERENCES profiles(id),
  score_a       INTEGER NOT NULL,
  score_b       INTEGER NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. View: per-player stats for Free Play groups
CREATE OR REPLACE VIEW free_play_player_stats AS
SELECT
  group_id,
  player_id,
  COUNT(*) FILTER (WHERE won)        AS wins,
  COUNT(*) FILTER (WHERE NOT won)    AS losses,
  SUM(point_diff)                    AS total_point_diff
FROM (
  SELECT group_id, team_a_p1 AS player_id,
    (score_a > score_b) AS won,
    (score_a - score_b) AS point_diff
  FROM free_play_matches
  UNION ALL
  SELECT group_id, team_a_p2, (score_a > score_b), (score_a - score_b)
  FROM free_play_matches WHERE team_a_p2 IS NOT NULL
  UNION ALL
  SELECT group_id, team_b_p1, (score_b > score_a), (score_b - score_a)
  FROM free_play_matches
  UNION ALL
  SELECT group_id, team_b_p2, (score_b > score_a), (score_b - score_a)
  FROM free_play_matches WHERE team_b_p2 IS NOT NULL
) sub
GROUP BY group_id, player_id;

-- 5. RLS for free_play_matches
ALTER TABLE free_play_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view free play matches"
  ON free_play_matches FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_memberships gm
    WHERE gm.group_id = free_play_matches.group_id
      AND gm.player_id = auth.uid()
  ));

CREATE POLICY "Group members can create free play matches"
  ON free_play_matches FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = free_play_matches.group_id
        AND gm.player_id = auth.uid()
    )
  );

-- 6. Indexes
CREATE INDEX idx_free_play_matches_group ON free_play_matches(group_id);
CREATE INDEX idx_free_play_matches_played_at ON free_play_matches(group_id, played_at DESC);
