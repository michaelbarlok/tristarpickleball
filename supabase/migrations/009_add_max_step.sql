-- Add max_step column to group_preferences (highest step number = lowest position on ladder)
ALTER TABLE group_preferences ADD COLUMN IF NOT EXISTS max_step INTEGER NOT NULL DEFAULT 99;
