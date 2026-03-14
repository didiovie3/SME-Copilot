
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import QuickActions from './quick-actions';
import KpiCards from './kpi-cards';
import CashPulseChart from './cash-pulse-chart';
import InventoryAlerts from './inventory-alerts';
import GoalsSection from './goals-section';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Transaction, Advice } from '@/lib/types';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTier } from '@/hooks/use-tier';
import { Sparkles, Quote, LayoutDashboard, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { cn } from '@/lib/utils';

export default function SmeDashboard() {
  const { profile, isLoading: isProfileLoading } = useUserProfile();
  const { isFree, isProOrAbove } = useTier();
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
      <div className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Business Command</h2>
        </div>
        <QuickActions />
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Performance Pulse</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <KpiCards transactions={transactions} isLoading={isLoading} />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Strategic Goals</h2>
        <GoalsSection transactions={transactions} isLoading={isLoading} />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-7 transition-all duration-500 hover:shadow-lg hover:shadow-primary/10 border-none bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Cash Pulse History</CardTitle>
            <CardDescription>{isFree ? 'Last 30 days of income versus expenses.' : 'Full historical trend of income versus expenses.'}</CardDescription>
          </CardHeader>
          <CardContent className="pl-2 relative">
            <div className={cn("transition-all", isFree && "grayscale opacity-80")}>
              <CashPulseChart transactions={transactions} isLoading={isLoading} />
            </div>
            {isFree && (
              <div className="absolute inset-0 flex items-center justify-center p-6 bg-background/5 backdrop-blur-[1px]">
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

      <div className="space-y-4">
         <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Operational Alerts</h2>
         <InventoryAlerts />
      </div>
    </div>
  );
}
