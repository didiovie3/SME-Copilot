'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/firebase';
import { useAdmin } from '@/hooks/use-admin';
import AdminSidebar from '@/components/admin/AdminSidebar';

/**
 * Isolated Admin Layout
 * Handles authentication and role-based access for platform management.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !isAdminLoading) {
      if (!user) {
        router.replace('/');
      } else if (!isAdmin) {
        router.replace('/dashboard');
      }
    }
  }, [user, isUserLoading, isAdmin, isAdminLoading, router]);

  if (isUserLoading || isAdminLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0D1B2A]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-white text-sm font-medium animate-pulse">
            Authenticating Administrative Access...
          </p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
        {children}
      </main>
    </div>
  );
}
