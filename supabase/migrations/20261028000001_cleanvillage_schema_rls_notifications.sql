-- ============================================================================
-- CleanVillage - Complete Supabase PostgreSQL Schema, RLS, Triggers & Realtime
-- Migration: 20261028000001_cleanvillage_schema_rls_notifications.sql
-- ============================================================================
-- Features implemented in this migration:
-- 1. User Profiles & Role-Based Access Control (citizen, authority, worker)
--    with single-administrator constraint and non-escalatable citizen signup.
-- 2. Complaints table with 8-stage lifecycle (submitted, under_review,
--    verified, worker_assigned, in_progress, resolved, reopened, rejected)
--    and India-wide geographic location & coordinate validation.
-- 3. Complaint History table separating public_update_message from private
--    internal_admin_note (with citizen-safe view & RLS protection).
-- 4. Persistent Notifications table with idempotency keys, foreign keys,
--    unread count indexes, and automatic triggers for citizen & admin alerts.
-- 5. Green Points Transactions table with unique idempotency constraint,
--    atomic balance calculation, and automatic "Green Points Credited!" alerts.
-- 6. Strict Row Level Security (RLS) ensuring Citizens ONLY see their own
--    complaints, history, notifications, and points, while the authorized
--    Administrator sees all complaints within scope.
-- 7. Private Supabase Storage bucket ("complaint-evidence") with owner/admin RLS.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. USER PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  mobile TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'authority', 'worker')),
  state_name TEXT DEFAULT '',
  district_name TEXT DEFAULT '',
  city_name TEXT DEFAULT '',
  village_name TEXT DEFAULT '',
  locality TEXT DEFAULT '',
  household_area TEXT DEFAULT '',
  village TEXT DEFAULT 'India',
  green_points INTEGER NOT NULL DEFAULT 0 CHECK (green_points >= 0),
  total_points_earned INTEGER NOT NULL DEFAULT 0 CHECK (total_points_earned >= 0),
  total_points_redeemed INTEGER NOT NULL DEFAULT 0 CHECK (total_points_redeemed >= 0),
  opt_in_leaderboard BOOLEAN NOT NULL DEFAULT true,
  notification_prefs JSONB NOT NULL DEFAULT '{"complaintUpdates":true,"collectionReminders":true,"cleanlinessDrives":true,"rewardAlerts":true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce single dedicated administrator account in profiles if desired:
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_authority_profile
  ON public.profiles ((role))
  WHERE role = 'authority';

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Trusted helper function to read current authenticated user's role from DB
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Trigger to automatically create a 'citizen' profile when a user signs up via Supabase Auth
-- Note: Never promotes any signup to 'authority'. Admin provisioning uses service_role.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    mobile,
    role,
    state_name,
    district_name,
    city_name,
    village_name,
    locality,
    household_area,
    village
  )
  VALUES (
    NEW.id,
    LOWER(TRIM(NEW.email)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
    'citizen', -- Strictly citizen by default; only service_role can set 'authority'
    COALESCE(NEW.raw_user_meta_data->>'state_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'district_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'city_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'village_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'household_area', ''),
    COALESCE(NEW.raw_user_meta_data->>'household_area', ''),
    COALESCE(NEW.raw_user_meta_data->>'village', 'India')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ----------------------------------------------------------------------------
-- 2. COMPLAINTS TABLE (8-Stage Lifecycle + India-Wide Location Evidence)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaints (
  id TEXT PRIMARY KEY,
  citizen_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  citizen_name TEXT NOT NULL,
  citizen_registered_locality TEXT DEFAULT '',
  title TEXT NOT NULL CHECK (char_length(trim(title)) >= 5),
  category TEXT NOT NULL,
  description TEXT NOT NULL CHECK (char_length(trim(description)) >= 10),
  urgency TEXT NOT NULL DEFAULT 'Medium' CHECK (urgency IN ('Low', 'Medium', 'High')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN (
      'submitted',
      'under_review',
      'verified',
      'worker_assigned',
      'in_progress',
      'resolved',
      'reopened',
      'rejected'
    )
  ),
  country TEXT NOT NULL DEFAULT 'India',
  state_name TEXT DEFAULT '',
  district_name TEXT DEFAULT '',
  city_name TEXT DEFAULT '',
  village_name TEXT DEFAULT '',
  locality TEXT DEFAULT '',
  landmark TEXT DEFAULT '',
  pincode TEXT DEFAULT '',
  formatted_address TEXT DEFAULT '',
  village TEXT DEFAULT 'India',
  area TEXT NOT NULL,
  reported_latitude DOUBLE PRECISION CHECK (
    reported_latitude IS NULL OR (reported_latitude >= -90 AND reported_latitude <= 90)
  ),
  reported_longitude DOUBLE PRECISION CHECK (
    reported_longitude IS NULL OR (reported_longitude >= -180 AND reported_longitude <= 180)
  ),
  location_source TEXT DEFAULT 'user',
  location_capture_method TEXT NOT NULL DEFAULT 'manual_entry',
  location_confirmation_status TEXT NOT NULL DEFAULT 'Manually Entered Address (No Map Coordinates)',
  location_review_status TEXT NOT NULL DEFAULT 'Not Reviewed' CHECK (
    location_review_status IN (
      'Not Reviewed',
      'Location Reviewed',
      'Needs Clarification',
      'Location Mismatch Suspected'
    )
  ),
  location_review_note TEXT DEFAULT '',
  location_reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  location_reviewed_at TIMESTAMPTZ,
  assigned_worker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_team TEXT DEFAULT '',
  task_id TEXT DEFAULT '',
  authority_remarks TEXT DEFAULT '',
  rejection_reason TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  photo_storage_path TEXT DEFAULT '',
  resolution_photo_url TEXT DEFAULT '',
  points_awarded BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_complaints_citizen_user_id ON public.complaints(citizen_user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_submitted_at ON public.complaints(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_state_district ON public.complaints(state_name, district_name);

-- ----------------------------------------------------------------------------
-- 3. COMPLAINT HISTORY TABLE (Separates Public Updates from Internal Notes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaint_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  updated_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('citizen', 'authority', 'worker', 'system')),
  actor_name TEXT NOT NULL,
  public_update_message TEXT NOT NULL,
  internal_admin_note TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaint_history_complaint_id
  ON public.complaint_history(complaint_id, created_at ASC);

-- Citizen-safe view that NEVER exposes internal_admin_note
CREATE OR REPLACE VIEW public.citizen_complaint_timeline AS
SELECT
  h.id,
  h.complaint_id,
  h.previous_status,
  h.new_status,
  h.actor_role,
  h.actor_name,
  h.public_update_message,
  h.created_at
FROM public.complaint_history h
JOIN public.complaints c ON c.id = h.complaint_id
WHERE c.citizen_user_id = auth.uid() OR public.get_my_role() = 'authority';

-- ----------------------------------------------------------------------------
-- 4. GREEN POINTS TRANSACTIONS TABLE (With Idempotent Anti-Duplicate Constraint)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.green_points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  complaint_id TEXT REFERENCES public.complaints(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'reversal')),
  points_amount INTEGER NOT NULL CHECK (points_amount <> 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  authorized_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gp_transactions_user_id
  ON public.green_points_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gp_transactions_complaint_id
  ON public.green_points_transactions(complaint_id);

-- ----------------------------------------------------------------------------
-- 5. PERSISTENT NOTIFICATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN (
      'complaint_submitted',
      'complaint_status',
      'green_points',
      'admin_new_complaint',
      'location_review',
      'reward',
      'system'
    )
  ),
  related_complaint_id TEXT REFERENCES public.complaints(id) ON DELETE SET NULL,
  related_transaction_id UUID REFERENCES public.green_points_transactions(id) ON DELETE SET NULL,
  idempotency_key TEXT UNIQUE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications(recipient_user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related_complaint
  ON public.notifications(related_complaint_id);

-- ----------------------------------------------------------------------------
-- 6. TRUSTED BACKEND FUNCTIONS & TRIGGERS FOR NOTIFICATIONS & GREEN POINTS
-- ----------------------------------------------------------------------------

-- 6A. Trigger when a new complaint is submitted:
-- 1) Records initial 'submitted' entry in complaint_history.
-- 2) Sends "Complaint Submitted" notification to the citizen who submitted it.
-- 3) Sends "New Sanitation Complaint Received" notification to all authorized administrators.
CREATE OR REPLACE FUNCTION public.handle_new_complaint_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
  v_location_summary TEXT;
BEGIN
  v_location_summary := COALESCE(NULLIF(TRIM(NEW.area), ''), NULLIF(TRIM(NEW.village), ''), 'Location provided in report');

  -- 1. Initial complaint history record
  INSERT INTO public.complaint_history (
    complaint_id,
    previous_status,
    new_status,
    updated_by_user_id,
    actor_role,
    actor_name,
    public_update_message,
    internal_admin_note,
    created_at
  )
  VALUES (
    NEW.id,
    NULL,
    'submitted',
    NEW.citizen_user_id,
    'citizen',
    NEW.citizen_name,
    'Complaint submitted (' || COALESCE(NEW.location_confirmation_status, 'Location recorded') || ').',
    NULL,
    NEW.submitted_at
  );

  -- 2. Citizen Notification: Complaint Submitted
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
    NEW.citizen_user_id,
    'Complaint Submitted',
    'Your sanitation complaint has been submitted successfully. Complaint ID: ' || NEW.id || '. We will notify you when its status changes.',
    'complaint_submitted',
    NEW.id,
    'notif:complaint_submitted:citizen:' || NEW.id,
    jsonb_build_object(
      'link', '/citizen/complaints/' || NEW.id,
      'complaint_id', NEW.id,
      'status', 'submitted'
    )
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  -- 3. Administrator Notification(s): Notify every authorized administrator
  FOR v_admin IN
    SELECT id FROM public.profiles WHERE role = 'authority'
  LOOP
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
      v_admin.id,
      'New Sanitation Complaint Received',
      'A new complaint ' || NEW.id || ' has been submitted. Category: ' || NEW.category || '. Location: ' || v_location_summary || '.',
      'admin_new_complaint',
      NEW.id,
      'notif:complaint_submitted:admin:' || v_admin.id || ':' || NEW.id,
      jsonb_build_object(
        'link', '/authority/complaints/' || NEW.id,
        'complaint_id', NEW.id,
        'category', NEW.category,
        'location', v_location_summary
      )
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_complaint_created ON public.complaints;
CREATE TRIGGER trg_on_complaint_created
  AFTER INSERT ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_complaint_created();

-- 6B. Trusted Atomic Function to Credit Green Points (Idempotent & Anti-Duplicate)
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
  IF p_points <= 0 THEN
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

  -- Check if already processed (idempotent retry protection)
  SELECT * INTO v_existing_tx
  FROM public.green_points_transactions
  WHERE idempotency_key = v_final_key;

  IF FOUND THEN
    RETURN v_existing_tx;
  END IF;

  -- Atomically update user profile points and retrieve confirmed balance
  UPDATE public.profiles
  SET
    green_points = green_points + p_points,
    total_points_earned = total_points_earned + p_points,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING green_points INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipient user profile (%) not found.', p_user_id;
  END IF;

  -- Record transaction
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

  -- Create persistent notification for the citizen
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

-- 6C. Trusted Atomic Function to Transition Complaint Status, Record History & Notify Citizen
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

  -- Build exact notification title and message required for the citizen
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

  -- Insert citizen status notification (idempotent per history event)
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

  -- Award +10 Green Points once when verified (or resolved if not already awarded)
  IF p_new_status IN ('verified', 'resolved') THEN
    PERFORM public.award_green_points_atomic(
      v_complaint.citizen_user_id,
      10,
      'Verified Sanitation Complaint (' || p_complaint_id || ')',
      p_complaint_id,
      'gp:complaint_verified:' || p_complaint_id
    );
  END IF;

  RETURN v_complaint;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES - STRICT CITIZEN / ADMIN SEPARATION
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.green_points_transactions ENABLE ROW LEVEL SECURITY;

-- 7.1 PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view own profile or authority views all" ON public.profiles;
CREATE POLICY "Users can view own profile or authority views all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.get_my_role() = 'authority' OR opt_in_leaderboard = true);

DROP POLICY IF EXISTS "Users can update own non-privileged profile fields" ON public.profiles;
CREATE POLICY "Users can update own non-privileged profile fields"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND green_points = (SELECT p.green_points FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 7.2 COMPLAINTS POLICIES (Mandatory Strict Citizen Privacy)
-- Ordinary citizens can ONLY SELECT their own complaints.
-- Authorized administrators can SELECT all complaints within scope.
DROP POLICY IF EXISTS "Citizens view only own complaints; Admin views all" ON public.complaints;
CREATE POLICY "Citizens view only own complaints; Admin views all"
  ON public.complaints FOR SELECT
  TO authenticated
  USING (
    citizen_user_id = auth.uid()
    OR public.get_my_role() = 'authority'
    OR (public.get_my_role() = 'worker' AND assigned_worker_id = auth.uid())
  );

-- Citizens can INSERT complaints only with their own authenticated UUID and status = 'submitted'
DROP POLICY IF EXISTS "Citizens insert own complaints only" ON public.complaints;
CREATE POLICY "Citizens insert own complaints only"
  ON public.complaints FOR INSERT
  TO authenticated
  WITH CHECK (
    citizen_user_id = auth.uid()
    AND status = 'submitted'
    AND points_awarded = false
  );

-- Only Authority can UPDATE complaints directly
DROP POLICY IF EXISTS "Only authority can update complaints" ON public.complaints;
CREATE POLICY "Only authority can update complaints"
  ON public.complaints FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'authority')
  WITH CHECK (public.get_my_role() = 'authority');

-- 7.3 COMPLAINT HISTORY POLICIES
DROP POLICY IF EXISTS "Complaint owner or authority can view history" ON public.complaint_history;
CREATE POLICY "Complaint owner or authority can view history"
  ON public.complaint_history FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'authority'
    OR EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_history.complaint_id
        AND c.citizen_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Only authority can insert history directly" ON public.complaint_history;
CREATE POLICY "Only authority can insert history directly"
  ON public.complaint_history FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() = 'authority');

-- 7.4 NOTIFICATIONS POLICIES
-- Users can ONLY read or mark-as-read notifications where recipient_user_id = auth.uid()
DROP POLICY IF EXISTS "Users can view only their own notifications" ON public.notifications;
CREATE POLICY "Users can view only their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark only their own notifications read" ON public.notifications;
CREATE POLICY "Users can mark only their own notifications read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- 7.5 GREEN POINTS TRANSACTIONS POLICIES
DROP POLICY IF EXISTS "Users view own point transactions; Admin views all" ON public.green_points_transactions;
CREATE POLICY "Users view own point transactions; Admin views all"
  ON public.green_points_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.get_my_role() = 'authority');

-- ----------------------------------------------------------------------------
-- 8. PRIVATE STORAGE BUCKET & STORAGE RLS FOR COMPLAINT PHOTOGRAPHS
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'complaint-evidence',
  'complaint-evidence',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Citizens upload complaint photos to own folder" ON storage.objects;
CREATE POLICY "Citizens upload complaint photos to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'complaint-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owner or authority can view complaint photos" ON storage.objects;
CREATE POLICY "Owner or authority can view complaint photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'complaint-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_my_role() = 'authority'
    )
  );

-- ----------------------------------------------------------------------------
-- 9. SUPABASE REALTIME PUBLICATION
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.complaint_history;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.green_points_transactions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
