-- ============================================================
-- Migration 036: Fix free_play_matches RLS policies
-- ============================================================
-- The policies were comparing profile IDs (created_by, player_id)
-- directly to auth.uid() (auth user ID). Must join through profiles
-- to get the correct comparison.

DROP POLICY IF EXISTS "Group members can create free play matches" ON free_play_matches;
DROP POLICY IF EXISTS "Group members can view free play matches" ON free_play_matches;

CREATE POLICY "Group members can view free play matches"
  ON free_play_matches FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      JOIN profiles p ON p.id = gm.player_id
      WHERE gm.group_id = free_play_matches.group_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create free play matches"
  ON free_play_matches FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      JOIN profiles p ON p.id = gm.player_id
      WHERE gm.group_id = free_play_matches.group_id
        AND p.user_id = auth.uid()
    )
  );
