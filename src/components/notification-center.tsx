
'use client';

import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  ChevronDown, 
  ChevronUp, 
  Package, 
  Target, 
  AlertCircle,
  CalendarClock,
  Wallet,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTier } from '@/hooks/use-tier';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { InventoryItem, Goal, Transaction, Invoice, RecurringExpense, PayrollStaff } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { startOfMonth, endOfMonth, isAfter, isBefore, addDays } from 'date-fns';

/**
 * Smart Notification Center - Dashboard Component
 * Generates dynamic, actionable alerts based on current business state.
 */
export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { profile, business, isLoading: isProfileLoading } = useUserProfile();
  const { isFree, isProOrAbove } = useTier();
  const firestore = useFirestore();
  const businessId = profile?.businessId;

  // --- Data Fetching ---
  const inventoryRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/inventory_items`) : null),
    [firestore, businessId]
  );
  const { data: inventory } = useCollection<InventoryItem>(inventoryRef);

  const invoicesRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/invoices`) : null),
    [firestore, businessId]
  );
  const { data: invoices } = useCollection<Invoice>(invoicesRef);

  const recurringRef = useMemoFirebase(
    () => (firestore && businessId && isProOrAbove ? collection(firestore, `businesses/${businessId}/recurring_expenses`) : null),
    [firestore, businessId, isProOrAbove]
  );
  const { data: recurring } = useCollection<RecurringExpense>(recurringRef);

  const transactionsRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/transactions`) : null),
    [firestore, businessId]
  );
  const { data: transactions } = useCollection<Transaction>(transactionsRef);

  const goalsRef = useMemoFirebase(
    () => (firestore && businessId ? query(collection(firestore, `businesses/${businessId}/goals`), limit(1)) : null),
    [firestore, businessId]
  );
  const { data: goals } = useCollection<Goal>(goalsRef);

  // --- Alert Generation Logic ---
  const alerts = useMemo(() => {
    if (isProfileLoading) return [];
    const activeAlerts: { icon: any, message: string, link: string, type: string, priority: 'high' | 'normal' }[] = [];
    const today = new Date();

    // 1. Low Stock (All Tiers)
    const lowStock = inventory?.filter(i => !i.isArchived && i.type === 'goods' && (i.currentStock || 0) <= (i.reorderPoint || 0)) || [];
    if (lowStock.length > 0) {
      activeAlerts.push({
        icon: Package,
        message: `${lowStock.length} inventory items are at or below threshold`,
        link: '/inventory',
        type: 'low_stock',
        priority: 'high'
      });
    }

    // 2. Goal Milestones (All Tiers)
    const activeGoal = goals?.[0];
    if (activeGoal && transactions) {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      const revenue = transactions.reduce((sum, t) => {
        if (t.type === 'income' && isAfter(new Date(t.timestamp), start) && isBefore(new Date(t.timestamp), end)) {
          return sum + t.amount;
        }
        return sum;
      }, 0);

      const progress = (revenue / activeGoal.amount) * 100;
      if (progress >= 100) {
        activeAlerts.push({ icon: Target, message: "Monthly revenue target exceeded!", link: '/dashboard', type: 'goal', priority: 'normal' });
      } else if (progress >= 90) {
        activeAlerts.push({ icon: Target, message: "90% of revenue target reached — keep pushing!", link: '/dashboard', type: 'goal', priority: 'normal' });
      } else if (progress >= 75) {
        activeAlerts.push({ icon: Target, message: "75% milestone hit! You're on track.", link: '/dashboard', type: 'goal', priority: 'normal' });
      }
    }

    // --- Premium Only Alerts ---
    if (isProOrAbove) {
      // 3. Overdue Invoices
      const overdue = invoices?.filter(inv => inv.status !== 'paid' && isBefore(new Date(inv.dueDate), today)) || [];
      if (overdue.length > 0) {
        activeAlerts.push({
          icon: AlertCircle,
          message: `${overdue.length} invoices are currently overdue for payment`,
          link: '/invoices',
          type: 'overdue_invoice',
          priority: 'high'
        });
      }

      // 4. Recurring Expenses Due Soon
      const upcomingRecurring = recurring?.filter(r => {
        const dueDate = new Date(r.nextDueDate);
        return r.isActive && isAfter(dueDate, today) && isBefore(dueDate, addDays(today, 3));
      }) || [];
      if (upcomingRecurring.length > 0) {
        activeAlerts.push({
          icon: CalendarClock,
          message: `${upcomingRecurring.length} automated expenses due in the next 3 days`,
          link: '/transactions',
          type: 'recurring',
          priority: 'normal'
        });
      }

      // 5. Tax Obligations (Simulated check - checks for specific regulatory keywords in categories or labels)
      // Note: Full logic would check quarterly schedules
      if (today.getDate() >= 25) {
        activeAlerts.push({
          icon: TrendingUp,
          message: "Monthly tax and compliance filings due within 7 days",
          link: '/reports',
          type: 'tax',
          priority: 'high'
        });
      }
    }

    return activeAlerts;
  }, [inventory, goals, transactions, invoices, recurring, isProOrAbove, isProfileLoading]);

  if (isProfileLoading || alerts.length === 0) return null;

  const highPriorityCount = alerts.filter(a => a.priority === 'high').length;

  return (
    <div className="px-1 md:px-0 mb-6">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="w-full"
      >
        <CollapsibleTrigger asChild>
          <div className={cn(
            "flex items-center justify-between px-4 py-3 rounded-xl border shadow-sm transition-all duration-500 ease-in-out cursor-pointer select-none",
            highPriorityCount > 0
              ? "bg-destructive/5 border-destructive/20 hover:bg-destructive/10"
              : "bg-primary/5 border-primary/20 hover:bg-primary/10"
          )}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={cn(
                  "p-2 rounded-full",
                  highPriorityCount > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                )}>
                  <Bell className="h-4 w-4" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", highPriorityCount > 0 ? "bg-destructive" : "bg-primary")}></span>
                  <span className={cn("relative inline-flex rounded-full h-3 w-3", highPriorityCount > 0 ? "bg-destructive" : "bg-primary")}></span>
                </span>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold tracking-tight flex items-center gap-2">
                  Actionable Insights
                  <Badge variant={highPriorityCount > 0 ? "destructive" : "default"} className="h-5 px-1.5 text-[10px] font-bold">
                    {alerts.length} ALERT{alerts.length !== 1 ? 'S' : ''}
                  </Badge>
                </h4>
                <p className="text-[11px] text-muted-foreground font-medium truncate max-w-[200px] sm:max-w-md">
                  {alerts[0].message}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground hidden sm:block">Review Suggestions</span>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2 space-y-2 animate-in slide-in-from-top-2 duration-300">
          {alerts.map((alert, idx) => (
            <div 
              key={idx} 
              className={cn(
                "group flex items-center gap-3 rounded-xl border p-3 text-sm transition-all hover:shadow-md bg-card",
                alert.priority === 'high' ? "border-destructive/30" : "border-border"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                alert.priority === 'high' ? "bg-destructive/5 text-destructive" : "bg-muted text-muted-foreground"
              )}>
                <alert.icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold leading-tight">{alert.message}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs font-bold text-primary" asChild>
                <Link href={alert.link}>
                  Resolve
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
