'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, CreditCard, TrendingUp } from 'lucide-react';
import type { Transaction } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect, useMemo } from 'react';
import { startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';

interface KpiCardsProps {
  transactions: Transaction[] | null;
  isLoading: boolean;
}

export default function KpiCards({ transactions, isLoading }: KpiCardsProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  const stats = useMemo(() => {
    if (!transactions || !hasMounted) {
      return { 
        allTime: { income: 0, expenses: 0 },
        current: { income: 0, expenses: 0 }, 
        previous: { income: 0, expenses: 0 } 
      };
    }

    const today = new Date();
    
    // Intervals for monthly trends
    const currentStart = startOfMonth(today);
    const currentEnd = endOfMonth(today);
    const previousMonthDate = subMonths(today, 1);
    const previousStart = startOfMonth(previousMonthDate);
    const previousEnd = endOfMonth(previousMonthDate);
    
    return transactions.reduce(
      (acc, t) => {
        const tDate = new Date(t.timestamp);
        
        // Accumulate All Time Totals (Used for Dashboard Summary)
        if (t.type === 'income') acc.allTime.income += t.amount;
        else acc.allTime.expenses += t.amount;

        // Current Month Stats
        if (isWithinInterval(tDate, { start: currentStart, end: currentEnd })) {
          if (t.type === 'income') acc.current.income += t.amount;
          else acc.current.expenses += t.amount;
        }
        
        // Previous Month Stats
        if (isWithinInterval(tDate, { start: previousStart, end: previousEnd })) {
          if (t.type === 'income') acc.previous.income += t.amount;
          else acc.previous.expenses += t.amount;
        }
        
        return acc;
      },
      { 
        allTime: { income: 0, expenses: 0 },
        current: { income: 0, expenses: 0 }, 
        previous: { income: 0, expenses: 0 } 
      }
    );
  }, [transactions, hasMounted]);

  const { allTime, current, previous } = stats;

  const calculateTrend = (curr: number, prev: number) => {
    if (prev <= 0) {
      return {
        value: "0.0",
        isUp: true,
        label: "0.0% from last month"
      };
    }
    const diff = ((curr - prev) / prev) * 100;
    return {
      value: Math.abs(diff).toFixed(1),
      isUp: diff >= 0,
      label: `${diff >= 0 ? '+' : '-'}${Math.abs(diff).toFixed(1)}% vs last month`
    };
  };

  const revenueTrend = calculateTrend(current.income, previous.income);
  const expenseTrend = calculateTrend(current.expenses, previous.expenses);
  const netWorth = allTime.income - allTime.expenses;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(val).replace('NGN', '₦');
  };

  const CardWrapper = ({ children, className, isPrimary = false }: { children: React.ReactNode, className?: string, isPrimary?: boolean }) => (
    <Card className={cn(
      "relative transition-all duration-300 hover:scale-[1.02] border-none shadow-sm overflow-hidden min-h-[160px] flex flex-col justify-center",
      isPrimary ? "bg-white ring-1 ring-primary/5 shadow-primary/10" : "bg-white",
      className
    )}>
      {isPrimary && (
        <div className="absolute top-0 right-0 p-8 -mr-8 -mt-8 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      )}
      {children}
    </Card>
  );

  if (isLoading || !hasMounted) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="w-full h-[160px] border-none bg-white animate-pulse shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-5 rounded-full" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-10 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
      {/* Total Revenue */}
      <CardWrapper isPrimary>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Total Revenue</CardTitle>
          <div className="p-2 bg-primary/10 rounded-lg">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-3xl font-black text-slate-900 tracking-tight leading-none">
            {formatCurrency(allTime.income)}
          </div>
          <div className={cn(
            "text-[10px] font-bold flex items-center gap-1",
            revenueTrend.isUp ? "text-emerald-500" : "text-rose-500"
          )}>
            {revenueTrend.isUp ? '↑' : '↓'} {revenueTrend.label}
          </div>
        </CardContent>
      </CardWrapper>

      {/* Total Expenses */}
      <CardWrapper>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Total Expenses</CardTitle>
          <div className="p-2 bg-rose-50 rounded-lg">
            <CreditCard className="h-4 w-4 text-rose-500" />
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-3xl font-black text-slate-900 tracking-tight leading-none">
            {formatCurrency(allTime.expenses)}
          </div>
          <div className={cn(
            "text-[10px] font-bold flex items-center gap-1",
            expenseTrend.isUp ? "text-rose-500" : "text-emerald-500"
          )}>
            {expenseTrend.isUp ? '↑' : '↓'} {expenseTrend.label}
          </div>
        </CardContent>
      </CardWrapper>

      {/* Net Income */}
      <CardWrapper>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Net Income</CardTitle>
          <div className="p-2 bg-emerald-50 rounded-lg">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className={cn(
            "text-3xl font-black tracking-tight leading-none",
            netWorth >= 0 ? "text-emerald-600" : "text-rose-600"
          )}>
            {formatCurrency(netWorth)}
          </div>
          <div className="text-[10px] font-bold text-slate-400">
            Current Profitability
          </div>
        </CardContent>
      </CardWrapper>
    </div>
  );
}