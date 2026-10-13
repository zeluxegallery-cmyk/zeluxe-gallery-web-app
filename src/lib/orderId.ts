import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Zeluxe Order ID Generator
 * Format: ZEL-YYMM-NNNN
 * Example: ZEL-2510-0001 (October 2025's 1st order)
 * 
 * Sequence resets every month.
 */
export async function generateOrderId(): Promise<string> {
  const counterRef = doc(db, 'settings', 'orderCounter');

  // Get current year and month
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);           // "25"
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // "10"
  const currentMonth = `${year}${month}`;                         // "2510"

  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    let sequence = 1;

    if (counterDoc.exists()) {
      const data = counterDoc.data();
      const storedMonth = data.currentMonth || '';

      if (storedMonth === currentMonth) {
        // Same month — increase sequence
        sequence = (data.currentSequence || 0) + 1;
      } else {
        // New month — reset sequence
        sequence = 1;
      }
    }

    // Update counter
    transaction.set(
      counterRef,
      {
        currentMonth,
        currentSequence: sequence,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Build Order ID
    const seqStr = sequence.toString().padStart(4, '0');
    return `ZEL-${currentMonth}-${seqStr}`;
  });
}
