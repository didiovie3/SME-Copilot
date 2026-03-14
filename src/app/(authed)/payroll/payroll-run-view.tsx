
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, query, where, getDoc } from 'firebase/firestore';
import type { PayrollStaff, UserProfile, PayrollRecord } from '@/lib/types';
import { calculateNetPay } from '@/lib/payroll-utils';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  Loader2, 
  AlertCircle, 
  Calculator,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PayrollRunViewProps {
  businessId: string;
  profile: UserProfile;
  staff: PayrollStaff[];
  isCopilot: boolean;
  selectedMonth: string;
}

export function PayrollRunView({ businessId, profile, staff, isCopilot, selectedMonth }: PayrollRunViewProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmStaff, setConfirmStaff] = useState<PayrollStaff | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const activeStaff = useMemo(() => staff.filter(s => s.status === 'active'), [staff]);
  
  // Real-time listener for payroll status this month using FLAT structure and month filter
  const payrollRecordsRef = useMemoFirebase(
    () => {
      if (!firestore || !businessId) return null;
      return query(
        collection(firestore, `businesses/${businessId}/payroll`),
        where('month', '==', selectedMonth)
      );
    },
    [firestore, businessId, selectedMonth]
  );
  const { data: payrollRecords, isLoading: isRecordsLoading } = useCollection<PayrollRecord>(payrollRecordsRef);

  // Local state for manual deductions
  const [deductions, setDeductions] = useState<Record<string, { tax: number, pension: number, other: number }>>({});

  useEffect(() => {
    const initial: Record<string, { tax: number, pension: number, other: number }> = {};
    activeStaff.forEach(s => {
      const existing = payrollRecords?.find(r => r.staffId === s.id);
      initial[s.id] = { 
        tax: existing?.taxDeduction ?? 0, 
        pension: existing?.pensionDeduction ?? 0, 
        other: existing?.otherDeductions ?? 0 
      };
    });
    setDeductions(initial);
  }, [activeStaff, payrollRecords]);

  const handleDeductionChange = (staffId: string, field: 'tax' | 'pension' | 'other', value: string) => {
    const numValue = parseFloat(value) || 0;
    setDeductions(prev => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] || { tax: 0, pension: 0, other: 0 }),
        [field]: numValue
      }
    }));
  };

  const staffStatusMap = useMemo(() => {
    const map: Record<string, PayrollRecord> = {};
    payrollRecords?.forEach(r => {
      map[r.staffId] = r;
    });
    return map;
  }, [payrollRecords]);

  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const isPastMonth = selectedMonth < currentMonthStr;
  const isCurrentMonth = selectedMonth === currentMonthStr;

  const payrollSummary = useMemo(() => {
    return activeStaff.map(s => {
      const status = staffStatusMap[s.id];
      const d = deductions[s.id] || { tax: 0, pension: 0, other: 0 };
      const netPay = status?.status === 'processed' 
        ? status.netPay 
        : calculateNetPay(s.monthlyGrossSalary, d.tax, d.pension, d.other);
      
      return {
        staff: s,
        status: status?.status || 'pending',
        record: status,
        tax: d.tax,
        pension: d.pension,
        other: d.other,
        netPay
      };
    });
  }, [activeStaff, deductions, staffStatusMap]);

  const totals = useMemo(() => {
    return payrollSummary.reduce((acc, item) => ({
      gross: acc.gross + item.staff.monthlyGrossSalary,
      net: acc.net + item.netPay,
      tax: acc.tax + (item.tax ?? 0),
      pension: acc.pension + (item.pension ?? 0),
      other: acc.other + (item.other ?? 0),
      processed: acc.processed + (item.status === 'processed' ? 1 : 0),
      pending: acc.pending + (item.status === 'pending' ? 1 : 0)
    }), { gross: 0, net: 0, tax: 0, pension: 0, other: 0, processed: 0, pending: 0 });
  }, [payrollSummary]);

  const processStaffSalary = async (targetStaff: PayrollStaff) => {
    if (!firestore || !businessId) return;
    
    setIsProcessing(true);
    try {
      const d = deductions[targetStaff.id] || { tax: 0, pension: 0, other: 0 };
      const netPay = calculateNetPay(targetStaff.monthlyGrossSalary, d.tax, d.pension, d.other);
      const monthLabel = format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy');

      // FLAT ID: staffId_YYYY-MM
      const payrollDocId = `${targetStaff.id}_${selectedMonth}`;
      const payrollDocRef = doc(firestore, `businesses/${businessId}/payroll`, payrollDocId);
      
      // Idempotency Check
      const snap = await getDoc(payrollDocRef);
      if (snap.exists() && snap.data().status === 'processed') {
        toast({ variant: 'destructive', title: 'Already Processed', description: `${targetStaff.fullName} has already been paid for this month.` });
        setIsProcessing(false);
        setConfirmStaff(null);
        return;
      }

      const batch = writeBatch(firestore);
      const txRef = doc(collection(firestore, `businesses/${businessId}/transactions`));

      // Transaction Log
      batch.set(txRef, {
        id: txRef.id,
        businessId,
        ownerId: profile.authId || profile.id,
        type: 'expense',
        amount: targetStaff.monthlyGrossSalary,
        category: 'Staff Salary',
        categoryName: 'Staff Salary',
        categoryGroup: 'Staff & Admin',
        paymentMethod: 'transfer',
        timestamp: new Date().toISOString(),
        description: `Salary Payment: ${targetStaff.fullName} - ${monthLabel}`,
        isPayroll: true
      });

      // Payroll Status Record (Flat Path)
      batch.set(payrollDocRef, {
        id: payrollDocId,
        staffId: targetStaff.id,
        staffName: targetStaff.fullName,
        role: targetStaff.role,
        grossSalary: targetStaff.monthlyGrossSalary,
        taxDeduction: d.tax,
        pensionDeduction: d.pension,
        otherDeductions: d.other,
        netPay,
        status: 'processed',
        transactionId: txRef.id,
        processedAt: new Date().toISOString(),
        processedBy: profile.name,
        month: selectedMonth
      }, { merge: true });

      await batch.commit();
      toast({ title: 'Salary Processed', description: `Successfully logged payment for ${targetStaff.fullName}.` });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Processing Failed', description: 'Transaction could not be completed.' });
    } finally {
      setIsProcessing(false);
      setConfirmStaff(null);
    }
  };

  const handleBulkProcess = async () => {
    if (!firestore || !businessId) return;
    const pending = payrollSummary.filter(p => p.status === 'pending');
    if (pending.length === 0) return;

    setIsBulkProcessing(true);
    let successCount = 0;

    for (const item of pending) {
      try {
        await processStaffSalary(item.staff);
        successCount++;
      } catch (e) {
        console.error(`Failed bulk processing for ${item.staff.fullName}`);
      }
    }

    toast({ title: 'Bulk Run Complete', description: `Processed ${successCount} staff members.` });
    setIsBulkProcessing(false);
  };

  if (activeStaff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl opacity-60">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm font-medium">No active staff found</p>
        <p className="text-xs text-muted-foreground mt-1">Activate staff members in the Directory to run payroll.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Gross Cost</CardDescription>
            <CardTitle className="text-lg">₦{totals.gross.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-destructive/5 border-destructive/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Total Tax</CardDescription>
            <CardTitle className="text-lg">₦{totals.tax.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-destructive/5 border-destructive/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Pension</CardDescription>
            <CardTitle className="text-lg">₦{totals.pension.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-destructive/5 border-destructive/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Other Ded.</CardDescription>
            <CardTitle className="text-lg">₦{totals.other.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-accent/5 border-accent/10">
          <CardHeader className="pb-2 text-accent">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Net Outflow</CardDescription>
            <CardTitle className="text-lg">₦{totals.net.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Ledger Period: {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
              </CardTitle>
              <CardDescription>
                {isPastMonth 
                  ? "Historical read-only view of processed salaries." 
                  : "Enter deductions and process salaries individually."}
              </CardDescription>
            </div>
            {isCurrentMonth && totals.pending > 0 && !isCopilot && (
              <Button onClick={handleBulkProcess} variant="outline" disabled={isBulkProcessing} className="gap-2 border-primary/20 hover:bg-primary/5">
                {isBulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Process All Pending
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Staff Name</TableHead>
                <TableHead className="text-right">Gross (₦)</TableHead>
                <TableHead className="text-right">Tax (₦)</TableHead>
                <TableHead className="text-right">Pension (₦)</TableHead>
                <TableHead className="text-right">Other (₦)</TableHead>
                <TableHead className="text-right">Net Pay (₦)</TableHead>
                <TableHead className="text-right">Status & Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollSummary.map((item) => {
                const isProcessed = item.status === 'processed';
                return (
                  <TableRow key={item.staff.id} className={cn(isProcessed && "bg-accent/5")}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{item.staff.fullName}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{item.staff.role}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">₦{item.staff.monthlyGrossSalary.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Input 
                        type="number" 
                        className="w-24 ml-auto h-8 text-right bg-background" 
                        value={item.tax ?? 0} 
                        onChange={(e) => handleDeductionChange(item.staff.id, 'tax', e.target.value)}
                        disabled={isProcessed || !isCurrentMonth}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input 
                        type="number" 
                        className="w-24 ml-auto h-8 text-right bg-background" 
                        value={item.pension ?? 0} 
                        onChange={(e) => handleDeductionChange(item.staff.id, 'pension', e.target.value)}
                        disabled={isProcessed || !isCurrentMonth}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input 
                        type="number" 
                        className="w-24 ml-auto h-8 text-right bg-background" 
                        value={item.other ?? 0} 
                        onChange={(e) => handleDeductionChange(item.staff.id, 'other', e.target.value)}
                        disabled={isProcessed || !isCurrentMonth}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={cn("px-2 py-1 rounded border font-black text-sm", isProcessed ? "bg-accent text-white border-accent" : "bg-muted text-foreground border-transparent")}>
                        ₦{item.netPay.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isProcessed ? (
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-accent hover:bg-accent gap-1 text-[10px]">
                            <CheckCircle2 className="h-3 w-3" /> Processed
                          </Badge>
                          {item.record && (
                            <span className="text-[9px] text-muted-foreground">
                              {format(new Date(item.record.processedAt!), 'MMM dd')} · by {item.record.processedBy?.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      ) : isCurrentMonth ? (
                        <Button 
                          size="sm" 
                          className="bg-[#0D1B2A] hover:bg-[#1E2A38] text-white text-[10px] h-8"
                          onClick={() => setConfirmStaff(item.staff)}
                        >
                          Process Salary
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-[10px] opacity-50">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <AlertDialog open={!!confirmStaff} onOpenChange={(open) => !open && setConfirmStaff(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Process Salary for {confirmStaff?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>Review the compensation summary for {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}.</AlertDialogDescription>
          </AlertDialogHeader>
          
          {confirmStaff && (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground uppercase font-bold">Gross Salary</span>
                  <span className="font-bold">₦{confirmStaff.monthlyGrossSalary.toLocaleString()}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-destructive">
                    <span>Tax Deduction</span>
                    <span>-₦{(deductions[confirmStaff.id]?.tax || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-destructive">
                    <span>Pension Deduction</span>
                    <span>-₦{(deductions[confirmStaff.id]?.pension || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-destructive">
                    <span>Other Deductions</span>
                    <span>-₦{(deductions[confirmStaff.id]?.other || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="pt-3 border-t flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-tighter">Net Payable</span>
                  <span className="text-xl font-black text-accent">
                    ₦{calculateNetPay(confirmStaff.monthlyGrossSalary, deductions[confirmStaff.id]?.tax, deductions[confirmStaff.id]?.pension, deductions[confirmStaff.id]?.other).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                This will log a ₦{confirmStaff.monthlyGrossSalary.toLocaleString()} expense transaction under **Staff Salary**. This action cannot be undone.
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmStaff && processStaffSalary(confirmStaff)}
              disabled={isProcessing}
              className="bg-primary shadow-lg shadow-primary/20"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm & Process
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
