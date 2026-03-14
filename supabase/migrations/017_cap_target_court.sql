-- ============================================================
-- Migration 017: Cap target_court_next at session num_courts
-- Prevents last-place finishers on the lowest court from being
-- assigned to a non-existent court number.
-- ============================================================

CREATE OR REPLACE FUNCTION compute_target_courts(p_session_id UUID)
RETURNS VOID AS $$
DECLARE
  v_participant RECORD;
  v_num_courts INTEGER;
  v_target INTEGER;
BEGIN
  -- Look up how many courts this session uses
  SELECT num_courts INTO v_num_courts
  FROM shootout_sessions WHERE id = p_session_id;

  FOR v_participant IN
    SELECT sp.*,
      (SELECT COUNT(*) FROM session_participants sp2
       WHERE sp2.session_id = p_session_id AND sp2.court_number = sp.court_number) AS pool_size
    FROM session_participants sp
    WHERE sp.session_id = p_session_id
      AND sp.pool_finish IS NOT NULL
  LOOP
    -- 1st place: move up (lower court = harder)
    IF v_participant.pool_finish = 1 THEN
      v_target := v_participant.court_number - 1;
    -- Last place: move down
    ELSIF v_participant.pool_finish = v_participant.pool_size THEN
      v_target := v_participant.court_number + 1;
    -- Middle: stay
    ELSE
      v_target := v_participant.court_number;
    END IF;

    -- Clamp between 1 and num_courts
    v_target := LEAST(v_num_courts, GREATEST(1, v_target));

    UPDATE session_participants
    SET target_court_next = v_target
    WHERE id = v_participant.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
