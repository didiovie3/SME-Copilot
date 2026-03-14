
'use client';

import React, { useMemo, useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  MessagesSquare, 
  ClipboardCheck, 
  Clock, 
  Calendar,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRole } from '@/hooks/use-role';
import { Skeleton } from '@/components/ui/skeleton';
import AccountantActions from './accountant-actions';
import FeedItem from './feed-item';
import type { CollaborationItem } from '@/lib/types';
import { format } from 'date-fns';

export default function CollaborationClient() {
  const { profile, business, isLoading: isProfileLoading } = useUserProfile();
  const { isAccountant, isAdmin } = useRole();
  const firestore = useFirestore();
  const businessId = profile?.businessId;

  const feedRef = useMemoFirebase(
    () => (firestore && businessId ? query(
      collection(firestore, `businesses/${businessId}/collaborationFeed`),
      orderBy('timestamp', 'desc'),
      limit(100)
    ) : null),
    [firestore, businessId]
  );
  const { data: feed, isLoading: isFeedLoading } = useCollection<CollaborationItem>(feedRef);

  const stats = useMemo(() => {
    if (!feed) return { lastActivity: null, tasksThisMonth: 0, pendingReview: 0 };
    
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const tasks = feed.filter(i => {
      const d = new Date(i.timestamp);
      return i.type === 'status_update' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const pending = feed.filter(i => i.type === 'flag' && !i.readBy?.includes(profile?.id || '')).length;

    return {
      lastActivity: feed[0]?.timestamp || null,
      tasksThisMonth: tasks,
      pendingReview: pending
    };
  }, [feed, profile?.id]);

  const isLoading = isProfileLoading || isFeedLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[600px] lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-[400px] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none bg-primary/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Professional Care</CardDescription>
            <CardTitle className="text-xl flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {business?.subscription?.assignedAccountantName || 'Assigned Accountant'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Managing your financial health since {business?.createdAt ? format(new Date(business.createdAt), 'MMM yyyy') : 'registration'}.</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-accent/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-accent">Activity Pulse</CardDescription>
            <CardTitle className="text-2xl text-accent">{stats.tasksThisMonth}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Compliance tasks completed this month.</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-orange-500/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Pending Review</CardDescription>
            <CardTitle className="text-2xl text-orange-600">{stats.pendingReview}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Flagged items awaiting your attention.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MessagesSquare className="h-5 w-5 text-primary" />
              Collaboration Feed
            </h2>
            {stats.lastActivity && (
              <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last active: {format(new Date(stats.lastActivity), 'p, MMM dd')}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {!feed || feed.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed rounded-3xl opacity-40">
                <Inbox className="h-12 w-12 mx-auto mb-4" />
                <p className="text-sm font-medium">No activity logged yet.</p>
                <p className="text-xs">Your accountant's work and notes will appear here.</p>
              </div>
            ) : (
              feed.map((item) => (
                <FeedItem 
                  key={item.id} 
                  item={item} 
                  businessId={businessId!} 
                  currentUserId={profile?.id || ''}
                />
              ))
            )}
          </div>
        </div>

        {/* Action Sidebar (Accountant Only) */}
        <div className="space-y-6">
          {(isAccountant || isAdmin) ? (
            <AccountantActions businessId={businessId!} profile={profile!} />
          ) : (
            <Card className="border-none bg-card/50 shadow-sm sticky top-24">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Copilot Status
                </CardTitle>
                <CardDescription>Your account is currently under professional management.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Your assigned professional reviews your ledger daily. Use the feed to track progress on your tax filings and bookkeeping.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary">
                  <TrendingUp className="h-3 w-3" /> Next Audit: End of Month
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
