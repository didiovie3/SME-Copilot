
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getNextId } from '@/lib/id-generator';
import type { PayrollStaff } from '@/lib/types';
import { User, Briefcase, Landmark, Calendar, ShieldCheck } from 'lucide-react';

const formSchema = z.object({
  fullName: z.string().min(1, 'Full name is required.'),
  role: z.string().min(1, 'Position is required.'),
  department: z.string().optional(),
  monthlyGrossSalary: z.coerce.number().min(1, 'Salary must be greater than zero.'),
  bankName: z.string().min(1, 'Bank name is required.'),
  accountNumber: z.string().min(10, 'Valid account number required.').max(10),
  paymentDate: z.coerce.number().min(1).max(31),
  employmentType: z.enum(['full-time', 'part-time', 'contract']),
  status: z.enum(['active', 'inactive']),
});

type FormValues = z.infer<typeof formSchema>;

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  ownerId: string;
  staff?: PayrollStaff;
}

export default function StaffDialog({ open, onOpenChange, businessId, ownerId, staff }: StaffDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      role: '',
      department: '',
      monthlyGrossSalary: 0,
      bankName: '',
      accountNumber: '',
      paymentDate: 25,
      employmentType: 'full-time',
      status: 'active',
    },
  });

  useEffect(() => {
    if (open) {
      if (staff) {
        form.reset({
          fullName: staff.fullName,
          role: staff.role,
          department: staff.department || '',
          monthlyGrossSalary: staff.monthlyGrossSalary,
          bankName: staff.bankName,
          accountNumber: staff.accountNumber,
          paymentDate: staff.paymentDate,
          employmentType: staff.employmentType,
          status: staff.status,
        });
      } else {
        form.reset({
          fullName: '',
          role: '',
          department: '',
          monthlyGrossSalary: 0,
          bankName: '',
          accountNumber: '',
          paymentDate: 25,
          employmentType: 'full-time',
          status: 'active',
        });
      }
    }
  }, [open, staff, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !businessId) return;
    setIsSaving(true);

    try {
      const staffId = staff?.id || await getNextId(firestore, 'user'); // Use UI prefix for consistency or maybe build a PR one? Using UI for now.
      const docRef = doc(firestore, `businesses/${businessId}/payrollStaff`, staffId);

      const staffData: PayrollStaff = {
        id: staffId,
        businessId,
        ownerId,
        ...values,
        dateAdded: staff?.dateAdded || new Date().toISOString(),
      };

      setDocumentNonBlocking(docRef, staffData);
      toast({ 
        title: staff ? 'Staff Updated' : 'Staff Registered', 
        description: `${values.fullName} has been saved.` 
      });
      onOpenChange(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save staff details.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{staff ? 'Edit Staff Profile' : 'Register New Staff'}</DialogTitle>
          <DialogDescription>Enter employment and compensation details for automated payroll calculation.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal & Role */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <User className="h-3 w-3" /> Basic Info
                </h4>
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position / Role</FormLabel>
                      <FormControl><Input placeholder="Operations Manager" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="employmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employment Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              {/* Compensation & Bank */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Landmark className="h-3 w-3" /> Payroll Details
                </h4>
                <FormField
                  control={form.control}
                  name="monthlyGrossSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Gross Salary (₦)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl><Input placeholder="GTBank, Zenith..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl><Input placeholder="0123456789" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4 border-t">
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Day (Monthly)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : staff ? 'Update Profile' : 'Register Staff'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
