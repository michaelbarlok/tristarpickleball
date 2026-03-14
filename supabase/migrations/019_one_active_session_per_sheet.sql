-- Enforce that only one non-complete session can exist per sign-up sheet.
-- A new session can only be created once the previous one reaches 'session_complete'.
CREATE UNIQUE INDEX idx_one_active_session_per_sheet
  ON shootout_sessions (sheet_id)
  WHERE status <> 'session_complete';
