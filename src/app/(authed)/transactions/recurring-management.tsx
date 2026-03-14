'use client';

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Pause, 
  Play, 
  Trash2, 
  CalendarClock, 
  Clock,
  ArrowRight,
  TrendingUp,
  Inbox
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import type { RecurringExpense } from "@/lib/types";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface RecurringManagementProps {
  businessId: string;
}

export function RecurringManagement({ businessId }: RecurringManagementProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const recurringRef = useMemoFirebase(
    () => (firestore ? collection(firestore, `businesses/${businessId}/recurring_expenses`) : null),
    [firestore, businessId]
  );
  const { data: templates, isLoading } = useCollection<RecurringExpense>(recurringRef);

  const handleToggleStatus = (template: RecurringExpense) => {
    if (!firestore) return;
    const docRef = doc(firestore, `businesses/${businessId}/recurring_expenses`, template.id);
    const nextStatus = !template.isActive;
    updateDocumentNonBlocking(docRef, { isActive: nextStatus });
    
    toast({ 
      title: nextStatus ? 'Automation Resumed' : 'Automation Paused', 
      description: `Future ${template.expenseName} logs are now ${nextStatus ? 'active' : 'on hold'}.` 
    });
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, `businesses/${businessId}/recurring_expenses`, id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Automation Deleted', description: 'This expense will no longer log automatically.' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl opacity-60">
        <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm font-medium">No active automations</p>
        <p className="text-xs text-muted-foreground mt-1">Log an expense and toggle "Automate" to see it here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead>Automation Label</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead className="text-center">Next Run</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((t) => (
            <TableRow key={t.id} className={!t.isActive ? "opacity-50 grayscale" : ""}>
              <TableCell className="font-bold">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  {t.expenseName}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{t.categoryName}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{t.categoryGroup}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize text-[10px]">{t.frequency}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {format(new Date(t.nextDueDate), 'MMM dd, yyyy')}
                </div>
              </TableCell>
              <TableCell className="text-right font-bold text-destructive">
                ₦{t.amount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0" 
                    onClick={() => handleToggleStatus(t)}
                  >
                    {t.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" 
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
