
'use client';

import { useEffect } from 'react';
import { useDatabase, useFirestore, useCollection, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { ref, set } from 'firebase/database';
import { collection, doc } from 'firebase/firestore';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Business, Transaction, InventoryItem, UserProfile, Feedback } from '@/lib/types';

/**
 * Background Engine that mirrors Firestore data to Realtime Database for redundant backup.
 */
export function RtdbBackupEngine() {
  const database = useDatabase();
  const firestore = useFirestore();
  const { user } = useUser();
  const { profile, business } = useUserProfile();

  const isAdmin = profile?.role === 'admin';
  const businessId = profile?.businessId;

  // --- Collection Listeners ---

  // 1. Transactions (for the specific business)
  const transactionsRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/transactions`) : null),
    [firestore, businessId]
  );
  const { data: transactions } = useCollection<Transaction>(transactionsRef);

  // 2. Inventory (for the specific business)
  const inventoryRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/inventory_items`) : null),
    [firestore, businessId]
  );
  const { data: inventory } = useCollection<InventoryItem>(inventoryRef);

  // 3. Global Data (Admins Only)
  const allBusinessesRef = useMemoFirebase(
    () => (firestore && isAdmin ? collection(firestore, 'businesses') : null),
    [firestore, isAdmin]
  );
  const { data: allBusinesses } = useCollection<Business>(allBusinessesRef);

  const allProfilesRef = useMemoFirebase(
    () => (firestore && isAdmin ? collection(firestore, 'user_profiles') : null),
    [firestore, isAdmin]
  );
  const { data: allProfiles } = useCollection<UserProfile>(allProfilesRef);

  const allFeedbackRef = useMemoFirebase(
    () => (firestore && isAdmin ? collection(firestore, 'feedback') : null),
    [firestore, isAdmin]
  );
  const { data: allFeedback } = useCollection<Feedback>(allFeedbackRef);

  // --- Synchronization Logic ---

  useEffect(() => {
    if (!database || !user) return;

    const backupPath = isAdmin ? `backups/admin` : `backups/users/${user.uid}`;
    
    // Sync logic for SME Owner
    if (!isAdmin && businessId) {
      const dataToSync = {
        profile: profile || null,
        business: business || null,
        transactions: transactions || [],
        inventory: inventory || [],
        lastUpdated: new Date().toISOString()
      };
      set(ref(database, backupPath), dataToSync);
    }

    // Sync logic for Admins (Full Global Backup)
    if (isAdmin) {
      const globalBackup = {
        businesses: allBusinesses || [],
        profiles: allProfiles || [],
        feedback: allFeedback || [],
        lastUpdated: new Date().toISOString()
      };
      set(ref(database, `${backupPath}/global`), globalBackup);
    }

  }, [database, user, profile, business, transactions, inventory, isAdmin, allBusinesses, allProfiles, allFeedback, businessId]);

  return null; // Invisible component
}
