import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

// ═══════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════
export const REFERRAL_BONUS_AMOUNT = 30;

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// ═══════════════════════════════════════
// GENERATE CODE
// ═══════════════════════════════════════
export function generateReferralCode(): string {
  let code = 'ZEL';
  for (let i = 0; i < 5; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

async function isCodeTaken(code: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'referralCodes', code));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function generateUniqueReferralCode(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateReferralCode();
    const taken = await isCodeTaken(code);
    if (!taken) return code;
    attempts++;
  }
  return `ZEL${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

// ═══════════════════════════════════════
// PUBLISH CODE (public collection)
// ═══════════════════════════════════════
export async function publishReferralCode(
  uid: string,
  name: string,
  code: string
): Promise<boolean> {
  try {
    await setDoc(doc(db, 'referralCodes', code), {
      uid,
      name,
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error('Failed to publish referral code:', err);
    return false;
  }
}

// ═══════════════════════════════════════
// FIND REFERRER BY CODE (public read)
// ═══════════════════════════════════════
export async function findReferrerByCode(
  code: string
): Promise<{ uid: string; name: string } | null> {
  if (!code || code.trim().length === 0) return null;

  const normalizedCode = code.trim().toUpperCase();

  try {
    const snap = await getDoc(doc(db, 'referralCodes', normalizedCode));
    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      uid: typeof data.uid === 'string' ? data.uid : '',
      name: typeof data.name === 'string' ? data.name : 'Reseller',
    };
  } catch (err) {
    console.error('Failed to find referrer:', err);
    return null;
  }
}

// ═══════════════════════════════════════
// LEADERBOARD UPDATE
// ═══════════════════════════════════════
async function updateLeaderboard(
  uid: string,
  name: string,
  count: number,
  earned: number
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'leaderboard', uid),
      {
        uid,
        name,
        referralCount: count,
        referralBonusEarned: earned,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to update leaderboard:', err);
  }
}

// ═══════════════════════════════════════
// CREDIT REFERRER ON APPROVAL
// ═══════════════════════════════════════
export async function creditReferrer(referrerUid: string): Promise<boolean> {
  if (!referrerUid) return false;

  try {
    const referrerRef = doc(db, 'users', referrerUid);
    const referrerSnap = await getDoc(referrerRef);
    if (!referrerSnap.exists()) return false;

    const data = referrerSnap.data();
    const currentBonus =
      typeof data.referralBonusEarned === 'number' ? data.referralBonusEarned : 0;
    const currentCount =
      typeof data.referralCount === 'number' ? data.referralCount : 0;

    const newBonus = currentBonus + REFERRAL_BONUS_AMOUNT;
    const newCount = currentCount + 1;

    await updateDoc(referrerRef, {
      referralBonusEarned: newBonus,
      referralCount: newCount,
      lastReferralAt: new Date().toISOString(),
    });

    // Update leaderboard with new stats
    const referrerName = typeof data.name === 'string' ? data.name : 'Reseller';
    await updateLeaderboard(referrerUid, referrerName, newCount, newBonus);

    return true;
  } catch (err) {
    console.error('Failed to credit referrer:', err);
    return false;
  }
}

// ═══════════════════════════════════════
// GET USER REFERRAL STATS
// ═══════════════════════════════════════
export async function getReferralStats(uid: string): Promise<{
  referralCode: string;
  referralCount: number;
  referralBonusEarned: number;
} | null> {
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) return null;

    const data = userSnap.data();
    return {
      referralCode:
        typeof data.referralCode === 'string' ? data.referralCode : '',
      referralCount:
        typeof data.referralCount === 'number' ? data.referralCount : 0,
      referralBonusEarned:
        typeof data.referralBonusEarned === 'number'
          ? data.referralBonusEarned
          : 0,
    };
  } catch (err) {
    console.error('Failed to load referral stats:', err);
    return null;
  }
}

// ═══════════════════════════════════════
// GET TOP REFERRERS (for leaderboard)
// ═══════════════════════════════════════
export async function getTopReferrers(limit: number = 10): Promise<
  {
    uid: string;
    name: string;
    referralCount: number;
    referralBonusEarned: number;
  }[]
> {
  try {
    const snap = await getDocs(collection(db, 'leaderboard'));
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        name: typeof data.name === 'string' ? data.name : 'Reseller',
        referralCount:
          typeof data.referralCount === 'number' ? data.referralCount : 0,
        referralBonusEarned:
          typeof data.referralBonusEarned === 'number'
            ? data.referralBonusEarned
            : 0,
      };
    });

    // Sort by referralCount desc, then by earned
    list.sort((a, b) => {
      if (b.referralCount !== a.referralCount) {
        return b.referralCount - a.referralCount;
      }
      return b.referralBonusEarned - a.referralBonusEarned;
    });

    return list.slice(0, limit);
  } catch (err) {
    console.error('Failed to load leaderboard:', err);
    return [];
  }
}

// ═══════════════════════════════════════
// BUILD REFERRAL LINK
// ═══════════════════════════════════════
export function buildReferralLink(code: string): string {
  const baseUrl = 'https://zeluxe-gallery-web-app.vercel.app';
  return `${baseUrl}/register?ref=${code}`;
}
