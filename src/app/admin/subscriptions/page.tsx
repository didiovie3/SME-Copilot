'use client';

import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Search, 
  Download, 
  TrendingUp,
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
import { cn } from '@/lib/utils';

export default function AdminSubscriptionsPage() {
  const { user } = useUser();
  const { isAdmin } = useAdmin();
  const firestore = useFirestore();

  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const isAuth = !!(user && isAdmin);

  const businessesRef = useMemoFirebase(
    () => (firestore && isAuth ? collection(firestore, 'businesses') : null),
    [firestore, isAuth]
  );
  const { data: businesses, isLoading } = useCollection<Business>(businessesRef);

  const metrics = useMemo(() => {
    if (!businesses) return { free: 0, pro: 0, copilot: 0, proMRR: 0, copilotMRR: 0, totalMRR: 0 };
    
    const stats = businesses.reduce((acc, b) => {
      const tier = b.subscription?.tier || (b as any).tier || 'free';
      const monthlyAmount = b.subscription?.monthlyAmount || (b as any).monthlyAmount || 0;

      if (tier === 'free') {
        acc.free++;
      } else if (tier === 'pro') {
        acc.pro++;
        acc.proMRR += 7000;
      } else if (tier === 'copilot') {
        acc.copilot++;
        acc.copilotMRR += monthlyAmount;
      }
      return acc;
    }, { free: 0, pro: 0, copilot: 0, proMRR: 0, copilotMRR: 0 });

    return { ...stats, totalMRR: stats.proMRR + stats.copilotMRR };
  }, [businesses]);

  const filteredBusinesses = useMemo(() => {
    if (!businesses) return [];
    return businesses.filter(b => {
      const name = b.profile?.name || (b as any).name || 'Unnamed';
      const tier = b.subscription?.tier || (b as any).tier || 'free';
      const status = b.subscription?.paymentStatus || (b as any).paymentStatus || 'pending';

      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = tierFilter === 'all' || tier === tierFilter;
      const matchesPayment = paymentFilter === 'all' || status === paymentFilter;
      
      return matchesSearch && matchesTier && matchesPayment;
    });
  }, [businesses, searchQuery, tierFilter, paymentFilter]);

  if (isLoading || !isAuth) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-primary" />
            Billing & Subscriptions
          </h1>
          <p className="text-sm text-muted-foreground">Manage platform monetization and human-accountant contracts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Free Tier Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{metrics.free}</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Community Accounts</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-primary">Pro MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">₦{metrics.proMRR.toLocaleString()}</div>
            <p className="text-[10px] text-primary/60 font-bold mt-1 uppercase">{metrics.pro} Active Pro Seats</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-accent">Copilot MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-accent">₦{metrics.copilotMRR.toLocaleString()}</div>
            <p className="text-[10px] text-accent/60 font-bold mt-1 uppercase">{metrics.copilot} Managed Contracts</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-[#0D1B2A] text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-white/40">Total Platform MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">₦{metrics.totalMRR.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-accent mt-1 uppercase">
              <TrendingUp className="h-3 w-3" /> Target Met
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-card/50">
        <CardHeader className="pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search business..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Tier Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="copilot">Copilot</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Business Name</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Monthly (₦)</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBusinesses.map((b) => {
                const tier = b.subscription?.tier || (b as any).tier || 'free';
                const monthlyAmount = b.subscription?.monthlyAmount || (b as any).monthlyAmount || (tier === 'pro' ? 7000 : 0);
                const status = b.subscription?.paymentStatus || (b as any).paymentStatus || 'pending';
                const name = b.profile?.name || (b as any).name || 'Unnamed';

                return (
                  <TableRow key={b.id} className="group hover:bg-muted/20">
                    <TableCell className="font-bold text-sm">{name}</TableCell>
                    <TableCell>
                      <Badge variant={tier === 'copilot' ? 'default' : 'outline'} className={cn(tier === 'copilot' && "bg-accent hover:bg-accent border-none")}>
                        {tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-xs">
                      ₦{monthlyAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px] uppercase font-black">
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/businesses/${b.id}`}>View Details</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
