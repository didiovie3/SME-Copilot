'use client';

import React, { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { onSnapshotsInSync } from 'firebase/firestore';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SyncStatus() {
  const firestore = useFirestore();
  const [isSynced, setIsSync] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!firestore) return;

    // This listener triggers when all local changes have been written to the server
    const unsubscribe = onSnapshotsInSync(firestore, () => {
      setIsSync(true);
    });

    // We can't directly detect "pending" via this API easily, 
    // but we can assume if online and snapshots trigger, it's syncing.
    return () => unsubscribe();
  }, [firestore]);

  // If we are offline, show status
  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20 animate-in fade-in slide-in-from-bottom-1">
        <CloudOff className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Offline Mode</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors duration-500",
      isSynced ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
    )}>
      {isSynced ? (
        <Cloud className="h-3.5 w-3.5" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      )}
      <span className="text-[10px] font-bold uppercase tracking-widest">
        {isSynced ? 'Cloud Synced' : 'Backing up...'}
      </span>
    </div>
  );
}
