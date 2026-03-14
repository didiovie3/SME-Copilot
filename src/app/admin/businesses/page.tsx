'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Building2, 
  ChevronRight, 
  ShieldCheck,
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
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { useAdmin } from '@/hooks/use-admin';
import { collection } from 'firebase/firestore';
import type { Business } from '@/lib/types';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AdminBusinessListPage() {
  const { user } = useUser();
  const { isAdmin } = useAdmin();
  const firestore = useFirestore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [verifyFilter, setVerifyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const isAuth = !!(user && isAdmin);

  const businessesRef = useMemoFirebase(
    () => (firestore && isAuth ? collection(firestore, 'businesses') : null),
    [firestore, isAuth]
  );
  const { data: businesses, isLoading } = useCollection<Business>(businessesRef);

  const safeFormat = (date: any, formatStr: string = 'MMM dd, yyyy') => {
    if (!date) return '—';
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      if (isNaN(d.getTime())) return '—';
      return format(d, formatStr);
    } catch {
      return '—';
    }
  };

  const filteredBusinesses = useMemo(() => {
    if (!businesses) return [];
    return businesses.filter(b => {
      const name = b.profile?.name || (b as any).name || '';
      const tier = b.subscription?.tier || (b as any).tier || 'free';
      const status = b.subscription?.status || (b as any).status || 'active';
      const isTIN = !!b.tinVerified;
      const isCAC = !!b.cacVerified;
      const verifyStatus = isTIN && isCAC ? 'verified' : (isTIN || isCAC ? 'partial' : 'unverified');

      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = tierFilter === 'all' || tier === tierFilter;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? status === 'active' : status !== 'active');
      const matchesVerify = verifyFilter === 'all' || verifyStatus === verifyFilter;

      return matchesSearch && matchesTier && matchesStatus && matchesVerify;
    });
  }, [businesses, searchQuery, tierFilter, verifyFilter, statusFilter]);

  if (isLoading || !isAuth) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-4 border-b flex gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-10 flex-1" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          Enterprise Directory
        </h1>
        <p className="text-muted-foreground text-sm">Review and manage all registered SME entities.</p>
      </div>

      <Card className="border-none shadow-sm bg-card/50">
        <CardHeader className="pb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search business name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="free">Free Plan</SelectItem>
                <SelectItem value="pro">Pro Plan</SelectItem>
                <SelectItem value="copilot">SME Copilot</SelectItem>
              </SelectContent>
            </Select>
            <Select value={verifyFilter} onValueChange={setVerifyFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Verification Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="verified">Fully Verified</SelectItem>
                <SelectItem value="partial">Partially Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Lifecycle Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lifecycle</SelectItem>
                <SelectItem value="active">Active Accounts</SelectItem>
                <SelectItem value="inactive">Inactive / Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border-t">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Industry & Size</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-center">Verification</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBusinesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic">
                      No businesses found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBusinesses.map((b) => {
                    const tier = b.subscription?.tier || (b as any).tier || 'free';
                    const status = b.subscription?.status || (b as any).status || 'active';
                    
                    return (
                      <TableRow key={b.id} className="group hover:bg-muted/20">
                        <TableCell className="font-bold text-sm">
                          <div className="flex flex-col">
                            {b.profile?.name || (b as any).name || 'Unnamed'}
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">{b.id}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">{b.profile?.industry || (b as any).industry || '-'}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{b.profile?.companySize || (b as any).companySize || '-'} Staff</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tier === 'free' ? 'outline' : 'default'} className="capitalize text-[10px]">
                            {tier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Badge variant="outline" className={cn(
                              "text-[10px] uppercase font-bold",
                              (b.tinVerified && b.cacVerified) ? "text-accent border-accent/20 bg-accent/5" : 
                              (b.tinVerified || b.cacVerified) ? "text-amber-600 border-amber-200 bg-amber-50" :
                              "text-destructive border-destructive/20 bg-destructive/5"
                            )}>
                              {b.tinVerified && b.cacVerified ? 'Verified' : b.tinVerified || b.cacVerified ? 'Partial' : 'Unverified'}
                              {(b.tinVerified && b.cacVerified) && <ShieldCheck className="h-2.5 w-2.5 ml-1" />}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {safeFormat(b.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status === 'active' ? 'default' : 'secondary'} className="bg-accent/10 text-accent hover:bg-accent/10 border-none text-[10px]">
                            {status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Link href={`/admin/businesses/${b.id}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
