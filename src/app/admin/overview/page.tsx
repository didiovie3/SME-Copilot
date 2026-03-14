'use client';

import React, { useMemo } from 'react';
import { 
  Building2, 
  Zap, 
  Calendar,
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
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { useAdmin } from '@/hooks/use-admin';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import type { Business } from '@/lib/types';
import { format, subDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminOverviewPage() {
  const { user } = useUser();
  const { isAdmin } = useAdmin();
  const firestore = useFirestore();

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

  // Only initiate listeners if authorized
  const isAuth = !!(user && isAdmin);

  // 1. Total Businesses
  const businessesRef = useMemoFirebase(
    () => (firestore && isAuth ? collection(firestore, 'businesses') : null),
    [firestore, isAuth]
  );
  const { data: businesses, isLoading: isBusinessesLoading } = useCollection<Business>(businessesRef);

  // 2. Active This Month (last 30 days)
  const activeBusinessesQuery = useMemoFirebase(
    () => (firestore && isAuth ? query(collection(firestore, 'businesses'), where('lastActiveAt', '>=', subDays(new Date(), 30).toISOString())) : null),
    [firestore, isAuth]
  );
  const { data: activeBusinesses } = useCollection<Business>(activeBusinessesQuery);

  // 3. Lists
  const recentlyJoinedQuery = useMemoFirebase(
    () => (firestore && isAuth ? query(collection(firestore, 'businesses'), orderBy('createdAt', 'desc'), limit(5)) : null),
    [firestore, isAuth]
  );
  const { data: recentBusinesses } = useCollection<Business>(recentlyJoinedQuery);

  const metrics = useMemo(() => {
    if (!businesses) return { free: 0, pro: 0, copilot: 0, mrr: 0 };
    
    return businesses.reduce((acc, b) => {
      const tier = b.subscription?.tier || (b as any).tier || 'free';
      if (tier === 'free') acc.free++;
      if (tier === 'pro') {
        acc.pro++;
        acc.mrr += 7000;
      }
      if (tier === 'copilot') {
        acc.copilot++;
        acc.mrr += (b.subscription?.monthlyAmount || (b as any).monthlyAmount || 0);
      }
      return acc;
    }, { free: 0, pro: 0, copilot: 0, mrr: 0 });
  }, [businesses]);

  if (isBusinessesLoading || !isAuth) {
    return (
      <div className="space-y-8 animate-pulse">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tighter text-[#0D1B2A]">Admin Overview</h1>
        <p className="text-sm text-slate-500 font-medium">Platform-wide metrics and activity summary.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="border-none bg-white shadow-sm border border-slate-100">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Entities</CardDescription>
            <CardTitle className="text-2xl font-black">{businesses?.length || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-none bg-white shadow-sm border border-slate-100">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active (30d)</CardDescription>
            <CardTitle className="text-2xl font-black">{activeBusinesses?.length || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-none bg-white shadow-sm border border-slate-100">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Free Tier</CardDescription>
            <CardTitle className="text-2xl font-black">{metrics.free}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-none bg-primary/5 shadow-sm border border-primary/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-primary/60">Pro Tier</CardDescription>
            <CardTitle className="text-2xl font-black text-primary">{metrics.pro}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-none bg-emerald-50 shadow-sm border border-emerald-100">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-emerald-600">SME Copilot</CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-700">{metrics.copilot}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-none bg-[#0D1B2A] shadow-sm text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-white/40">Total MRR</CardDescription>
            <CardTitle className="text-2xl font-black">₦{(metrics.mrr || 0).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm overflow-hidden bg-white border border-slate-100">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Recently Joined
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase font-black">Business</TableHead>
                  <TableHead className="text-[10px] uppercase font-black">Industry</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-black">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!recentBusinesses || recentBusinesses.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="h-24 text-center italic text-slate-400">No new signups.</TableCell></TableRow>
                ) : (
                  recentBusinesses.map((b) => (
                    <TableRow key={b.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-xs">{b.profile?.name || (b as any).name || 'Unnamed'}</TableCell>
                      <TableCell className="text-[10px] uppercase font-bold text-slate-500">{b.profile?.industry || (b as any).industry || '-'}</TableCell>
                      <TableCell className="text-right text-[10px] font-black text-slate-400">
                        {safeFormat(b.createdAt, 'MMM dd')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden bg-white border border-slate-100">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-sm font-black uppercase flex items-center gap-2 text-primary">
              <Zap className="h-4 w-4" />
              Recently Active
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase font-black">Business</TableHead>
                  <TableHead className="text-[10px] uppercase font-black">Tier</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-black">Last Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!activeBusinesses || activeBusinesses.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="h-24 text-center italic text-slate-400">No active entities.</TableCell></TableRow>
                ) : (
                  activeBusinesses.slice(0, 5).map((b) => (
                    <TableRow key={b.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-xs">{b.profile?.name || (b as any).name || 'Unnamed'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[8px] uppercase font-black px-1.5 py-0">
                          {b.subscription?.tier || (b as any).tier || 'free'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-[10px] font-black text-primary">
                        {safeFormat(b.lastActiveAt, 'MMM dd, p')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
