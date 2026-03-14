
'use client';

import React from 'react';
import { useTier } from '@/hooks/use-tier';
import { useRole } from '@/hooks/use-role';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { ShieldAlert, Loader2 } from 'lucide-react';
import CollaborationClient from './collaboration-client';

/**
 * Collaboration Hub - SME Copilot Tier Only
 * Gated entry for the accountant interaction module.
 */
export default function CollaborationPage() {
  const { isCopilot, loading: tierLoading } = useTier();
  const { isOwner, isAccountant, isAdmin, isLoading: roleLoading } = useRole();

  if (tierLoading || roleLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Tier Check
  if (!isCopilot) {
    return (
      <UpgradePrompt 
        variant="page"
        featureName="Accountant Room"
        requiredTier="copilot"
        description="Collaborate directly with a dedicated professional accountant to manage your bookkeeping, tax compliance, and financial health."
      />
    );
  }

  // Role Check
  if (!isOwner && !isAccountant && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldAlert className="h-12 w-12 text-destructive opacity-20" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          This room is only accessible to the Business Owner and assigned Accountant.
        </p>
      </div>
    );
  }

  return <CollaborationClient />;
}
