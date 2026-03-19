"use strict";

/**
 * inviteEngine.js
 *
 * Pure helpers for invite-code generation, referral bonus computation and
 * invite validation.  No side-effects, no I/O.
 */

// ── constants ────────────────────────────────────────────────────────────────

var MAX_REFERRALS_PER_USER = 50;

/**
 * Referral reward tiers (1-8).
 * `sc` = soft currency bonus, `hc` = hard currency bonus (where applicable).
 */
var REFERRAL_TIERS = Object.freeze({
  1: Object.freeze({ sc: 100 }),
  2: Object.freeze({ sc: 200, hc: 1 }),
  3: Object.freeze({ sc: 500, hc: 2 }),
  4: Object.freeze({ sc: 1000, hc: 4 }),
  5: Object.freeze({ sc: 2000, hc: 8 }),
  6: Object.freeze({ sc: 4000, hc: 16 }),
  7: Object.freeze({ sc: 8000, hc: 32 }),
  8: Object.freeze({ sc: 16000, hc: 64 })
});

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Simple deterministic hash producing a base-36 string.
 * Not cryptographic -- just a short, URL-safe code.
 */
function simpleHash(str) {
  var s = String(str);
  var hash = 0;
  for (var i = 0; i < s.length; i++) {
    var ch = s.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0; // force 32-bit int
  }
  // Make positive and convert to base-36
  return Math.abs(hash).toString(36);
}

function clampTier(value) {
  var num = Math.floor(Number(value));
  if (!Number.isFinite(num) || num < 1) return 1;
  if (num > 8) return 8;
  return num;
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Generate a deterministic invite code for a given userId.
 * The code is a base-36 hash string suitable for sharing.
 *
 * @param {string|number} userId
 * @returns {string}
 */
function generateInviteCode(userId) {
  var seed = "invite:" + String(userId != null ? userId : "anonymous") + ":nexus";
  return simpleHash(seed);
}

/**
 * Compute the referral bonus for both inviter and invitee based on their tiers.
 *
 * @param {number} inviterTier  1-8
 * @param {number} inviteeTier  1-8
 * @returns {{ inviterSC: number, inviteeSC: number, inviterHC: number }}
 */
function computeReferralBonus(inviterTier, inviteeTier) {
  var iTier = clampTier(inviterTier);
  var eTier = clampTier(inviteeTier);

  var inviterReward = REFERRAL_TIERS[iTier] || REFERRAL_TIERS[1];
  var inviteeReward = REFERRAL_TIERS[eTier] || REFERRAL_TIERS[1];

  return {
    inviterSC: inviterReward.sc || 0,
    inviteeSC: Math.floor((inviteeReward.sc || 0) * 0.5), // invitee gets 50% of their tier
    inviterHC: inviterReward.hc || 0
  };
}

/**
 * Validate an invite object.
 * An invite is valid when:
 *   - it is not expired
 *   - inviter and invitee are different users
 *   - max referral cap has not been reached
 *
 * @param {object} invite
 * @param {string}  invite.inviterId
 * @param {string}  invite.inviteeId
 * @param {string|Date} [invite.expiresAt]  optional expiry
 * @param {number}  [invite.referralCount]  inviter's current referral count
 * @returns {boolean}
 */
function isInviteValid(invite) {
  if (!invite || typeof invite !== "object") return false;

  var inviterId = invite.inviterId != null ? String(invite.inviterId) : "";
  var inviteeId = invite.inviteeId != null ? String(invite.inviteeId) : "";

  // Must have both ids and they must differ
  if (inviterId === "" || inviteeId === "") return false;
  if (inviterId === inviteeId) return false;

  // Check expiry
  if (invite.expiresAt != null) {
    var expiryTime = new Date(invite.expiresAt).getTime();
    if (!Number.isFinite(expiryTime)) return false;
    if (Date.now() >= expiryTime) return false;
  }

  // Check referral cap
  var count = Math.floor(Number(invite.referralCount));
  if (Number.isFinite(count) && count >= MAX_REFERRALS_PER_USER) return false;

  return true;
}

// ── exports ──────────────────────────────────────────────────────────────────

module.exports = {
  MAX_REFERRALS_PER_USER: MAX_REFERRALS_PER_USER,
  REFERRAL_TIERS: REFERRAL_TIERS,
  generateInviteCode: generateInviteCode,
  computeReferralBonus: computeReferralBonus,
  isInviteValid: isInviteValid
};
