
import {
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../firebase';

export async function generateOrderId(): Promise<string> {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const datePrefix = `${year}${month}${day}`;
  const counterRef = doc(db, 'settings', 'orderCounter');

  return runTransaction(db, async (transaction) => {
    const counterSnapshot = await transaction.get(counterRef);

    let nextSequence = 1;

    if (counterSnapshot.exists()) {
      const counterData = counterSnapshot.data();
      const savedDate = counterData.currentMonth;
      const savedSequence = counterData.currentSequence;

      if (
        savedDate === datePrefix &&
        Number.isInteger(savedSequence) &&
        savedSequence >= 1
      ) {
        nextSequence = savedSequence + 1;
      }
    }

    transaction.set(counterRef, {
      currentMonth: datePrefix,
      currentSequence: nextSequence,
      updatedAt: serverTimestamp(),
    });

    return `ZEL-${datePrefix}-${String(nextSequence).padStart(4, '0')}`;
  });
}
