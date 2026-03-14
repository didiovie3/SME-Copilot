
'use client';

import { collection, doc, serverTimestamp, setDoc, Firestore } from 'firebase/firestore';

export type AdminTargetType = "business" | "user" | "subscription" | "accountant" | "report";

/**
 * Logs administrative actions to a central audit trail.
 */
export async function logAdminAction(
  db: Firestore,
  admin: { uid: string; name: string },
  params: {
    action: string;
    targetType: AdminTargetType;
    targetId: string;
    targetName: string;
    details: string;
  }
) {
  try {
    const logRef = doc(collection(db, 'admin_activity_log'));
    await setDoc(logRef, {
      ...params,
      adminUid: admin.uid,
      adminName: admin.name,
      timestamp: new Date().toISOString() // Using ISO for easier client sorting/filtering
    });
  } catch (e) {
    console.error('Failed to log admin action:', e);
  }
}
