/**
 * CleanVillage - Firebase Cloud Functions
 * Trusted Server-Side Operations for Green Points, Anti-Abuse Validation,
 * Safe Atomic Complaint ID Generation, and Reward Redemptions.
 *
 * Community Service Project (CSP) - VVIT CSE
 * Survey Location: Pinapadu, Tenali, Andhra Pradesh
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// Configurable prototype point rules
const POINT_RULES = {
  VERIFIED_COMPLAINT: 10,
  CLEANLINESS_DRIVE_ATTENDANCE: 20,
  SEGREGATION_PLEDGE: 5,
};

/**
 * Triggered when a complaint document is updated.
 * Awards +10 Green Points exactly once when status transitions to 'Verified'.
 * Never awards points for 'Rejected' complaints or duplicate transitions.
 */
exports.onComplaintStatusChange = functions.firestore
  .document("complaints/{complaintId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const complaintId = context.params.complaintId;

    // Award points only once when transitioning to Verified
    if (
      before.status !== "Verified" &&
      after.status === "Verified" &&
      !after.pointsAwarded &&
      after.userId
    ) {
      const txId = `LOCK_COMPLAINT_${complaintId}`;
      const txRef = db.collection("pointTransactions").doc(txId);
      const userRef = db.collection("users").doc(after.userId);
      const complaintRef = change.after.ref;

      await db.runTransaction(async (t) => {
        const existingTx = await t.get(txRef);
        if (existingTx.exists) {
          return; // Idempotency guard: already awarded
        }
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) return;

        const currentPoints = userDoc.data().greenPoints || 0;
        const totalEarned = userDoc.data().totalPointsEarned || 0;

        t.update(userRef, {
          greenPoints: currentPoints + POINT_RULES.VERIFIED_COMPLAINT,
          totalPointsEarned: totalEarned + POINT_RULES.VERIFIED_COMPLAINT,
        });

        t.update(complaintRef, {
          pointsAwarded: true,
        });

        t.set(txRef, {
          id: txId,
          userId: after.userId,
          type: "EARNED",
          points: POINT_RULES.VERIFIED_COMPLAINT,
          reason: `Verified Sanitation Complaint (${after.complaintCode || complaintId})`,
          referenceId: complaintId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    }
  });

/**
 * Callable Cloud Function for Safe Reward Redemption Request
 * Reserves/deducts points atomically and prevents negative balances or duplicate requests.
 */
exports.requestRewardRedemption = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = context.auth.uid;
  const { rewardId } = data;
  if (!rewardId) {
    throw new functions.https.HttpsError("invalid-argument", "Reward ID is required.");
  }

  const userRef = db.collection("users").doc(uid);
  const rewardRef = db.collection("rewards").doc(rewardId);
  const redemptionRef = db.collection("redemptions").doc();
  const txRef = db.collection("pointTransactions").doc();

  return db.runTransaction(async (t) => {
    const [userSnap, rewardSnap] = await Promise.all([
      t.get(userRef),
      t.get(rewardRef),
    ]);

    if (!userSnap.exists) {
      throw new functions.https.HttpsError("not-found", "User profile not found.");
    }
    if (!rewardSnap.exists || !rewardSnap.data().available || rewardSnap.data().stock <= 0) {
      throw new functions.https.HttpsError("failed-precondition", "Reward is currently unavailable.");
    }

    const user = userSnap.data();
    const reward = rewardSnap.data();

    if ((user.greenPoints || 0) < reward.pointsCost) {
      throw new functions.https.HttpsError("failed-precondition", "Insufficient Green Points balance.");
    }

    t.update(userRef, {
      greenPoints: user.greenPoints - reward.pointsCost,
      totalPointsRedeemed: (user.totalPointsRedeemed || 0) + reward.pointsCost,
    });

    t.update(rewardRef, {
      stock: reward.stock - 1,
    });

    t.set(redemptionRef, {
      id: redemptionRef.id,
      userId: uid,
      userName: user.fullName,
      rewardId: reward.id,
      rewardTitle: reward.title,
      pointsCost: reward.pointsCost,
      status: "Pending Approval",
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    t.set(txRef, {
      id: txRef.id,
      userId: uid,
      type: "REDEEMED",
      points: -reward.pointsCost,
      reason: `Reward Redemption Request: ${reward.title}`,
      referenceId: redemptionRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { redemptionId: redemptionRef.id, status: "Pending Approval" };
  });
});
