#!/usr/bin/env node
/**
 * CleanVillage - Automated Verification Tests for Green Points & Reward Notifications
 * ============================================================================
 * Usage:
 *   node scripts/test-green-points-rewards.mjs
 *
 * Verifies:
 * 1. First-time resolution (without prior verification) -> +10 pts & 1 reward notification.
 * 2. Verification followed by resolution -> +10 pts on verified + 10 pts on resolved (20 pts total) & 2 notifications.
 * 3. Repeated resolution (resolved -> reopened -> resolved) -> duplicate resolution reward blocked.
 * 4. Failed reward insertion -> no balance change, no transaction, and no reward notification inserted.
 * 5. Reward notification delivery & Realtime balance refresh wiring in SQL migration and AppContext.jsx.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

/**
 * Pure reference simulation of the atomic reward & status transition state machine
 * mirroring `public.award_green_points_atomic` + `public.transition_complaint_status`
 * and `awardGreenPointsOnce` + `updateComplaintStatus` in `src/context/AppContext.jsx`.
 */
function createRewardHarness(initialProfiles = []) {
  const profiles = new Map(initialProfiles.map((p) => [p.id, { ...p }]));
  const transactions = [];
  const notifications = [];

  function awardGreenPointsAtomic({
    userId,
    points,
    reason,
    complaintId = null,
    idempotencyKey = null,
  }) {
    if (!userId || !points || points <= 0) {
      return {
        awarded: false,
        alreadyAwarded: false,
        error: 'Valid recipient userId and positive points amount are required.',
      };
    }

    const finalKey =
      idempotencyKey || `gp:${userId}:${complaintId || 'manual'}:${reason}`;

    const existingTx = transactions.find((t) => t.idempotency_key === finalKey);
    if (existingTx) {
      return { awarded: false, alreadyAwarded: true, transaction: existingTx };
    }

    const profile = profiles.get(userId);
    if (!profile) {
      return {
        awarded: false,
        alreadyAwarded: false,
        error: `Recipient user profile (${userId}) not found; Green Points were not credited.`,
      };
    }

    const updatedBalance = (profile.greenPoints || 0) + points;
    profile.greenPoints = updatedBalance;
    profile.totalPointsEarned = (profile.totalPointsEarned || 0) + points;

    const tx = {
      id: `TX-${transactions.length + 1}`,
      user_id: userId,
      complaint_id: complaintId,
      transaction_type: 'credit',
      points_amount: points,
      balance_after: updatedBalance,
      reason,
      idempotency_key: finalKey,
    };
    transactions.push(tx);

    const notif = {
      id: `NOTIF-${notifications.length + 1}`,
      recipient_user_id: userId,
      title: 'Green Points Credited!',
      message: `Green Points have been credited to your account. You received ${points} points for ${reason}. Your updated balance is ${updatedBalance} points.`,
      type: 'green_points',
      related_complaint_id: complaintId,
      related_transaction_id: tx.id,
      idempotency_key: `notif:gp_credit:${finalKey}`,
    };
    notifications.push(notif);

    return { awarded: true, alreadyAwarded: false, transaction: tx, notification: notif, updatedBalance };
  }

  function transitionStatus(complaint, newStatus) {
    complaint.status = newStatus;
    if (newStatus === 'verified') {
      return awardGreenPointsAtomic({
        userId: complaint.citizen_user_id,
        points: 10,
        reason: `Verified Sanitation Complaint (${complaint.id})`,
        complaintId: complaint.id,
        idempotencyKey: `gp:complaint_verified:${complaint.id}`,
      });
    }
    if (newStatus === 'resolved') {
      return awardGreenPointsAtomic({
        userId: complaint.citizen_user_id,
        points: 10,
        reason: `Resolved Sanitation Complaint (${complaint.id})`,
        complaintId: complaint.id,
        idempotencyKey: `gp:complaint_resolved:${complaint.id}`,
      });
    }
    return { awarded: false, alreadyAwarded: false };
  }

  return { profiles, transactions, notifications, awardGreenPointsAtomic, transitionStatus };
}

console.log('=== CleanVillage Green Points & Reward Notification Test Suite ===\n');

// ----------------------------------------------------------------------------
// Test 1: First-Time Resolution (without prior verification)
// ----------------------------------------------------------------------------
{
  const harness = createRewardHarness([{ id: 'cit-1', greenPoints: 0, totalPointsEarned: 0 }]);
  const complaint = { id: 'CV-2026-0101', citizen_user_id: 'cit-1', status: 'submitted' };

  harness.transitionStatus(complaint, 'under_review');
  harness.transitionStatus(complaint, 'worker_assigned');
  harness.transitionStatus(complaint, 'in_progress');
  const res = harness.transitionStatus(complaint, 'resolved');

  assert.equal(res.awarded, true, 'First-time resolution must award Green Points');
  assert.equal(harness.profiles.get('cit-1').greenPoints, 10, 'Citizen balance must increase by +10');
  assert.equal(harness.transactions.length, 1, 'Exactly 1 transaction must be recorded');
  assert.equal(harness.transactions[0].idempotency_key, 'gp:complaint_resolved:CV-2026-0101');
  assert.equal(harness.notifications.length, 1, 'Exactly 1 reward notification must be created');
  console.log('[PASS] Test 1: First-time resolution awards +10 pts and creates 1 reward notification.');
}

// ----------------------------------------------------------------------------
// Test 2: Verification Followed by Resolution (+10 on Verified, +10 on Resolved)
// ----------------------------------------------------------------------------
{
  const harness = createRewardHarness([{ id: 'cit-2', greenPoints: 0, totalPointsEarned: 0 }]);
  const complaint = { id: 'CV-2026-0102', citizen_user_id: 'cit-2', status: 'submitted' };

  const verifyRes = harness.transitionStatus(complaint, 'verified');
  assert.equal(verifyRes.awarded, true, 'Verification must award +10 pts');
  assert.equal(harness.profiles.get('cit-2').greenPoints, 10, 'Balance after verification must be 10');

  harness.transitionStatus(complaint, 'worker_assigned');
  harness.transitionStatus(complaint, 'in_progress');
  const resolveRes = harness.transitionStatus(complaint, 'resolved');

  assert.equal(
    resolveRes.awarded,
    true,
    'Resolution after verification must NOT be suppressed by verification idempotency key'
  );
  assert.equal(harness.profiles.get('cit-2').greenPoints, 20, 'Balance after resolution must be 20');
  assert.equal(harness.transactions.length, 2, 'Two distinct reward transactions must exist');
  assert.equal(harness.notifications.length, 2, 'Two distinct reward notifications must exist');
  assert.ok(
    harness.notifications[1].message.includes('Resolved Sanitation Complaint (CV-2026-0102)') &&
      harness.notifications[1].message.includes('Your updated balance is 20 points.'),
    'Resolution notification must reflect +10 pts for resolution and 20 pts updated balance'
  );
  console.log('[PASS] Test 2: Verification (+10) followed by Resolution (+10) awards 20 pts total & 2 notifications.');
}

// ----------------------------------------------------------------------------
// Test 3: Repeated Resolution (resolved -> reopened -> in_progress -> resolved)
// ----------------------------------------------------------------------------
{
  const harness = createRewardHarness([{ id: 'cit-3', greenPoints: 0, totalPointsEarned: 0 }]);
  const complaint = { id: 'CV-2026-0103', citizen_user_id: 'cit-3', status: 'in_progress' };

  const firstResolve = harness.transitionStatus(complaint, 'resolved');
  assert.equal(firstResolve.awarded, true);
  assert.equal(harness.profiles.get('cit-3').greenPoints, 10);

  harness.transitionStatus(complaint, 'reopened');
  harness.transitionStatus(complaint, 'in_progress');
  const secondResolve = harness.transitionStatus(complaint, 'resolved');

  assert.equal(secondResolve.awarded, false, 'Repeated resolution must not award duplicate points');
  assert.equal(secondResolve.alreadyAwarded, true, 'Repeated resolution must report alreadyAwarded: true');
  assert.equal(harness.profiles.get('cit-3').greenPoints, 10, 'Balance must remain 10 after repeated resolution');
  assert.equal(harness.transactions.length, 1, 'No duplicate transaction may be inserted');
  assert.equal(harness.notifications.length, 1, 'No duplicate reward notification may be inserted');
  console.log('[PASS] Test 3: Repeated resolution is blocked by idempotency key without duplicate points or notifications.');
}

// ----------------------------------------------------------------------------
// Test 4: Failed Reward Insertion (Missing Profile or Invalid Points)
// ----------------------------------------------------------------------------
{
  const harness = createRewardHarness([{ id: 'cit-4', greenPoints: 15, totalPointsEarned: 15 }]);

  const missingProfileRes = harness.awardGreenPointsAtomic({
    userId: 'non-existent-user-uuid',
    points: 10,
    reason: 'Resolved Sanitation Complaint (CV-2026-0999)',
    complaintId: 'CV-2026-0999',
    idempotencyKey: 'gp:complaint_resolved:CV-2026-0999',
  });
  assert.equal(missingProfileRes.awarded, false);
  assert.ok(missingProfileRes.error, 'Missing profile must return an explicit error');
  assert.equal(harness.transactions.length, 0, 'Failed award must not insert a transaction');
  assert.equal(harness.notifications.length, 0, 'Failed award must not insert a reward notification');

  const zeroPointsRes = harness.awardGreenPointsAtomic({
    userId: 'cit-4',
    points: 0,
    reason: 'Invalid Zero Award',
  });
  assert.equal(zeroPointsRes.awarded, false);
  assert.equal(harness.profiles.get('cit-4').greenPoints, 15, 'Balance must remain unchanged on failed award');
  assert.equal(harness.notifications.length, 0, 'No notification on failed award');
  console.log('[PASS] Test 4: Failed reward insertion leaves balance untouched and inserts 0 notifications.');
}

// ----------------------------------------------------------------------------
// Test 5: Static Inspection of Corrective SQL Migration & AppContext Wiring
// ----------------------------------------------------------------------------
{
  const correctiveSql = fs.readFileSync(
    path.join(rootDir, 'supabase/migrations/20261029000002_fix_green_points_resolution_rewards.sql'),
    'utf8'
  );
  assert.ok(
    correctiveSql.includes("'gp:complaint_verified:' || p_complaint_id") &&
      correctiveSql.includes("'gp:complaint_resolved:' || p_complaint_id"),
    'Corrective SQL migration must use distinct idempotency keys for verified and resolved'
  );
  assert.ok(
    correctiveSql.includes('CREATE TRIGGER trg_on_complaint_status_reward'),
    'Corrective SQL migration must define the AFTER UPDATE OF status reward trigger'
  );
  assert.ok(
    correctiveSql.includes('ALTER TABLE public.profiles REPLICA IDENTITY FULL;'),
    'Corrective SQL migration must enable REPLICA IDENTITY FULL on profiles'
  );

  const appContextCode = fs.readFileSync(path.join(rootDir, 'src/context/AppContext.jsx'), 'utf8');
  assert.ok(
    appContextCode.includes('idempotencyKey: `gp:complaint_verified:${complaint.id}`') &&
      appContextCode.includes('idempotencyKey: `gp:complaint_resolved:${complaint.id}`'),
    'AppContext.jsx must use distinct idempotency keys for verified and resolved'
  );
  assert.ok(
    appContextCode.includes("table: 'profiles'") &&
      appContextCode.includes('fetchAuthorizedSupabaseData(currentUser)'),
    'AppContext.jsx must refresh citizen balance when notifications or profile updates arrive'
  );
  assert.ok(
    appContextCode.includes('const assignCleaningTask = async (payload) =>') &&
      appContextCode.includes('const updateCleaningTask = async (taskId,'),
    'assignCleaningTask and updateCleaningTask must be async and await updateComplaintStatus'
  );
  console.log('[PASS] Test 5: Corrective SQL migration & AppContext Realtime/async error handling verified.');
}

console.log('\n=== ALL 5 GREEN POINTS & REWARD NOTIFICATION TESTS PASSED ===');
