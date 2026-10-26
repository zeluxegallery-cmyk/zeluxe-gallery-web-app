import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Zeluxe Order ID Generator
 * Format: ZEL-YYMMDD-NNNN (যেমন: ZEL-261026-0001)
 * Conforms strictly to Firestore Rules: currentMonth must be 6 digits (^[0-9]{6}$)
 */
export async function generateOrderId(): Promise<string> {
  const counterRef = doc(db, 'settings', 'orderCounter');

  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  // ঠিক ৬ ডিজিটের তারিখ (যেমন: "261026")
  const dateCode = `${year}${month}${day}`;

  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    let sequence = 1;

    if (counterDoc.exists()) {
      const data = counterDoc.data();
      const storedDate = data.currentMonth || '';

      if (storedDate === dateCode) {
        sequence = (data.currentSequence || 0) + 1;
      } else {
        sequence = 1;
      }
    }

    // Rules: keys().hasOnly(['currentMonth', 'currentSequence', 'updatedAt'])
    transaction.set(
      counterRef,
      {
        currentMonth: dateCode,
        currentSequence: sequence,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const seqStr = String(sequence).padStart(4, '0');
    return `ZEL-${dateCode}-${seqStr}`;
  });
}
