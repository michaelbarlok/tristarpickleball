-- ============================================================
-- 016: Profile External IDs (DUPR & USA Pickleball)
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN dupr_id TEXT,
  ADD COLUMN dupr_singles_rating NUMERIC(4,2),
  ADD COLUMN dupr_doubles_rating NUMERIC(4,2),
  ADD COLUMN usap_member_id TEXT,
  ADD COLUMN usap_tier TEXT,
  ADD COLUMN usap_expiration DATE;
