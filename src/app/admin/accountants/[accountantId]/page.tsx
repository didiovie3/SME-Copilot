
'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  useFirestore, 
  useDoc, 
  useCollection, 
  useMemoFirebase,
  updateDocumentNonBlocking
} from '@/firebase';
import { doc, collection, query, where, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { UserProfile, Business } from '@/lib/types';
import { 
  UserCheck, 
  Briefcase, 
  ChevronLeft, 
  ChevronRight,
  Mail, 
  Calendar,
  Building2,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Loader2,
  CheckCircle2
} from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AdminAccountantDetailPage() {
  const { accountantId } = useParams() as { accountantId: string };
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [targetAccountantId, setTargetAccountantId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Fetch Accountant Profile
  const accountantRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'user_profiles', accountantId) : null),
    [firestore, accountantId]
  );
  const { data: accountant, isLoading: isAccLoading } = useDoc<UserProfile>(accountantRef);

  // 2. Fetch Assigned Businesses
  const assignedRef = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'businesses'), where('assignedAccountant.uid', '==', accountantId)) : null),
    [firestore, accountantId]
  );
  const { data: assignedSMEs, isLoading: isSmesLoading } = useCollection<Business>(assignedRef);

  // 3. Fetch all accountants for reassignment
  const allAccRef = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'user_profiles'), where('role', 'in', ['accountant', 'accountantAdmin'])) : null),
    [firestore]
  );
  const { data: otherAccountants } = useCollection<UserProfile>(allAccRef);

  const handleBulkReassign = async () => {
    if (!firestore || !targetAccountantId || !assignedSMEs) return;
    setIsProcessing(true);

    const targetAcc = otherAccountants?.find(a => a.id === targetAccountantId);
    if (!targetAcc) return;

    try {
      const batch = writeBatch(firestore);
      const now = new Date().toISOString();

      // 1. Update each business
      assignedSMEs.forEach(biz => {
        batch.update(doc(firestore, 'businesses', biz.id), {
          assignedAccountant: {
            uid: targetAcc.id,
            name: targetAcc.name,
            assignedAt: now
          },
          'subscription.assignedAccountantName': targetAcc.name,
          'subscription.assignedAccountantId': targetAcc.id
        });
      });

      // 2. Clear current accountant's list
      batch.update(doc(firestore, 'user_profiles', accountantId), {
        clientList: []
      });

      // 3. Add to target accountant's list
      batch.update(doc(firestore, 'user_profiles', targetAccountantId), {
        clientList: arrayUnion(...assignedSMEs.map(b => b.id))
      });

      await batch.commit();
      toast({ title: "Migration Complete", description: `Reassigned ${assignedSMEs.length} businesses to ${targetAcc.name}.` });
      setIsReassignOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: "Reassignment Failed", description: "Batch operation could not be completed." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isAccLoading) {
    return <div className="space-y-8"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!accountant) return <div className="p-20 text-center italic">Accountant profile not found.</div>;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black">{accountant.name}</h1>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">{accountant.role.replace('Admin', ' Admin')}</p>
          </div>
        </div>
        {assignedSMEs && assignedSMEs.length > 0 && (
          <Button variant="outline" size="sm" className="gap-2 border-primary/20 text-primary" onClick={() => setIsReassignOpen(true)}>
            <RefreshCw className="h-4 w-4" />
            Migrate All Clients
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Workload Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-primary/5 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-bold uppercase">Total Assignments</CardDescription>
                <CardTitle className="text-2xl">{assignedSMEs?.length || 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-accent/5 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-bold uppercase">Paid Active SMEs</CardDescription>
                <CardTitle className="text-2xl">
                  {assignedSMEs?.filter(b => b.subscription?.paymentStatus === 'paid').length || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-destructive/5 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-bold uppercase">Overdue Audits</CardDescription>
                <CardTitle className="text-2xl text-destructive">
                  {assignedSMEs?.filter(b => b.subscription?.paymentStatus !== 'paid').length || 0}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Managed Client Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Business Name</TableHead>
                    <TableHead>Monthly Revenue</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSmesLoading ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                  ) : !assignedSMEs || assignedSMEs.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center italic text-muted-foreground">No businesses currently assigned.</TableCell></TableRow>
                  ) : (
                    assignedSMEs.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-bold text-xs">{b.profile.name}</TableCell>
                        <TableCell className="text-xs font-black">₦{(b.subscription?.monthlyAmount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "text-[10px] uppercase",
                            b.subscription?.paymentStatus === 'paid' ? "text-accent" : "text-destructive"
                          )}>
                            {b.subscription?.paymentStatus || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm" className="h-8">
                            <Link href={`/admin/businesses/${b.id}`}>
                              Open Audit <ChevronRight className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-sm font-black uppercase">Accountant Profile</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Work Email</Label>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-primary" /> {accountant.email}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Join Date</Label>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> 
                  {accountant.createdAt ? format(new Date(accountant.createdAt), 'MMMM dd, yyyy') : 'Standard Join'}
                </p>
              </div>
              <div className="pt-4 border-t">
                <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                  This professional is verified to access the financial ledgers of all businesses listed in their portfolio.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* REASSIGN DIALOG */}
      <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Client Migration</DialogTitle>
            <DialogDescription>
              Move all {assignedSMEs?.length} clients from **{accountant.name}** to another professional.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Target Professional</Label>
              <Select value={targetAccountantId} onValueChange={setTargetAccountantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new accountant..." />
                </SelectTrigger>
                <SelectContent>
                  {otherAccountants?.filter(a => a.id !== accountantId).map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.clientList?.length || 0} clients)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Alert className="bg-orange-500/5 border-orange-200">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <p className="text-xs font-medium text-orange-900">
                This will instantly update the access permissions for all assigned SMEs.
              </p>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReassignOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkReassign} disabled={isProcessing || !targetAccountantId}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Confirm Reassignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
