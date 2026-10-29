-- ============================================================================
-- CleanVillage - Corrective Migration: Green Points & Resolution Reward Fix
-- Migration: 20261029000002_fix_green_points_resolution_rewards.sql
-- ============================================================================
-- Purpose:
-- 1. Fixes the idempotency-key collision between "verified" and "resolved"
--    stages in `public.transition_complaint_status()`:
--      - "verified" awards +10 Green Points with key `gp:complaint_verified:<id>`
--        and reason `Verified Sanitation Complaint (<id>)`.
--      - "resolved" awards +10 Green Points with key `gp:complaint_resolved:<id>`
--        and reason `Resolved Sanitation Complaint (<id>)`.
-- 2. Preserves strict anti-duplicate protection: if a complaint is resolved,
--    reopened, and resolved again, `gp:complaint_resolved:<id>` prevents
--    awarding duplicate resolution points.
-- 3. Ensures the "Green Points Credited!" notification is inserted ONLY when
--    the profile balance update and transaction ledger insert actually succeed.
-- 4. Adds an idempotent AFTER UPDATE OF status trigger on `public.complaints`
--    using the exact same idempotency keys so that even direct authority table
--    updates credit Green Points and send the reward notification safely.
-- 5. Ensures function execution privileges and Realtime replica identity are
--    configured without weakening Row Level Security (RLS).
-- ============================================================================

-- 1. Ensure `public.award_green_points_atomic` only inserts the reward
--    notification when a new credit transaction is actually committed.
CREATE OR REPLACE FUNCTION public.award_green_points_atomic(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_complaint_id TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS public.green_points_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_final_key TEXT;
  v_existing_tx public.green_points_transactions;
  v_new_balance INTEGER;
  v_new_tx public.green_points_transactions;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Recipient user ID is required to credit Green Points.';
  END IF;

  IF p_points IS NULL OR p_points <= 0 THEN
    RAISE EXCEPTION 'Points to credit must be greater than zero.';
  END IF;

  v_caller_role := public.get_my_role();
  IF v_caller_role IS DISTINCT FROM 'authority' AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Only an authorized administrator or trusted backend operation can credit Green Points.';
  END IF;

  v_final_key := COALESCE(
    NULLIF(TRIM(p_idempotency_key), ''),
    'gp:' || p_user_id::text || ':' || COALESCE(p_complaint_id, 'manual') || ':' || md5(p_reason)
  );

  -- Check if already processed (idempotent duplicate-award protection).
  -- If found, return existing transaction WITHOUT updating balance or inserting a duplicate notification.
  SELECT * INTO v_existing_tx
  FROM public.green_points_transactions
  WHERE idempotency_key = v_final_key;

  IF FOUND THEN
    RETURN v_existing_tx;
  END IF;

  -- Atomically increment citizen profile balance and retrieve the updated balance
  UPDATE public.profiles
  SET
    green_points = green_points + p_points,
    total_points_earned = total_points_earned + p_points,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING green_points INTO v_new_balance;

  IF NOT FOUND OR v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Recipient user profile (%) not found; Green Points were not credited.', p_user_id;
  END IF;

  -- Insert the ledger transaction record
  INSERT INTO public.green_points_transactions (
    user_id,
    complaint_id,
    transaction_type,
    points_amount,
    balance_after,
    reason,
    idempotency_key,
    authorized_by_user_id
  )
  VALUES (
    p_user_id,
    p_complaint_id,
    'credit',
    p_points,
    v_new_balance,
    p_reason,
    v_final_key,
    auth.uid()
  )
  RETURNING * INTO v_new_tx;

  IF v_new_tx.id IS NULL THEN
    RAISE EXCEPTION 'Failed to record Green Points transaction for %.', p_user_id;
  END IF;

  -- Insert persistent reward notification ONLY after both profile update and transaction insert succeed
  INSERT INTO public.notifications (
    recipient_user_id,
    title,
    message,
    type,
    related_complaint_id,
    related_transaction_id,
    idempotency_key,
    metadata
  )
  VALUES (
    p_user_id,
    'Green Points Credited!',
    'Green Points have been credited to your account. You received ' || p_points || ' points for ' || p_reason || '. Your updated balance is ' || v_new_balance || ' points.',
    'green_points',
    p_complaint_id,
    v_new_tx.id,
    'notif:gp_credit:' || v_final_key,
    jsonb_build_object(
      'link', '/citizen/rewards',
      'points_credited', p_points,
      'updated_balance', v_new_balance,
      'reason', p_reason,
      'complaint_id', p_complaint_id
    )
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN v_new_tx;
END;
$$;

-- 2. Update `public.transition_complaint_status` so "verified" and "resolved"
--    use distinct, non-colliding idempotency keys and reasons (+10 pts each).
CREATE OR REPLACE FUNCTION public.transition_complaint_status(
  p_complaint_id TEXT,
  p_new_status TEXT,
  p_public_message TEXT DEFAULT '',
  p_internal_note TEXT DEFAULT NULL,
  p_assigned_team TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL,
  p_resolution_photo_url TEXT DEFAULT NULL
)
RETURNS public.complaints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_name TEXT;
  v_complaint public.complaints;
  v_old_status TEXT;
  v_valid_transition BOOLEAN := false;
  v_notif_title TEXT;
  v_notif_message TEXT;
  v_public_note TEXT;
  v_history_id UUID;
BEGIN
  SELECT role, full_name INTO v_caller_role, v_caller_name
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'authority' AND v_caller_role IS DISTINCT FROM 'worker' THEN
    RAISE EXCEPTION 'Unauthorized: Citizens cannot directly change complaint lifecycle statuses.';
  END IF;

  SELECT * INTO v_complaint
  FROM public.complaints
  WHERE id = p_complaint_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complaint % not found.', p_complaint_id;
  END IF;

  v_old_status := v_complaint.status;

  IF v_old_status = p_new_status THEN
    RETURN v_complaint;
  END IF;

  -- Workers can only move assigned complaints to in_progress
  IF v_caller_role = 'worker' THEN
    IF v_complaint.assigned_worker_id IS DISTINCT FROM auth.uid() OR p_new_status <> 'in_progress' THEN
      RAISE EXCEPTION 'Workers may only mark their own assigned complaints as in_progress.';
    END IF;
  END IF;

  -- Validate permitted status transitions
  IF v_old_status = 'submitted' AND p_new_status IN ('under_review', 'verified', 'rejected') THEN
    v_valid_transition := true;
  ELSIF v_old_status = 'under_review' AND p_new_status IN ('verified', 'worker_assigned', 'rejected') THEN
    v_valid_transition := true;
  ELSIF v_old_status = 'verified' AND p_new_status IN ('worker_assigned', 'in_progress', 'resolved', 'rejected') THEN
    v_valid_transition := true;
  ELSIF v_old_status = 'worker_assigned' AND p_new_status IN ('in_progress', 'resolved') THEN
    v_valid_transition := true;
  ELSIF v_old_status = 'in_progress' AND p_new_status IN ('resolved') THEN
    v_valid_transition := true;
  ELSIF v_old_status = 'resolved' AND p_new_status IN ('reopened') THEN
    v_valid_transition := true;
  ELSIF v_old_status = 'rejected' AND p_new_status IN ('reopened', 'under_review', 'verified') THEN
    v_valid_transition := true;
  ELSIF v_old_status = 'reopened' AND p_new_status IN ('under_review', 'verified', 'worker_assigned', 'in_progress', 'resolved', 'rejected') THEN
    v_valid_transition := true;
  END IF;

  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'Invalid status transition from "%" to "%".', v_old_status, p_new_status;
  END IF;

  IF p_new_status = 'rejected' AND COALESCE(TRIM(p_rejection_reason), TRIM(p_public_message), '') = '' THEN
    RAISE EXCEPTION 'A rejection explanation is required when marking a complaint as Not Approved.';
  END IF;

  -- Build readable public update message (never includes p_internal_note)
  v_public_note := COALESCE(
    NULLIF(TRIM(p_public_message), ''),
    CASE p_new_status
      WHEN 'under_review' THEN 'Your complaint is now under verification by the CleanVillage team.'
      WHEN 'verified' THEN 'Complaint verified by the sanitation authority.'
      WHEN 'worker_assigned' THEN 'Sanitation worker/team (' || COALESCE(NULLIF(TRIM(p_assigned_team), ''), 'Sanitation Squad') || ') assigned.'
      WHEN 'in_progress' THEN 'Cleaning work has started at the reported location.'
      WHEN 'resolved' THEN 'Sanitation issue has been cleaned and marked as resolved.'
      WHEN 'reopened' THEN 'Complaint has been reopened for further attention.'
      WHEN 'rejected' THEN 'Complaint could not be approved: ' || COALESCE(NULLIF(TRIM(p_rejection_reason), ''), 'See review explanation.')
      ELSE 'Status updated to ' || p_new_status
    END
  );

  -- Update complaint record
  UPDATE public.complaints
  SET
    status = p_new_status,
    assigned_team = COALESCE(NULLIF(TRIM(p_assigned_team), ''), assigned_team),
    authority_remarks = CASE
      WHEN NULLIF(TRIM(p_public_message), '') IS NOT NULL THEN TRIM(p_public_message)
      ELSE authority_remarks
    END,
    rejection_reason = CASE
      WHEN p_new_status = 'rejected' THEN COALESCE(NULLIF(TRIM(p_rejection_reason), ''), TRIM(p_public_message))
      ELSE rejection_reason
    END,
    resolution_photo_url = COALESCE(NULLIF(TRIM(p_resolution_photo_url), ''), resolution_photo_url),
    points_awarded = CASE
      WHEN p_new_status IN ('verified', 'resolved') THEN true
      ELSE points_awarded
    END,
    resolved_at = CASE
      WHEN p_new_status = 'resolved' THEN now()
      ELSE resolved_at
    END,
    updated_at = now()
  WHERE id = p_complaint_id
  RETURNING * INTO v_complaint;

  -- Insert complaint history entry (separating public_update_message and internal_admin_note)
  INSERT INTO public.complaint_history (
    complaint_id,
    previous_status,
    new_status,
    updated_by_user_id,
    actor_role,
    actor_name,
    public_update_message,
    internal_admin_note
  )
  VALUES (
    p_complaint_id,
    v_old_status,
    p_new_status,
    auth.uid(),
    v_caller_role,
    COALESCE(v_caller_name, 'Sanitation Authority'),
    v_public_note,
    NULLIF(TRIM(p_internal_note), '')
  )
  RETURNING id INTO v_history_id;

  -- Build citizen status notification
  CASE p_new_status
    WHEN 'under_review' THEN
      v_notif_title := 'Complaint Under Verification';
      v_notif_message := 'Your complaint ' || p_complaint_id || ' is being reviewed by the CleanVillage team.';
    WHEN 'verified' THEN
      v_notif_title := 'Complaint Verified';
      v_notif_message := 'Your complaint ' || p_complaint_id || ' has been verified. The next steps will be updated as work progresses.';
    WHEN 'worker_assigned' THEN
      v_notif_title := 'Cleaning Team Assigned';
      v_notif_message := 'A sanitation worker has been assigned to your complaint ' || p_complaint_id || '.';
    WHEN 'in_progress' THEN
      v_notif_title := 'Cleaning Work Started';
      v_notif_message := 'Work on your reported sanitation issue ' || p_complaint_id || ' is now in progress.';
    WHEN 'resolved' THEN
      v_notif_title := 'Complaint Resolved';
      v_notif_message := 'The sanitation issue you reported under complaint ' || p_complaint_id || ' has been marked as resolved. Please review the latest status in your CleanVillage account.';
    WHEN 'reopened' THEN
      v_notif_title := 'Complaint Reopened';
      v_notif_message := 'Your complaint ' || p_complaint_id || ' has been reopened for further attention.';
    WHEN 'rejected' THEN
      v_notif_title := 'Complaint Update';
      v_notif_message := 'Your complaint ' || p_complaint_id || ' could not be approved at this stage. Please check the complaint details for the review explanation, if available.';
    ELSE
      v_notif_title := 'Complaint Status Updated';
      v_notif_message := 'Your complaint ' || p_complaint_id || ' status is now ' || p_new_status || '.';
  END CASE;

  INSERT INTO public.notifications (
    recipient_user_id,
    title,
    message,
    type,
    related_complaint_id,
    idempotency_key,
    metadata
  )
  VALUES (
    v_complaint.citizen_user_id,
    v_notif_title,
    v_notif_message,
    'complaint_status',
    p_complaint_id,
    'notif:status:' || p_complaint_id || ':' || v_history_id::text,
    jsonb_build_object(
      'link', '/citizen/complaints/' || p_complaint_id,
      'complaint_id', p_complaint_id,
      'previous_status', v_old_status,
      'new_status', p_new_status
    )
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  -- Award +10 Green Points on Verified AND +10 Green Points on Resolved,
  -- using stage-specific idempotency keys so verification never suppresses resolution.
  IF p_new_status = 'verified' THEN
    PERFORM public.award_green_points_atomic(
      v_complaint.citizen_user_id,
      10,
      'Verified Sanitation Complaint (' || p_complaint_id || ')',
      p_complaint_id,
      'gp:complaint_verified:' || p_complaint_id
    );
  ELSIF p_new_status = 'resolved' THEN
    PERFORM public.award_green_points_atomic(
      v_complaint.citizen_user_id,
      10,
      'Resolved Sanitation Complaint (' || p_complaint_id || ')',
      p_complaint_id,
      'gp:complaint_resolved:' || p_complaint_id
    );
  END IF;

  RETURN v_complaint;
END;
$$;

-- 3. Add an idempotent AFTER UPDATE OF status trigger on `public.complaints`
--    so that even if a complaint status is updated to 'verified' or 'resolved'
--    directly on `public.complaints`, the stage-specific Green Points reward
--    and notification are still atomically credited once.
CREATE OR REPLACE FUNCTION public.handle_complaint_status_reward_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'verified' THEN
      PERFORM public.award_green_points_atomic(
        NEW.citizen_user_id,
        10,
        'Verified Sanitation Complaint (' || NEW.id || ')',
        NEW.id,
        'gp:complaint_verified:' || NEW.id
      );
    ELSIF NEW.status = 'resolved' THEN
      PERFORM public.award_green_points_atomic(
        NEW.citizen_user_id,
        10,
        'Resolved Sanitation Complaint (' || NEW.id || ')',
        NEW.id,
        'gp:complaint_resolved:' || NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_complaint_status_reward ON public.complaints;
CREATE TRIGGER trg_on_complaint_status_reward
  AFTER UPDATE OF status ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_complaint_status_reward_trigger();

-- 4. Ensure explicit execute grants for authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.award_green_points_atomic(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transition_complaint_status(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 5. Enable REPLICA IDENTITY FULL and Realtime publication on profiles so
--    citizen Green Points balance updates stream over Realtime immediately.
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.complaints REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
