'use client';

import QuickActions from './quick-actions';
import KpiCards from './kpi-cards';
import CashPulseChart from './cash-pulse-chart';
import InventoryAlerts from './inventory-alerts';
import GoalsSection from './goals-section';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Transaction } from '@/lib/types';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTier } from '@/hooks/use-tier';
import { LayoutDashboard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SmeDashboard() {
  const { profile, isLoading: isProfileLoading } = useUserProfile();
  const { isFree } = useTier();
  const firestore = useFirestore();
  const businessId = profile?.businessId;

  const transactionsCollectionRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/transactions`) : null),
    [firestore, businessId]
  );
  const { data: transactions, isLoading: isTransactionsLoading } = useCollection<Transaction>(transactionsCollectionRef);

  const isLoading = isProfileLoading || isTransactionsLoading;

  if (isProfileLoading) {
    return (
      <div className="space-y-8 p-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700 pb-24 bg-[#F8FAFC] -m-4 p-4 min-h-screen">
      {/* Header Area */}
      <div className="flex items-center justify-between px-2 pt-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20">
            <LayoutDashboard className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Business Command</h1>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* 1. Performance Pulse (KPIs) */}
      <div className="space-y-4">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Performance Pulse</h2>
        <KpiCards transactions={transactions} isLoading={isLoading} />
      </div>

      {/* 2. Strategic Goals */}
      <div className="space-y-4">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Strategic Goals</h2>
        <GoalsSection transactions={transactions} isLoading={isLoading} />
      </div>

      {/* 3. Cash Pulse History (Visual Analytics) */}
      <div className="space-y-4">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Cash Pulse History</h2>
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black text-slate-900">Monthly Cashflow</CardTitle>
            <CardDescription className="text-xs font-semibold text-slate-400">
              {isFree ? 'Last 30 days of income versus expenses.' : 'Full historical trend comparison.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 relative">
            <div className={cn("transition-all", isFree && "grayscale opacity-80")}>
              <CashPulseChart transactions={transactions} isLoading={isLoading} />
            </div>
            {isFree && (
              <div className="absolute inset-0 flex items-center justify-center p-6 bg-white/40 backdrop-blur-[2px]">
                <UpgradePrompt 
                  variant="overlay"
                  featureName="Full History Visuals"
                  requiredTier="pro"
                  description="Unlock full multi-month financial visualizations to spot long-term growth cycles."
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Operational Alerts */}
      <div className="space-y-4">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">System Status</h2>
        <InventoryAlerts />
      </div>
    </div>
  );
}
