'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MinusCircle, PackagePlus, PlusCircle, Lock, ArrowUpCircle } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTier } from '@/hooks/use-tier';
import TransactionDialog from '../transactions/transaction-dialog';
import InventoryDialog from '../inventory/inventory-dialog';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { InventoryItem, Transaction } from '@/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import Link from 'next/link';

export default function QuickActions() {
  const { profile, user, isProfileComplete, isLoading: isProfileLoading } = useUserProfile();
  const { isFree } = useTier();
  const firestore = useFirestore();
  const [dialogState, setDialogState] = useState<{ open: boolean; type: 'income' | 'expense' | 'stock' | null }>({ open: false, type: null });

  const businessId = profile?.businessId;
  const ownerId = user?.uid;

  const inventoryCollectionRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/inventory_items`) : null),
    [firestore, businessId]
  );
  const { data: inventory, isLoading: isInventoryLoading } = useCollection<InventoryItem>(inventoryCollectionRef);

  const transactionsCollectionRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/transactions`) : null),
    [firestore, businessId]
  );
  const { data: transactions } = useCollection<Transaction>(transactionsCollectionRef);

  const currentMonthTxCount = useMemo(() => {
    if (!transactions) return 0;
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return transactions.filter(t => isWithinInterval(new Date(t.timestamp), { start, end })).length;
  }, [transactions]);

  const activeInventoryCount = useMemo(() => {
    if (!inventory) return 0;
    return inventory.filter(i => !i.isArchived).length;
  }, [inventory]);

  const categories = useMemo(() => {
    if (!inventory) return [];
    return [...new Set(inventory.map(item => item.category).filter(Boolean) as string[])].sort();
  }, [inventory]);

  const txLimitReached = isFree && currentMonthTxCount >= 50;
  const inventoryLimitReached = isFree && activeInventoryCount >= 10;

  const handleLogSale = () => {
    if (!isProfileComplete || isLoading || txLimitReached) return;
    setDialogState({ open: true, type: 'income' });
  };

  const handleLogExpense = () => {
    if (!isProfileComplete || isLoading || txLimitReached) return;
    setDialogState({ open: true, type: 'expense' });
  };
  
  const handleAddStock = () => {
    if (!isProfileComplete || isLoading || inventoryLimitReached) return;
    setDialogState({ open: true, type: 'stock' });
  };

  const handleDialogClose = () => {
    setDialogState({ open: false, type: null });
  };

  const isTransactionDialog = dialogState.type === 'income' || dialogState.type === 'expense';
  const isInventoryDialog = dialogState.type === 'stock';
  const isLoading = isProfileLoading || isInventoryLoading;

  const ActionButton = ({ onClick, icon: Icon, label, variant = "default" as const, disabled = false, limitReached = false, limitType = "" }) => {
    const isActuallyDisabled = disabled || isLoading || limitReached;
    
    const button = (
      <Button 
        size="lg" 
        className={cn(
          "h-16 md:h-24 text-base md:text-lg w-full relative transition-all duration-300 ease-out border-none",
          !isActuallyDisabled && "hover:-translate-y-2 hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.2)] hover:shadow-primary/30 hover:brightness-110 active:scale-95",
          isActuallyDisabled && "opacity-50 grayscale cursor-not-allowed",
          variant === 'default' ? "bg-primary shadow-lg shadow-primary/20" : "bg-secondary shadow-lg shadow-secondary/10"
        )} 
        variant={variant} 
        onClick={onClick} 
        disabled={isActuallyDisabled}
      >
        <Icon className="mr-4 h-6 w-6 md:h-8 md:w-8" />
        <div className="flex flex-col items-start">
          <span>{label}</span>
          {limitReached && (
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-primary/60">Limit Reached</span>
          )}
        </div>
        {(isActuallyDisabled && !isLoading) && (
          <Lock className="absolute top-2 right-2 h-3 w-3 md:h-4 md:w-4 opacity-50" />
        )}
      </Button>
    );

    if (limitReached) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full relative">
                {button}
                <Link href="/pricing" className="absolute -bottom-2 right-2 bg-primary text-white p-1 rounded-full shadow-lg hover:scale-110 transition-transform">
                  <ArrowUpCircle className="h-4 w-4" />
                </Link>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px]">
              <p className="text-center">Free plan is limited to {limitType}. Upgrade to Pro for unlimited access!</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (disabled && !isLoading && !isProfileComplete) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">{button}</div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Please complete your business profile setup to enable this feature.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return button;
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:gap-6 sm:grid-cols-3">
        <ActionButton 
          label="Log Sale"
          icon={PlusCircle}
          onClick={handleLogSale}
          disabled={isLoading || !businessId || !isProfileComplete}
          limitReached={txLimitReached}
          limitType="50 transactions/mo"
        />
        <ActionButton 
          label="Log Expense"
          icon={MinusCircle}
          variant="secondary"
          onClick={handleLogExpense}
          disabled={isLoading || !businessId || !isProfileComplete}
          limitReached={txLimitReached}
          limitType="50 transactions/mo"
        />
        <ActionButton 
          label="Add Stock"
          icon={PackagePlus}
          variant="secondary"
          onClick={handleAddStock}
          disabled={isLoading || !businessId || !isProfileComplete}
          limitReached={inventoryLimitReached}
          limitType="10 active items"
        />
      </div>
      
      {businessId && ownerId && isTransactionDialog && (
        <TransactionDialog
          businessId={businessId}
          ownerId={ownerId}
          type={dialogState.type as 'income' | 'expense'}
          open={dialogState.open}
          onOpenChange={handleDialogClose}
        />
      )}

      {businessId && ownerId && isInventoryDialog && (
        <InventoryDialog 
          businessId={businessId}
          ownerId={ownerId}
          open={dialogState.open}
          onOpenChange={handleDialogClose}
          categories={categories}
        />
      )}
    </>
  );
}