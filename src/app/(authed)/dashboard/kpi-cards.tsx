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
        current: { income: 0, expenses: 0 }, 
        previous: { income: 0, expenses: 0 } 
      };
    }

    const today = new Date();
    
    // Intervals
    const currentStart = startOfMonth(today);
    const currentEnd = endOfMonth(today);
    const previousMonthDate = subMonths(today, 1);
    const previousStart = startOfMonth(previousMonthDate);
    const previousEnd = endOfMonth(previousMonthDate);
    
    return transactions.reduce(
      (acc, t) => {
        const tDate = new Date(t.timestamp);
        
        // Current Month
        if (isWithinInterval(tDate, { start: currentStart, end: currentEnd })) {
          if (t.type === 'income') acc.current.income += t.amount;
          else acc.current.expenses += t.amount;
        }
        
        // Previous Month
        if (isWithinInterval(tDate, { start: previousStart, end: previousEnd })) {
          if (t.type === 'income') acc.previous.income += t.amount;
          else acc.previous.expenses += t.amount;
        }
        
        return acc;
      },
      { 
        current: { income: 0, expenses: 0 }, 
        previous: { income: 0, expenses: 0 } 
      }
    );
  }, [transactions, hasMounted]);

  const { current, previous } = stats;

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

  const burnRate = useMemo(() => (current.income > 0 ? current.expenses / current.income : 0), [current]);
  const isHighOverhead = burnRate > 0.8;
  
  const CardWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <Card className={cn("transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] hover:shadow-primary/10 border-none bg-card/50 backdrop-blur-sm overflow-hidden min-w-0 w-full", className)}>
      {children}
    </Card>
  );

  const formatCurrency = (val: number) => `₦${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  if (isLoading || !hasMounted) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="w-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-7 w-1/2" />
                        <Skeleton className="h-3 w-1/3 mt-2" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      <CardWrapper>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] sm:text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-sidebar-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-2xl font-bold truncate" title={formatCurrency(current.income)}>
            {formatCurrency(current.income)}
          </div>
          <p className={`text-[10px] truncate ${revenueTrend.isUp ? 'text-accent' : 'text-destructive'}`}>
            {revenueTrend.label}
          </p>
        </CardContent>
      </CardWrapper>
      <CardWrapper>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] sm:text-sm font-medium">Total Expenses</CardTitle>
          <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-sidebar-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-2xl font-bold truncate" title={formatCurrency(current.expenses)}>
            {formatCurrency(current.expenses)}
          </div>
          <p className={`text-[10px] truncate ${expenseTrend.isUp ? 'text-destructive' : 'text-accent'}`}>
            {expenseTrend.label}
          </p>
        </CardContent>
      </CardWrapper>
      <CardWrapper>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] sm:text-sm font-medium">Net Income</CardTitle>
          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-sidebar-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-2xl font-bold truncate" title={formatCurrency(current.income - current.expenses)}>
            {formatCurrency(current.income - current.expenses)}
          </div>
          <p className={`text-[10px] truncate ${netIncomeTrend.isUp ? 'text-accent' : 'text-destructive'}`}>
            {netIncomeTrend.label}
          </p>
        </CardContent>
      </CardWrapper>
      <CardWrapper className={isHighOverhead ? 'border-destructive bg-destructive/10 hover:shadow-destructive/20' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] sm:text-sm font-medium">Burn Rate</CardTitle>
          <Flame className={`h-3 w-3 sm:h-4 sm:w-4 ${isHighOverhead ? 'text-destructive' : 'text-sidebar-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-lg sm:text-2xl font-bold truncate ${isHighOverhead ? 'text-destructive' : ''}`}>
            {(burnRate * 100).toFixed(1)}%
          </div>
          <p className={`text-[10px] truncate ${isHighOverhead ? 'text-destructive/80' : 'text-muted-foreground'}`}>
            {isHighOverhead ? "High Overhead" : "Burn Rate"}
          </p>
        </CardContent>
      </CardWrapper>
    </div>
  );
}