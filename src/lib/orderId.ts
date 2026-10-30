
import {
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Zeluxe Order ID Generator
 * Format: ZEL-YYMMDD-NNNN
 */
export async function generateOrderId(): Promise<string> {
  const counterRef = doc(db, 'settings', 'orderCounter');

  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const dateCode = `${year}${month}${day}`;

  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    let sequence = 1;

    if (counterDoc.exists()) {
      const data = counterDoc.data();

      if (data.currentMonth === dateCode) {
        sequence = (data.currentSequence || 0) + 1;
      }
    }

    transaction.set(
      counterRef,
      {
        currentMonth: dateCode,
        currentSequence: sequence,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const seqStr = String(sequence).padStart(4, '0');

    return `ZEL-${dateCode}-${seqStr}`;
  });
}
