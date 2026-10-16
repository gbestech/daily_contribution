// src/utils/payoutRotation.js
//
// Pure helpers for building a monthly payout rotation.
// No React, no side effects, no API calls.

/**
 * Fisher–Yates shuffle (unbiased). Returns a NEW array.
 */
export function shuffleArray(input) {
    if (!Array.isArray(input)) return [];
    const arr = [...input];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Shuffle guaranteeing a different order than the input (2+ items).
 */
export function shuffleArrayDistinct(input) {
    if (!Array.isArray(input)) return [];
    const arr = [...input];
    if (arr.length < 2) return arr;

    const isSame = (a, b) =>
        a.length === b.length && a.every((v, i) => v === b[i]);

    let out = shuffleArray(arr);
    let tries = 0;
    while (isSame(out, arr) && tries < 5) {
        out = shuffleArray(arr);
        tries++;
    }
    return out;
}

/**
 * Filter members who are eligible for the monthly payout rotation
 * for a given duration key.
 *
 * @param {Array} members
 * @param {"6 months"|"1 year"} durationKey
 * @returns {Array}
 */
export function getEligibleForDuration(members, durationKey) {
    if (!Array.isArray(members)) return [];
    const target = String(durationKey || "")
        .trim()
        .toLowerCase();

    return members.filter((m) => {
        const method = String(m?.savings_method || "")
            .trim()
            .toLowerCase();
        const duration = String(m?.duration || "")
            .trim()
            .toLowerCase();
        const status = String(m?.status || "active")
            .trim()
            .toLowerCase();

        const isCash = method === "cash";
        const isDurationMatch = duration === target;
        const isActive = status === "active" || status === "approved";

        return isCash && isDurationMatch && isActive;
    });
}

/**
 * Given a list of eligible members and the total number of months
 * (6 or 12), return an array of fixed-length slots:
 *
 *   [ { month: 1, member: {...}|null }, { month: 2, member: {...}|null }, ... ]
 *
 * - If there are more members than slots, the extras are ignored.
 * - If there are fewer members than slots, remaining slots get member: null.
 *
 * @param {Array} eligibleMembers
 * @param {number} durationMonths
 * @returns {Array<{month:number, member:object|null}>}
 */
export function buildMonthlyRotation(eligibleMembers, durationMonths) {
    const total = Math.max(0, parseInt(durationMonths, 10) || 0);
    if (total <= 0) return [];

    const shuffled = shuffleArrayDistinct(
        Array.isArray(eligibleMembers) ? eligibleMembers : [],
    );
    const picked = shuffled.slice(0, total);

    const slots = [];
    for (let i = 0; i < total; i++) {
        slots.push({
            month: i + 1,
            member: picked[i] || null,
        });
    }
    return slots;
}

/**
 * Map a member's `duration` field to the number of months.
 *   "6 months" → 6
 *   "1 year"   → 12
 *   anything else → 0
 */
export function durationToMonths(durationKey) {
    const k = String(durationKey || "")
        .trim()
        .toLowerCase();
    if (k === "6 months") return 6;
    if (k === "1 year") return 12;
    return 0;
}