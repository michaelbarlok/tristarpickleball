-- ============================================================
-- Migration 032: Group Invite Tokens
-- ============================================================
-- Members can generate shareable invite links for their groups.
-- Private groups can be accessed/joined by non-members who hold a valid token.

CREATE TABLE group_invites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES shootout_groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token      UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated) can look up an invite by token.
-- This is necessary so non-members/guests can follow an invite link.
CREATE POLICY "Anyone can read group invites"
  ON group_invites FOR SELECT USING (true);

-- Only group members can create invite tokens.
CREATE POLICY "Group members can create invites"
  ON group_invites FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_invites.group_id
        AND gm.player_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );
