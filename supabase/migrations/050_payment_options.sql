-- Add payment_options column to tournaments table
-- Stores an array of { method, detail } objects, e.g.:
--   [{"method":"venmo","detail":"@tristarpickleball"},{"method":"cash","detail":""}]

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS payment_options JSONB DEFAULT '[]'::jsonb;
