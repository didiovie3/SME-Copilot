
'use client';

import { useUserProfile } from './use-user-profile';
import { useMemo } from 'react';

/**
 * Custom hook to manage and reference Uruvia pricing tiers.
 */
export function useTier() {
  const { business, isLoading } = useUserProfile();

  const sub = business?.subscription;
  const tier = sub?.tier || 'free';

  return useMemo(() => ({
    tier,
    isFree: tier === 'free',
    isPro: tier === 'pro',
    isCopilot: tier === 'copilot',
    isProOrAbove: tier === 'pro' || tier === 'copilot',
    status: sub?.status || 'active',
    planName: sub?.planName || 'Free',
    monthlyAmount: sub?.monthlyAmount || 0,
    billingDate: sub?.billingDate || null,
    nextBillingDate: sub?.nextBillingDate || null,
    businessSize: sub?.businessSize || null,
    assignedAccountantName: sub?.assignedAccountantName || null,
    loading: isLoading,
  }), [tier, sub, isLoading]);
}
