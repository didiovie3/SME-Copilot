'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, CreditCard, Flame, TrendingUp } from 'lucide-react';
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
        
        // Accumulate All Time Totals
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
      label: `${diff >= 0 ? '+' : '-'}${Math.abs(diff).toFixed(1)}% from last month`
    };
  };

  const revenueTrend = calculateTrend(current.income, previous.income);
  const expenseTrend = calculateTrend(current.expenses, previous.expenses);
  const netIncomeTrend = calculateTrend(current.income - current.expenses, previous.income - previous.expenses);

  const burnRate = useMemo(() => (allTime.income > 0 ? allTime.expenses / allTime.income : 0), [allTime]);
  const isHighOverhead = burnRate > 0.8;
  
  const CardWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <Card className={cn("transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] hover:shadow-primary/20 border-none bg-card/50 backdrop-blur-md overflow-hidden min-w-0 w-full min-h-[180px] flex flex-col justify-center px-2", className)}>
      {children}
    </Card>
  );

  const formatCurrency = (val: number) => `₦${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  if (isLoading || !hasMounted) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="w-full h-[180px] border-none bg-card/50 animate-pulse">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
      <CardWrapper>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-3xl font-black text-primary tracking-tight truncate" title={formatCurrency(allTime.income)}>
            {formatCurrency(allTime.income)}
          </div>
          <p className={`text-[10px] font-bold uppercase ${revenueTrend.isUp ? 'text-accent' : 'text-destructive'}`}>
            {revenueTrend.label}
          </p>
        </CardContent>
      </CardWrapper>

      <CardWrapper>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Total Expenses</CardTitle>
          <CreditCard className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-3xl font-black text-destructive tracking-tight truncate" title={formatCurrency(allTime.expenses)}>
            {formatCurrency(allTime.expenses)}
          </div>
          <p className={`text-[10px] font-bold uppercase ${expenseTrend.isUp ? 'text-destructive' : 'text-accent'}`}>
            {expenseTrend.label}
          </p>
        </CardContent>
      </CardWrapper>

      <CardWrapper>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Net Income</CardTitle>
          <TrendingUp className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-3xl font-black text-accent tracking-tight truncate" title={formatCurrency(allTime.income - allTime.expenses)}>
            {formatCurrency(allTime.income - allTime.expenses)}
          </div>
          <p className={`text-[10px] font-bold uppercase ${netIncomeTrend.isUp ? 'text-accent' : 'text-destructive'}`}>
            {netIncomeTrend.label}
          </p>
        </CardContent>
      </CardWrapper>

      <CardWrapper className={isHighOverhead ? 'bg-destructive/5 ring-1 ring-destructive/20' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Burn Rate</CardTitle>
          <Flame className={`h-4 w-4 ${isHighOverhead ? 'text-destructive animate-pulse' : 'text-primary'}`} />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className={`text-3xl font-black tracking-tight ${isHighOverhead ? 'text-destructive' : 'text-primary'}`}>
            {(burnRate * 100).toFixed(1)}%
          </div>
          <p className={`text-[10px] font-bold uppercase ${isHighOverhead ? 'text-destructive' : 'text-muted-foreground'}`}>
            {isHighOverhead ? "Critical Overhead" : "Burn Rate"}
          </p>
        </CardContent>
      </CardWrapper>
    </div>
  );
}
