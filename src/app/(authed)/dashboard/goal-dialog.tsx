'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Goal } from '@/lib/types';

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  existingGoal?: Goal;
}

export default function GoalDialog({ open, onOpenChange, businessId, existingGoal }: GoalDialogProps) {
  const [amount, setAmount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setAmount(existingGoal?.amount || 0);
    }
  }, [open, existingGoal]);

  const handleSave = () => {
    if (!firestore || !businessId) return;
    if (amount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Goal', description: 'Goal amount must be greater than zero.' });
      return;
    }

    setIsSaving(true);
    const today = new Date();
    const goalsRef = collection(firestore, `businesses/${businessId}/goals`);

    const goalData = {
      businessId,
      amount,
      month: today.getMonth(),
      year: today.getFullYear(),
      type: 'revenue' as const,
    };

    if (existingGoal) {
      const docRef = doc(firestore, `businesses/${businessId}/goals`, existingGoal.id);
      setDocumentNonBlocking(docRef, goalData, { merge: true });
      toast({ title: 'Goal Updated', description: 'Your monthly revenue target has been adjusted.' });
    } else {
      addDocumentNonBlocking(goalsRef, goalData);
      toast({ title: 'Goal Set', description: 'Your new monthly revenue target is active!' });
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existingGoal ? 'Adjust Monthly Target' : 'Set Monthly Target'}</DialogTitle>
          <DialogDescription>
            What is your revenue goal for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goal-amount">Revenue Target (₦)</Label>
            <Input
              id="goal-amount"
              type="number"
              placeholder="e.g., 500000"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              disabled={isSaving}
            />
            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
              Uruvia uses this to calculate your performance pulse.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Confirm Goal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
