'use client';

import { useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';
import type { UserProfile } from '@/lib/types';

/**
 * Custom hook to manage administrative context and access control.
 * Fetches the user profile directly to avoid business-tier dependencies.
 */
export function useAdmin() {
  const auth = useAuth();
  const firestore = useFirestore();

  const userRef = useMemoFirebase(
    () => (firestore && auth?.currentUser ? doc(firestore, 'user_profiles', auth.currentUser.uid) : null),
    [firestore, auth?.currentUser?.uid]
  );
  const { data: profile, isLoading } = useDoc<UserProfile>(userRef);

  const isAdmin = useMemo(() => {
    const role = profile?.role;
    return role === 'superAdmin' || role === 'accountantAdmin' || role === 'admin';
  }, [profile]);

  const isSuperAdmin = profile?.role === 'superAdmin' || profile?.role === 'admin';
  const isAccountantAdmin = profile?.role === 'accountantAdmin';

  return {
    isAdmin,
    isSuperAdmin,
    isAccountantAdmin,
    profile,
    isLoading
  };
}
