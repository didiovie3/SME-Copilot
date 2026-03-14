
'use client';

import React from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  CheckCheck, 
  Package, 
  Target, 
  AlertCircle, 
  CalendarClock, 
  Wallet,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, query, orderBy, limit } from 'firebase/firestore';
import type { AppNotification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

export function NotificationDrawer({ open, onOpenChange, businessId }: NotificationDrawerProps) {
  const firestore = useFirestore();
  const router = useRouter();

  const notificationsRef = useMemoFirebase(
    () => {
      if (!firestore || !businessId) return null;
      return query(
        collection(firestore, `businesses/${businessId}/notifications`),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    },
    [firestore, businessId]
  );

  const { data: notifications, isLoading } = useCollection<AppNotification>(notificationsRef);

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const handleMarkAsRead = (id: string, link: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, `businesses/${businessId}/notifications`, id);
    updateDocumentNonBlocking(docRef, { read: true });
    router.push(link);
    onOpenChange(false);
  };

  const handleMarkAllRead = async () => {
    if (!firestore || !notifications || !businessId) return;
    const batch = writeBatch(firestore);
    notifications.filter(n => !n.read).forEach(n => {
      const docRef = doc(firestore, `businesses/${businessId}/notifications`, n.id);
      batch.update(docRef, { read: true });
    });
    await batch.commit();
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'low_stock': return <Package className="h-4 w-4 text-destructive" />;
      case 'goal': return <Target className="h-4 w-4 text-accent" />;
      case 'overdue_invoice': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'recurring': return <CalendarClock className="h-4 w-4 text-primary" />;
      case 'payroll': return <Wallet className="h-4 w-4 text-primary" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 border-b bg-muted/10">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <SheetTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notification Centre
              </SheetTitle>
              <SheetDescription>Stay updated on your business health.</SheetDescription>
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[10px] font-bold uppercase tracking-widest gap-2"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-10 text-center flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Syncing Inbox...</p>
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="p-20 text-center space-y-4 opacity-40">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">Your inbox is clear</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-4 transition-colors cursor-pointer group hover:bg-muted/50 relative",
                    !n.read && "bg-primary/5"
                  )}
                  onClick={() => handleMarkAsRead(n.id, n.link)}
                >
                  {!n.read && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                  <div className="flex gap-4">
                    <div className={cn(
                      "p-2 rounded-lg h-fit",
                      n.priority === 'high' ? "bg-destructive/10" : "bg-muted"
                    )}>
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className={cn("text-sm font-bold", !n.read && "text-primary")}>{n.title}</h4>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {n.description}
                      </p>
                      <div className="pt-2 flex items-center gap-1 text-[10px] font-black uppercase text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        View Details <ChevronRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
