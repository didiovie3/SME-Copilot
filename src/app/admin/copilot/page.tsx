
'use client';

import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  Search, 
  Filter, 
  UserCheck, 
  ShieldCheck, 
  Clock, 
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Loader2,
  RefreshCw,
  MoreHorizontal
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Business, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { logAdminAction } from '@/lib/admin-logger';
import { useAdmin } from '@/hooks/use-admin';

export default function AdminCopilotManagementPage() {
  const firestore = useFirestore();
  const { profile: adminProfile } = useAdmin();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // 1. Fetch Copilot Businesses
  const copilotRef = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'businesses'), where('subscription.tier', '==', 'copilot')) : null),
    [firestore]
  );
  const { data: businesses, isLoading: isBizLoading } = useCollection<Business>(copilotRef);

  // 2. Fetch Accountants for the assignment dropdown
  const accountantsRef = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'user_profiles'), where('role', 'in', ['accountant', 'accountantAdmin'])) : null),
    [firestore]
  );
  const { data: accountants, isLoading: isStaffLoading } = useCollection<UserProfile>(accountantsRef);

  const filteredBusinesses = useMemo(() => {
    if (!businesses) return [];
    return businesses.filter(b => b.profile.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [businesses, searchQuery]);

  const handleAssignAccountant = async (businessId: string, accountant: UserProfile) => {
    if (!firestore || !adminProfile) return;
    setIsUpdating(businessId);

    const businessRef = doc(firestore, 'businesses', businessId);
    const targetBusiness = businesses?.find(b => b.id === businessId);
    const oldAccountantId = targetBusiness?.assignedAccountant?.uid;

    try {
      const batch = writeBatch(firestore);

      // A. Update Business Record
      batch.update(businessRef, {
        assignedAccountant: {
          uid: accountant.id,
          name: accountant.name,
          assignedAt: new Date().toISOString()
        },
        'subscription.assignedAccountantName': accountant.name,
        'subscription.assignedAccountantId': accountant.id
      });

      // B. Update New Accountant's Client List
      const newAccRef = doc(firestore, 'user_profiles', accountant.id);
      batch.update(newAccRef, {
        clientList: arrayUnion(businessId)
      });

      // C. Remove from Old Accountant's List (if exists)
      if (oldAccountantId && oldAccountantId !== accountant.id) {
        const oldAccRef = doc(firestore, 'user_profiles', oldAccountantId);
        batch.update(oldAccRef, {
          clientList: arrayRemove(businessId)
        });
      }

      await batch.commit();

      // Log Activity
      await logAdminAction(firestore, { uid: adminProfile.uid, name: adminProfile.name }, {
        action: 'Accountant Assigned',
        targetType: 'accountant',
        targetId: accountant.id,
        targetName: accountant.name,
        details: `Linked to business: ${targetBusiness?.profile.name}.`
      });

      toast({ title: "Accountant Assigned", description: `${accountant.name} is now managing ${targetBusiness?.profile.name}.` });
    } catch (e) {
      toast({ variant: 'destructive', title: "Assignment Failed", description: "Could not link professional to business." });
    } finally {
      setIsUpdating(null);
    }
  };

  if (isBizLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-[500px] w-full" /></div>;
  }

  // Safe Total Calculation
  const totalContractValue = (businesses || []).reduce((sum, b) => sum + (b.subscription?.monthlyAmount || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          SME Copilot Command
        </h1>
        <p className="text-muted-foreground text-sm">Monitor managed portfolios and professional assignments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase text-primary/60">Managed Portfolio</CardDescription>
            <CardTitle className="text-2xl">{businesses?.length || 0} SMEs</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-accent/5 border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase text-accent">Deployment Rate</CardDescription>
            <CardTitle className="text-2xl">
              {businesses?.filter(b => !!b.assignedAccountant).length || 0} / {businesses?.length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-[#0D1B2A] border-none shadow-sm text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase text-white/40">Total Contract Value</CardDescription>
            <CardTitle className="text-2xl">
              ₦{totalContractValue.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-card/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search business name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Business Entity</TableHead>
                <TableHead className="text-right">Contract (₦)</TableHead>
                <TableHead className="text-center">Billing Status</TableHead>
                <TableHead>Assigned Professional</TableHead>
                <TableHead>Client Since</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBusinesses.map((b) => (
                <TableRow key={b.id} className="group hover:bg-muted/20">
                  <TableCell className="font-bold text-sm">
                    <div className="flex flex-col">
                      {b.profile.name}
                      <span className="text-[9px] font-mono text-muted-foreground uppercase">{b.id}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black text-xs">
                    ₦{(b.subscription?.monthlyAmount || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn(
                      "text-[9px] uppercase font-black",
                      b.subscription?.paymentStatus === 'paid' ? "text-accent border-accent/20" : "text-destructive border-destructive/20"
                    )}>
                      {b.subscription?.paymentStatus || 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isUpdating === b.id ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Updating...
                        </div>
                      ) : (
                        <Select 
                          value={b.assignedAccountant?.uid || 'unassigned'} 
                          onValueChange={(accId) => {
                            const acc = accountants?.find(a => a.id === accId);
                            if (acc) handleAssignAccountant(b.id, acc);
                          }}
                        >
                          <SelectTrigger className={cn(
                            "h-8 text-xs border-dashed w-[200px]",
                            !b.assignedAccountant && "bg-orange-500/5 text-orange-600 border-orange-200"
                          )}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            <SelectGroup>
                              <SelectLabel>Available Professionals</SelectLabel>
                              {accountants?.map(acc => {
                                const count = acc.clientList?.length || 0;
                                return (
                                  <SelectItem key={acc.id} value={acc.id}>
                                    {acc.name} ({count} clients)
                                  </SelectItem>
                                );
                              })}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">
                    {b.createdAt ? format(new Date(b.createdAt as any), 'MMM dd, yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/businesses/${b.id}`} className="flex items-center">
                            <ShieldCheck className="h-4 w-4 mr-2" /> Audit Business
                          </Link>
                        </DropdownMenuItem>
                        {b.assignedAccountant && (
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/accountants/${b.assignedAccountant.uid}`} className="flex items-center">
                              <UserCheck className="h-4 w-4 mr-2" /> View Accountant
                            </Link>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
