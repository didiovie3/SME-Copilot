'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

/**
 * Admin Setup Page
 * bootstrap utility accessible only when zero superAdmins exist.
 */
export default function AdminSetupPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if any master administrator exists
  const superAdminQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'user_profiles'), where('role', 'in', ['superAdmin', 'admin']), limit(1)) : null),
    [firestore]
  );
  const { data: superAdmins, isLoading } = useCollection<UserProfile>(superAdminQuery);

  const hasExistingAdmin = superAdmins && superAdmins.length > 0;

  useEffect(() => {
    // If a superAdmin already exists and it's NOT the current user, they shouldn't be here
    if (!isLoading && hasExistingAdmin) {
      const isCurrentAdmin = superAdmins.some(a => a.id === auth?.currentUser?.uid);
      if (isCurrentAdmin) {
        router.push('/admin/overview');
      }
    }
  }, [superAdmins, isLoading, auth, router, hasExistingAdmin]);

  const handleSetAdmin = async () => {
    if (!auth?.currentUser || !firestore) return;
    setIsProcessing(true);

    try {
      const userRef = doc(firestore, 'user_profiles', auth.currentUser.uid);
      await updateDocumentNonBlocking(userRef, { 
        role: 'superAdmin',
        status: 'active' 
      });
      
      // Delay to allow Firestore propagation
      setTimeout(() => {
        router.push('/admin/overview');
      }, 1500);
    } catch (e) {
      console.error('Bootstrap failed:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex items-center justify-center bg-muted/30 p-6">
      <Card className="max-w-md w-full border-none shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black">Admin Initializer</CardTitle>
          <CardDescription>
            {hasExistingAdmin 
              ? "System already has a master administrator." 
              : "No master administrator detected. You can bootstrap this account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasExistingAdmin ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-200 flex gap-3 items-start">
                <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
                <p className="text-xs text-orange-900 leading-relaxed font-medium">
                  This utility is only available for initial platform deployment. 
                  By clicking below, you will gain full platform oversight.
                </p>
              </div>
              <Button 
                onClick={handleSetAdmin} 
                className="w-full h-12 text-lg shadow-lg shadow-primary/20"
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Set My Account as Super Admin"}
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Uruvia is already initialized with an administrator.
              </p>
              <Button variant="outline" className="w-full" onClick={() => router.push('/admin/overview')}>
                Go to Admin Overview
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
