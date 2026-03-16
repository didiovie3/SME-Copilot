'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Target, Sparkles, Pencil, ArrowUpCircle } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTier } from '@/hooks/use-tier';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { Transaction, Goal } from '@/lib/types';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import GoalDialog from './goal-dialog';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface GoalsSectionProps {
  transactions: Transaction[] | null;
  isLoading: boolean;
}

const SIGNAL_BLUE = "#135BEC";

export default function GoalsSection({ transactions, isLoading: isTransactionsLoading }: GoalsSectionProps) {
  const { profile, isProfileComplete, isLoading: isProfileLoading } = useUserProfile();
  const { isFree } = useTier();
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const businessId = profile?.businessId;
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const goalsCollectionRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/goals`) : null),
    [firestore, businessId]
  );
  
  const currentGoalQuery = useMemoFirebase(() => {
    if (!goalsCollectionRef) return null;
    return query(
      goalsCollectionRef,
      where('month', '==', currentMonth),
      where('year', '==', currentYear),
      limit(isFree ? 1 : 5)
    );
  }, [goalsCollectionRef, currentMonth, currentYear, isFree]);

  const { data: goals, isLoading: isGoalsLoading } = useCollection<Goal>(currentGoalQuery);

  const currentMonthRevenue = useMemo(() => {
    if (!transactions) return 0;
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    return transactions.reduce((sum, t) => {
      if (t.type === 'income' && isWithinInterval(new Date(t.timestamp), { start, end })) {
        return sum + t.amount;
      }
      return sum;
    }, 0);
  }, [transactions, today]);

  const activeGoal = goals?.[0];
  const progress = activeGoal ? Math.min((currentMonthRevenue / activeGoal.amount) * 100, 100) : 0;
  
  const aiMessage = useMemo(() => {
    if (!activeGoal) return "You haven't set a revenue goal for this month yet. Setting a target helps Uruvia guide your growth strategy!";
    
    if (progress >= 100) return `Phenomenal work! You've exceeded your ₦${activeGoal.amount.toLocaleString()} target. You're dominating the market!`;
    
    if (progress > 75) return `So close! You're at ${progress.toFixed(1)}% of your goal. One final push in sales could help you cross the line early.`;
    
    const remaining = activeGoal.amount - currentMonthRevenue;
    return `You're currently ₦${remaining.toLocaleString()} away from your goal. Sales are showing steady momentum—keep going!`;
  }, [activeGoal, progress, currentMonthRevenue]);

  const isLoading = isProfileLoading || isTransactionsLoading || isGoalsLoading;

  if (isLoading) {
    return <Skeleton className="h-[240px] w-full rounded-2xl" />;
  }

  return (
    <>
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Strategic Goals
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Target: ₦{activeGoal?.amount.toLocaleString() || '0'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isFree && goals && goals.length >= 1 && (
              <Button asChild variant="outline" size="sm" className="h-7 text-[10px] font-black uppercase tracking-tighter border-primary/20 text-primary px-3 rounded-full">
                <Link href="/pricing">
                  Upgrade
                </Link>
              </Button>
            )}
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-7 w-7 p-0 rounded-full bg-slate-100 hover:bg-slate-200" 
              onClick={() => setIsDialogOpen(true)}
              disabled={!isProfileComplete}
            >
              <Pencil className="h-3 w-3 text-slate-600" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Monthly Revenue Target</span>
              <span className="text-sm font-black text-primary">{progress.toFixed(1)}% Achieved</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
               <div 
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
               />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
            <div className="flex gap-4">
              <div className="flex-shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Copilot Insight</p>
                <p className="text-xs font-semibold leading-relaxed text-slate-700">
                  {aiMessage}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {businessId && (
        <GoalDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          businessId={businessId}
          existingGoal={activeGoal}
        />
      )}
    </>
  );
}
