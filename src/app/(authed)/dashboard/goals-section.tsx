'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, Sparkles, Pencil, ArrowUpCircle } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTier } from '@/hooks/use-tier';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { Transaction, Goal } from '@/lib/types';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import GoalDialog from './goal-dialog';
import Link from 'next/link';

interface GoalsSectionProps {
  transactions: Transaction[] | null;
  isLoading: boolean;
}

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
    
    if (progress >= 100) return `Phenomenal work! You've exceeded your ₦${activeGoal.amount.toLocaleString()} target by ${((currentMonthRevenue / activeGoal.amount - 1) * 100).toFixed(1)}%. You're dominating the market this month!`;
    
    if (progress > 75) return `So close! You're at ${progress.toFixed(1)}% of your goal. One final push in sales could help you cross the line early.`;
    
    if (progress > 40) return `Steady progress! You've reached ${progress.toFixed(1)}% of your monthly revenue target. Keep your momentum high!`;
    
    return `You've achieved ${progress.toFixed(1)}% of your ₦${activeGoal.amount.toLocaleString()} goal. There's still time to reach your target—review your sales channels to boost engagement!`;
  }, [activeGoal, progress, currentMonthRevenue]);

  const isLoading = isProfileLoading || isTransactionsLoading || isGoalsLoading;

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  return (
    <>
      <Card className="transition-all duration-500 hover:shadow-lg hover:shadow-primary/5 border-none bg-card/50 backdrop-blur-sm overflow-hidden group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Monthly Revenue Target
            </CardTitle>
            <CardDescription>Tracking your climb to ₦{activeGoal?.amount.toLocaleString() || '0'}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isFree && goals && goals.length >= 1 && (
              <Button asChild variant="outline" size="sm" className="h-8 gap-2 border-primary/20 text-primary">
                <Link href="/pricing">
                  <ArrowUpCircle className="h-4 w-4" />
                  Unlock 5 Goals
                </Link>
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-2 hover:bg-primary/10" 
              onClick={() => setIsDialogOpen(true)}
              disabled={!isProfileComplete}
            >
              <Pencil className="h-4 w-4" />
              {activeGoal ? 'Update Goal' : 'Set Goal'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground">Progress: ₦{currentMonthRevenue.toLocaleString()}</span>
              <span className={progress >= 100 ? "text-accent font-bold" : "text-primary"}>{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-3 bg-primary/10" />
          </div>

          <div className="relative p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
            <div className="flex gap-3">
              <div className="p-2 bg-primary/10 rounded-lg h-fit">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-primary/60">Copilot Insight</p>
                <p className="text-sm font-medium leading-relaxed italic text-foreground/80">
                  "{aiMessage}"
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
