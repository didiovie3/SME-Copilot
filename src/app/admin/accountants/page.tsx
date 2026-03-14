
'use client';

import React, { useState, useMemo } from 'react';
import { 
  UserCheck, 
  UserPlus, 
  Search, 
  MoreHorizontal, 
  Mail, 
  ShieldCheck, 
  Briefcase,
  Loader2,
  ChevronRight,
  Ban,
  ShieldAlert,
  Building2
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import type { UserProfile, Business } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { logAdminAction } from '@/lib/admin-logger';
import { useAdmin } from '@/hooks/use-admin';

export default function AdminAccountantListPage() {
  const firestore = useFirestore();
  const { profile: adminProfile } = useAdmin();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newAccountant, setNewAccountant] = useState({ name: '', email: '', role: 'accountant' });

  // Data Fetching
  const accountantsRef = useMemoFirebase(
    () => (firestore ? query(
      collection(firestore, 'user_profiles'), 
      where('role', 'in', ['accountant', 'accountantAdmin'])
    ) : null),
    [firestore]
  );
  const { data: accountants, isLoading } = useCollection<UserProfile>(accountantsRef);

  const businessesRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'businesses') : null),
    [firestore]
  );
  const { data: allBusinesses } = useCollection<Business>(businessesRef);

  const filteredAccountants = useMemo(() => {
    if (!accountants) return [];
    return accountants.filter(a => 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [accountants, searchQuery]);

  const handleAddAccountant = async () => {
    if (!firestore || !newAccountant.email || !newAccountant.name || !adminProfile) return;
    setIsSaving(true);

    try {
      const userId = newAccountant.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_') + '_' + Math.floor(Math.random() * 1000);
      const userRef = doc(firestore, 'user_profiles', userId);
      
      await setDocumentNonBlocking(userRef, {
        id: userId,
        email: newAccountant.email.trim().toLowerCase(),
        name: newAccountant.name.trim(),
        role: newAccountant.role,
        status: 'active',
        createdAt: new Date().toISOString(),
        clientList: []
      });

      // Log Activity
      await logAdminAction(firestore, { uid: adminProfile.uid, name: adminProfile.name }, {
        action: 'Staff Registered',
        targetType: 'user',
        targetId: userId,
        targetName: newAccountant.name,
        details: `Created new professional profile with role: ${newAccountant.role}.`
      });

      toast({ 
        title: "Accountant Registered", 
        description: `Profile created for ${newAccountant.name}. Invitation email would be sent in production.` 
      });
      setIsAddOpen(false);
      setNewAccountant({ name: '', email: '', role: 'accountant' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleRole = async (user: UserProfile) => {
    if (!firestore || !adminProfile) return;
    const newRole = user.role === 'accountant' ? 'accountantAdmin' : 'accountant';
    await updateDocumentNonBlocking(doc(firestore, 'user_profiles', user.id), { role: newRole });

    // Log Activity
    await logAdminAction(firestore, { uid: adminProfile.uid, name: adminProfile.name }, {
      action: 'Role Modified',
      targetType: 'accountant',
      targetId: user.id,
      targetName: user.name,
      details: `Accountant role changed to ${newRole}.`
    });

    toast({ title: "Role Updated", description: `${user.name} is now an ${newRole}.` });
  };

  const handleDeactivate = async (user: UserProfile) => {
    if (!firestore || !adminProfile) return;
    const nextStatus = user.status === 'inactive' ? 'active' : 'inactive';
    await updateDocumentNonBlocking(doc(firestore, 'user_profiles', user.id), { status: nextStatus });

    // Log Activity
    await logAdminAction(firestore, { uid: adminProfile.uid, name: adminProfile.name }, {
      action: nextStatus === 'active' ? 'Staff Reactivated' : 'Staff Deactivated',
      targetType: 'accountant',
      targetId: user.id,
      targetName: user.name,
      details: `Professional status changed to ${nextStatus}.`
    });

    toast({ title: `User ${nextStatus}`, description: `Access has been ${nextStatus === 'active' ? 'restored' : 'revoked'}.` });
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            Professional Staff Directory
          </h1>
          <p className="text-muted-foreground text-sm">Manage human accountants and platform moderators.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
          <UserPlus className="h-4 w-4" />
          Add Accountant
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-card/50">
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Accountant Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Active Clients</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccountants.map((a) => {
                const assignedClients = allBusinesses?.filter(b => b.assignedAccountant?.uid === a.id) || [];
                const clientCount = a.clientList?.length || assignedClients.length;

                return (
                  <TableRow key={a.id} className="group hover:bg-muted/20">
                    <TableCell className="font-bold text-sm">
                      <Link href={`/admin/accountants/${a.id}`} className="hover:underline flex items-center gap-2">
                        {a.name}
                        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {a.role === 'accountantAdmin' ? 'Staff Manager' : 'Professional'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "text-xs font-black",
                          clientCount > 7 ? "text-destructive" : clientCount > 4 ? "text-amber-600" : "text-accent"
                        )}>
                          {clientCount} Businesses
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.status === 'inactive' ? 'destructive' : 'default'} className="text-[9px] uppercase">
                        {a.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Audit Tools</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/accountants/${a.id}`} className="flex items-center">
                              <Briefcase className="h-4 w-4 mr-2" /> View Workload
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleRole(a)}>
                            <ShieldCheck className="h-4 w-4 mr-2" /> 
                            Convert to {a.role === 'accountant' ? 'Admin' : 'Accountant'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeactivate(a)} className={cn(a.status === 'inactive' ? "text-accent" : "text-destructive")}>
                            {a.status === 'inactive' ? <ShieldCheck className="h-4 w-4 mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                            {a.status === 'inactive' ? 'Reactivate' : 'Deactivate User'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ADD ACCOUNTANT DIALOG */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Professional Staff</DialogTitle>
            <DialogDescription>Create a managed profile for an accountant or platform administrator.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                placeholder="e.g. Sarah Accountant" 
                value={newAccountant.name}
                onChange={(e) => setNewAccountant({...newAccountant, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input 
                type="email"
                placeholder="sarah@uruvia.com" 
                value={newAccountant.email}
                onChange={(e) => setNewAccountant({...newAccountant, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned Role</Label>
              <Select value={newAccountant.role} onValueChange={(v) => setNewAccountant({...newAccountant, role: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accountant">Standard Accountant</SelectItem>
                  <SelectItem value="accountantAdmin">Accountant Admin (Moderator)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAccountant} disabled={isSaving || !newAccountant.email}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Create Staff Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
