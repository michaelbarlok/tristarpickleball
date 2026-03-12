-- Fix sign_up_for_sheet to handle re-signups after withdrawal
-- The unique constraint (sheet_id, player_id) causes failures when
-- a player withdraws and tries to sign up again.
CREATE OR REPLACE FUNCTION sign_up_for_sheet(p_sheet_id UUID, p_player_id UUID)
RETURNS registrations AS $$
DECLARE
  v_sheet signup_sheets;
  v_confirmed_count INTEGER;
  v_registration registrations;
  v_existing registrations;
  v_status TEXT;
  v_waitlist_pos INTEGER;
BEGIN
  SELECT * INTO v_sheet FROM signup_sheets WHERE id = p_sheet_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sheet not found';
  END IF;

  IF v_sheet.status != 'open' THEN
    RAISE EXCEPTION 'Sheet is not open for sign-ups';
  END IF;

  IF NOW() > v_sheet.signup_closes_at THEN
    RAISE EXCEPTION 'Sign-up cutoff has passed';
  END IF;

  -- Check if player already has a registration for this sheet
  SELECT * INTO v_existing FROM registrations
  WHERE sheet_id = p_sheet_id AND player_id = p_player_id;

  IF FOUND THEN
    -- If already confirmed or waitlisted, nothing to do
    IF v_existing.status IN ('confirmed', 'waitlist') THEN
      RETURN v_existing;
    END IF;
    -- If withdrawn, we'll update the existing row instead of inserting
  END IF;

  SELECT COUNT(*) INTO v_confirmed_count
  FROM registrations
  WHERE sheet_id = p_sheet_id AND status = 'confirmed';

  IF v_confirmed_count < v_sheet.player_limit THEN
    v_status := 'confirmed';
    v_waitlist_pos := NULL;
  ELSE
    v_status := 'waitlist';
    SELECT COALESCE(MAX(waitlist_position), 0) + 1 INTO v_waitlist_pos
    FROM registrations
    WHERE sheet_id = p_sheet_id AND status = 'waitlist';
  END IF;

  IF FOUND AND v_existing.status = 'withdrawn' THEN
    -- Re-activate withdrawn registration
    UPDATE registrations
    SET status = v_status,
        waitlist_position = v_waitlist_pos,
        signed_up_at = NOW()
    WHERE id = v_existing.id
    RETURNING * INTO v_registration;
  ELSE
    INSERT INTO registrations (sheet_id, player_id, status, waitlist_position)
    VALUES (p_sheet_id, p_player_id, v_status, v_waitlist_pos)
    RETURNING * INTO v_registration;
  END IF;

  RETURN v_registration;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
