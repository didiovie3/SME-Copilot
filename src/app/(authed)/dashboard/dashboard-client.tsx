'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { useRole } from '@/hooks/use-role';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationCenter } from '@/components/notification-center';
import SmeDashboard from './sme-dashboard';
import AdminDashboard from './admin-dashboard';
import QuickActions from './quick-actions';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Sparkles } from 'lucide-react';

export default function DashboardClient() {
  const { profile, isLoading: isProfileLoading } = useUserProfile();
  const { isStaff, isAdmin } = useRole();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isProfileLoading || !mounted) {
    return (
      <div className="space-y-8 pb-10">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Simplified Dashboard for Staff
  if (isStaff) {
    return (
      <div className="flex flex-col gap-8 pb-10 animate-in fade-in duration-700">
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Colleague Workstation</h2>
          </div>
          <QuickActions />
        </div>
        
        <div className="p-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center gap-4 bg-muted/20 opacity-60">
          <Sparkles className="h-12 w-12 text-primary/40" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Safe Workspace Active</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Your role is restricted to logging operations. Revenue charts and sensitive metrics are visible to Accountants and Owners only.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <NotificationCenter />
      {isAdmin ? <AdminDashboard /> : <SmeDashboard />}
    </div>
  );
}