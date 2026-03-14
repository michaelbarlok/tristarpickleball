-- ============================================================
-- Migration 024: Allow organizers (creators) to delete tournaments in any status
-- Previously only draft tournaments could be deleted by creators.
-- Admins could always delete any tournament.
-- ============================================================

DROP POLICY IF EXISTS "Delete tournaments" ON tournaments;

CREATE POLICY "Delete tournaments"
  ON tournaments FOR DELETE USING (
    created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
