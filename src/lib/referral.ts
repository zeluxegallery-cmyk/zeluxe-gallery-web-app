
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  serverTimestamp,
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
    code += CODE_CHARS.charAt(
      Math.floor(Math.random() * CODE_CHARS.length)
    );
  }

  return code;
}

// ═══════════════════════════════════════
// CHECK CODE
// ═══════════════════════════════════════

async function isCodeTaken(code: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'referralCodes', code));
    return snap.exists();
  } catch (err) {
    console.error('Failed to check referral code:', err);
    return true;
  }
}

// ═══════════════════════════════════════
// GENERATE UNIQUE CODE
// ═══════════════════════════════════════

export async function generateUniqueReferralCode(): Promise<string> {
  let attempts = 0;

  while (attempts < 10) {
    const code = generateReferralCode();
    const taken = await isCodeTaken(code);

    if (!taken) return code;

    attempts++;
  }

  throw new Error('Unique referral code তৈরি করা যায়নি। আবার চেষ্টা করুন।');
}

// ═══════════════════════════════════════
// PUBLISH REFERRAL CODE
// ═══════════════════════════════════════

export async function publishReferralCode(
  uid: string,
  name: string,
  code: string
): Promise<boolean> {
  try {
    if (!uid || !name || !/^ZEL[A-Z0-9]{5}$/.test(code)) {
      return false;
    }

    await setDoc(doc(db, 'referralCodes', code), {
      uid,
      name,
      createdAt: serverTimestamp(),
    });

    return true;
  } catch (err) {
    console.error('Failed to publish referral code:', err);
    return false;
  }
}

// ═══════════════════════════════════════
// FIND REFERRER BY CODE
// ═══════════════════════════════════════

export async function findReferrerByCode(
  code: string
): Promise<{ uid: string; name: string } | null> {
  if (!code || !code.trim()) return null;

  const normalizedCode = code.trim().toUpperCase();

  if (!/^ZEL[A-Z0-9]{5}$/.test(normalizedCode)) {
    return null;
  }

  try {
    const snap = await getDoc(
      doc(db, 'referralCodes', normalizedCode)
    );

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
// CLIENT-SIDE WRITES DISABLED
// ═══════════════════════════════════════

async function updateLeaderboard(
  _uid: string,
  _name: string,
  _count: number,
  _earned: number
): Promise<void> {
  // Leaderboard updates must be performed by a trusted admin.
  // Client-side referral bonus updates are disabled.
}

// ═══════════════════════════════════════
// CREDIT REFERRER
// CLIENT-SIDE CREDIT DISABLED
// ═══════════════════════════════════════

export async function creditReferrer(
  _referrerUid: string
): Promise<boolean> {
  console.warn(
    'Referral bonus credit is disabled. A trusted server-side process is required.'
  );

  return false;
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
        typeof data.referralCode === 'string'
          ? data.referralCode
          : '',

      referralCount:
        typeof data.referralCount === 'number'
          ? data.referralCount
          : 0,

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
// GET TOP REFERRERS
// ═══════════════════════════════════════

export async function getTopReferrers(
  limit: number = 10
): Promise<
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

        name:
          typeof data.name === 'string'
            ? data.name
            : 'Reseller',

        referralCount:
          typeof data.referralCount === 'number'
            ? data.referralCount
            : 0,

        referralBonusEarned:
          typeof data.referralBonusEarned === 'number'
            ? data.referralBonusEarned
            : 0,
      };
    });

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

  return `${baseUrl}/register?ref=${encodeURIComponent(code)}`;
}
