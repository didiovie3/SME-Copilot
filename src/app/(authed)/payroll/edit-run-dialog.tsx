'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirestore, updateDocumentNonBlocking, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { calculateNetPay } from '@/lib/payroll-utils';
import type { PayrollRun, StaffPaymentRecord } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save } from 'lucide-react';

interface EditRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  run?: PayrollRun;
}

export function EditRunDialog({ open, onOpenChange, businessId, run }: EditRunDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [editedPayments, setEditedPayments] = useState<StaffPaymentRecord[]>([]);

  useEffect(() => {
    if (run) {
      setEditedPayments([...run.staffPayments]);
    }
  }, [run, open]);

  const handleFieldChange = (staffId: string, field: keyof StaffPaymentRecord, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedPayments(prev => prev.map(p => {
      if (p.staffId === staffId) {
        const updated = { ...p, [field]: numValue };
        // Recalculate net pay
        updated.netPay = calculateNetPay(
          updated.grossSalary, 
          updated.taxDeduction, 
          updated.pensionDeduction, 
          updated.otherDeductions
        );
        return updated;
      }
      return p;
    }));
  };

  const onSave = async () => {
    if (!firestore || !run || !user) return;
    setIsSaving(true);

    try {
      const runRef = doc(firestore, `businesses/${businessId}/payroll_runs`, run.id);
      
      const totalTax = editedPayments.reduce((sum, p) => sum + p.taxDeduction, 0);
      const totalPension = editedPayments.reduce((sum, p) => sum + p.pensionDeduction, 0);
      const totalOther = editedPayments.reduce((sum, p) => sum + (p.otherDeductions || 0), 0);
      const totalNet = editedPayments.reduce((sum, p) => sum + p.netPay, 0);

      const updateData = {
        staffPayments: editedPayments,
        totalTax,
        totalPension,
        totalOther,
        totalNet,
        lastEditedBy: user.uid,
        lastEditedAt: new Date().toISOString()
      };

      await updateDocumentNonBlocking(runRef, updateData);
      toast({ title: 'Record Updated', description: `Payroll for ${run.monthLabel} has been adjusted.` });
      onOpenChange(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save payroll changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!run) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Edit Payroll Record: {run.monthLabel}</DialogTitle>
          <DialogDescription>Adjust manual deductions for this period. Net Pay will be updated automatically.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead className="text-right">Gross (₦)</TableHead>
                  <TableHead className="text-right">Tax (₦)</TableHead>
                  <TableHead className="text-right">Pension (₦)</TableHead>
                  <TableHead className="text-right">Other (₦)</TableHead>
                  <TableHead className="text-right">Net Pay (₦)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedPayments.map((p) => (
                  <TableRow key={p.staffId}>
                    <TableCell className="font-bold">{p.staffName}</TableCell>
                    <TableCell className="text-right">₦{p.grossSalary.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Input 
                        type="number" 
                        className="w-24 ml-auto h-8 text-right" 
                        value={p.taxDeduction ?? 0}
                        onChange={(e) => handleFieldChange(p.staffId, 'taxDeduction', e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input 
                        type="number" 
                        className="w-24 ml-auto h-8 text-right" 
                        value={p.pensionDeduction ?? 0}
                        onChange={(e) => handleFieldChange(p.staffId, 'pensionDeduction', e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input 
                        type="number" 
                        className="w-24 ml-auto h-8 text-right" 
                        value={p.otherDeductions ?? 0}
                        onChange={(e) => handleFieldChange(p.staffId, 'otherDeductions', e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm font-black text-accent">₦{p.netPay.toLocaleString()}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-muted/10">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
