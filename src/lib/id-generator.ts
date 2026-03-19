
import { doc, getDoc, setDoc, increment, Firestore } from 'firebase/firestore';

export type IdType = 'user' | 'transaction' | 'goods' | 'service' | 'business' | 'invoice' | 'client' | 'income' | 'expense';

const PREFIX_MAP: Record<IdType, string> = {
  user: 'UI',
  transaction: 'TD',
  goods: 'GD',
  service: 'SV',
  business: 'BI',
  invoice: 'IV',
  client: 'CL',
  income: 'TC',
  expense: 'TD'
};

/**
 * Formats a number as a padded string with at least 5 digits.
 * Updated to use decimal format as requested (e.g., TD-00010).
 */
export function formatBinaryId(prefix: string, index: number): string {
  return `${prefix}-${index.toString().padStart(5, '0')}`;
}

/**
 * Fetches the next sequential ID for a given entity type.
 * Uses 'transaction' counter for both income and expense to maintain a single sequence.
 */
export async function getNextId(db: Firestore, type: IdType): Promise<string> {
  const counterType = (type === 'income' || type === 'expense') ? 'transaction' : type;
  const counterRef = doc(db, '_metadata', 'counters');
  
  // Update the counter locally (immediate) and queue for sync
  await setDoc(counterRef, { [counterType]: increment(1) }, { merge: true });
  
  // Read the updated value from local cache
  const snap = await getDoc(counterRef);
  const nextIndex = snap.data()?.[counterType] ?? 17; // Default to 17 if not found
  
  return formatBinaryId(PREFIX_MAP[type], nextIndex);
}

/**
 * Fetches a range of sequential indices for bulk operations.
 */
export async function getNextIdRange(db: Firestore, type: IdType, count: number): Promise<number> {
  const counterType = (type === 'income' || type === 'expense') ? 'transaction' : type;
  const counterRef = doc(db, '_metadata', 'counters');
  
  const snap = await getDoc(counterRef);
  const current = snap.data()?.[counterType] ?? 16;
  
  await setDoc(counterRef, { [counterType]: increment(count) }, { merge: true });
  
  return current;
}

export { PREFIX_MAP };
