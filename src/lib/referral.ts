import { doc, getDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

// ═══════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════
export const REFERRAL_BONUS_AMOUNT = 30; // Tk per successful referral

// Readable chars (no 0/O/1/I/L to avoid confusion)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// ═══════════════════════════════════════
// GENERATE UNIQUE REFERRAL CODE
// ═══════════════════════════════════════
export function generateReferralCode(): string {
  let code = 'ZEL';
  for (let i = 0; i < 5; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

// ═══════════════════════════════════════
// CHECK IF CODE IS ALREADY TAKEN
// ═══════════════════════════════════════
async function isCodeTaken(code: string): Promise<boolean> {
  const q = query(collection(db, 'users'), where('referralCode', '==', code));
  const snap = await getDocs(q);
  return !snap.empty;
}

// ═══════════════════════════════════════
// GENERATE UNIQUE CODE (retry if taken)
// ═══════════════════════════════════════
export async function generateUniqueReferralCode(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateReferralCode();
    const taken = await isCodeTaken(code);
    if (!taken) return code;
    attempts++;
  }
  // Fallback: timestamp-based
  return `ZEL${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

// ═══════════════════════════════════════
// FIND REFERRER BY CODE
// ═══════════════════════════════════════
export async function findReferrerByCode(code: string): Promise<{
  uid: string;
  name: string;
} | null> {
  if (!code || code.trim().length === 0) return null;

  const normalizedCode = code.trim().toUpperCase();

  const q = query(
    collection(db, 'users'),
    where('referralCode', '==', normalizedCode)
  );
  const snap = await getDocs(q);

  if (snap.empty) return null;

  const doc = snap.docs[0];
  const data = doc.data();
  return {
    uid: doc.id,
    name: typeof data.name === 'string' ? data.name : 'Reseller',
  };
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
    const currentBonus = typeof data.referralBonusEarned === 'number' ? data.referralBonusEarned : 0;
    const currentCount = typeof data.referralCount === 'number' ? data.referralCount : 0;

    await updateDoc(referrerRef, {
      referralBonusEarned: currentBonus + REFERRAL_BONUS_AMOUNT,
      referralCount: currentCount + 1,
      lastReferralAt: new Date().toISOString(),
    });

    return true;
  } catch (err) {
    console.error('Failed to credit referrer:', err);
    return false;
  }
}

// ═══════════════════════════════════════
// GET USER'S REFERRAL STATS
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
      referralCode: typeof data.referralCode === 'string' ? data.referralCode : '',
      referralCount: typeof data.referralCount === 'number' ? data.referralCount : 0,
      referralBonusEarned: typeof data.referralBonusEarned === 'number' ? data.referralBonusEarned : 0,
    };
  } catch (err) {
    console.error('Failed to load referral stats:', err);
    return null;
  }
}

// ═══════════════════════════════════════
// GENERATE REFERRAL LINK
// ═══════════════════════════════════════
export function buildReferralLink(code: string): string {
  const baseUrl = 'https://zeluxe-gallery-web-app.vercel.app';
  return `${baseUrl}/register?ref=${code}`;
}