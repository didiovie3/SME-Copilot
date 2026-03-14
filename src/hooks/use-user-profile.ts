'use client';

import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile, Business } from '@/lib/types';
import { useMemo } from 'react';

/**
 * Custom hook to retrieve the current user's profile and associated business data.
 * Memoized to prevent unnecessary re-renders in consuming components.
 */
export function useUserProfile() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'user_profiles', user.uid) : null),
    [firestore, user?.uid]
  );

  const { data: profile, isLoading: isProfileLoading, error } = useDoc<UserProfile>(userProfileRef);

  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(
    () => (firestore && businessId ? doc(firestore, 'businesses', businessId) : null),
    [firestore, businessId]
  );
  const { data: business, isLoading: isBusinessLoading } = useDoc<Business>(businessRef);

  const isProfileComplete = useMemo(() => !!(
    business?.profile.name &&
    business?.profile.industry &&
    business?.profile.companySize &&
    business?.profile.tin &&
    business?.profile.country &&
    business?.profile.state &&
    business?.profile.address
  ), [business]);
  
  const isLoading = isAuthLoading || isProfileLoading || isBusinessLoading;

  return useMemo(() => ({
    user,
    profile,
    business,
    isProfileComplete,
    isLoading,
    error,
  }), [user, profile, business, isProfileComplete, isLoading, error]);
}
