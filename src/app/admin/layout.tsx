'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirebase } from '@/firebase';
import { useAdmin } from '@/hooks/use-admin';
import { HarborLogo } from '@/components/icons';
import { 
  LogOut, 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  Briefcase, 
  UserCheck, 
  FileText, 
  List, 
  MessageCircle, 
  ShieldCheck 
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
  const { isAdmin, isLoading: isAdminLoading, profile } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();

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
      <AdminSidebarComponent profile={profile} pathname={pathname} />
      <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
        {children}
      </main>
    </div>
  );
}

function AdminSidebarComponent({ profile, pathname }: { profile: any, pathname: string }) {
  const firebase = useFirebase();
  const router = useRouter();

  if (!firebase) return null;
  const { auth } = firebase;

  const navItems = [
    { href: '/admin/overview', icon: LayoutDashboard, label: 'Overview' },
    { href: '/admin/businesses', icon: Building2, label: 'Businesses' },
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
    { href: '/admin/copilot', icon: Briefcase, label: 'SME Copilot' },
    { href: '/admin/accountants', icon: UserCheck, label: 'Accountants' },
    { href: '/admin/reports', icon: FileText, label: 'Reports' },
    { href: '/admin/activity', icon: List, label: 'Activity Log' },
    { href: '/admin/support', icon: MessageCircle, label: 'Support' },
  ];

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/');
  };

  return (
    <aside className="w-[240px] h-screen bg-[#0D1B2A] flex flex-col shrink-0 border-r border-white/10 z-50">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center">
            <HarborLogo className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black tracking-tight text-lg leading-none">Uruvia</span>
            <span className="text-[10px] text-[#22c55e] font-bold uppercase tracking-widest mt-1">Admin Panel</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                isActive 
                  ? "bg-white/10 text-white" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn("size-4", isActive ? "text-[#22c55e]" : "text-current")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5 space-y-4">
        {profile && (
          <div className="px-2 space-y-1">
            <p className="text-xs font-bold text-white truncate">{profile.name}</p>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-2.5 text-amber-500" />
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">
                {profile.role === 'superAdmin' ? 'Super Admin' : profile.role?.replace('Admin', ' Admin') || 'Admin'}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-400/10 rounded-lg transition-colors w-full text-left"
          >
            <LogOut className="size-3" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
