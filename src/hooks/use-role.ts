
'use client';

import { useUserProfile } from './use-user-profile';
import { useMemo } from 'react';

/**
 * Custom hook to manage Role-Based Access Control (RBAC) in Uruvia.
 */
export function useRole() {
  const { profile, isLoading } = useUserProfile();

  const role = profile?.role || 'staff';

  return useMemo(() => ({
    role,
    isOwner: role === 'owner' || role === 'smeOwner',
    isAccountant: role === 'accountant',
    isStaff: role === 'staff',
    isAdmin: role === 'admin',
    // Logical groupings
    canManageTeam: role === 'owner' || role === 'smeOwner' || role === 'admin',
    canManageBilling: role === 'owner' || role === 'smeOwner' || role === 'admin',
    canManagePayroll: role === 'owner' || role === 'smeOwner' || role === 'accountant' || role === 'admin',
    canViewMetrics: role === 'owner' || role === 'smeOwner' || role === 'accountant' || role === 'admin',
    canViewReports: role === 'owner' || role === 'smeOwner' || role === 'accountant' || role === 'admin',
    canEditInventory: role === 'owner' || role === 'smeOwner' || role === 'accountant' || role === 'staff' || role === 'admin',
    isLoading,
  }), [role, isLoading]);
}
