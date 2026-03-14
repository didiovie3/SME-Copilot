
import { doc, getDoc, setDoc, increment, Firestore } from 'firebase/firestore';

export type IdType = 'user' | 'transaction' | 'goods' | 'service' | 'business' | 'invoice' | 'client';

const PREFIX_MAP: Record<IdType, string> = {
  user: 'UI',
  transaction: 'TD',
  goods: 'GD',
  service: 'SV',
  business: 'BI',
  invoice: 'IV',
  client: 'CL'
};

/**
 * Formats a number as a binary string with at least 5 digits.
 */
export function formatBinaryId(prefix: string, index: number): string {
  return `${prefix}-${index.toString(2).padStart(5, '0')}`;
}

/**
 * Fetches the next sequential binary ID for a given entity type.
 * REFACTORED: Uses increment() and cache-first reads to support OFFLINE operation.
 * Transactions fail offline; increment() works and syncs later.
 */
export async function getNextId(db: Firestore, type: IdType): Promise<string> {
  const counterRef = doc(db, '_metadata', 'counters');
  
  // Update the counter locally (immediate) and queue for sync
  await setDoc(counterRef, { [type]: increment(1) }, { merge: true });
  
  // Read the updated value from local cache
  const snap = await getDoc(counterRef);
  const nextIndex = snap.data()?.[type] ?? 17; // Default to 17 if not found
  
  return formatBinaryId(PREFIX_MAP[type], nextIndex);
}

/**
 * Fetches a range of sequential indices for bulk operations.
 * REFACTORED for offline support.
 */
export async function getNextIdRange(db: Firestore, type: IdType, count: number): Promise<number> {
  const counterRef = doc(db, '_metadata', 'counters');
  
  const snap = await getDoc(counterRef);
  const current = snap.data()?.[type] ?? 16;
  
  await setDoc(counterRef, { [type]: increment(count) }, { merge: true });
  
  return current;
}

export { PREFIX_MAP };
