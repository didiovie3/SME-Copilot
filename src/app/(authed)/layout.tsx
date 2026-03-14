'use client';

import Link from 'next/link';
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  User,
  ShieldAlert,
  BarChart3,
  CreditCard,
  Sparkles,
  ArrowUpCircle,
  ShieldCheck,
  Users,
  FileText,
  Contact,
  Wallet,
  Bell,
  MessagesSquare
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTier } from '@/hooks/use-tier';
import { useRole } from '@/hooks/use-role';
import Loading from '../loading';
import InternalLoading from './loading';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { SyncStatus } from '@/components/sync-status';
import { HarborLogo } from '@/components/icons';
import { RtdbBackupEngine } from '@/components/rtdb-backup-engine';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { NotificationDrawer } from '@/components/notification-drawer';
import { MobileNav } from '@/components/mobile-nav';

const mainNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/collaboration', icon: MessagesSquare, label: 'Accountant Room', roles: ['owner', 'accountant'], tiers: ['copilot'] },
  { href: '/transactions', icon: Receipt, label: 'Transactions', roles: ['owner', 'accountant', 'staff'] },
  { href: '/invoices', icon: FileText, label: 'Invoices', roles: ['owner', 'accountant'] },
  { href: '/clients', icon: Contact, label: 'Clients & Debtors', roles: ['owner', 'accountant'] },
  { href: '/inventory', icon: Boxes, label: 'Inventory', roles: ['owner', 'accountant', 'staff'] },
  { href: '/payroll', icon: Wallet, label: 'Payroll', roles: ['owner', 'accountant'] },
  { href: '/reports', icon: BarChart3, label: 'Reports', roles: ['owner', 'accountant'] },
  { href: '/settings?tab=team', icon: Users, label: 'Team', roles: ['owner'] },
  { href: '/pricing', icon: CreditCard, label: 'Billing & Plans', roles: ['owner'] },
  
];

const footerNavItems = [
  { href: '/profile', icon: User, label: 'Profile' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { profile, business, isLoading: isProfileLoading } = useUserProfile();
  const { isFree, isCopilot, tier } = useTier();
  const firestore = useFirestore();

  const { setOpen, setOpenMobile } = useSidebar();
  const [hasMounted, setHasMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const currentTab = useMemo(() => searchParams?.get('tab'), [searchParams]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      return;
    }
    if (hasMounted && !isUserLoading && !user) {
      router.push('/');
    }
  }, [hasMounted, isUserLoading, user, router]);

  const handleNavItemClick = useCallback(() => {
    setIsNavigating(true);
    setOpen(false);
    setOpenMobile(false);
  }, [setOpen, setOpenMobile]);

  const handleLogout = async () => {
    setIsNavigating(true);
    if (auth) {
      await auth.signOut();
    }
    router.push('/');
  };

  const handleProfileNav = (path: string) => {
    setIsNavigating(true);
    router.push(path);
    handleNavItemClick();
  };

  const normalizedRole = useMemo(() => {
    if (!profile) return '';
    return profile.role === 'smeOwner' ? 'owner' : profile.role;
  }, [profile?.role]);

  const filteredMainItems = useMemo(() => {
    return mainNavItems.filter(item => {
      // Role Check
      if (item.roles && !item.roles.includes(normalizedRole)) return false;
      // Tier Check
      if (item.tiers && !item.tiers.includes(tier)) return false;
      return true;
    });
  }, [normalizedRole, tier]);

  const isNavItemActive = useCallback((href: string) => {
    if (href === pathname) return true;
    if (href.includes('tab=team') && pathname === '/settings' && currentTab === 'team') {
      return true;
    }
    return false;
  }, [pathname, currentTab]);

  const pageTitle = useMemo(() => {
    const allItems = [...mainNavItems, ...footerNavItems];
    const navItem = allItems.find((item) => item.href === pathname);
    if (navItem) return navItem.label;
    if (pathname?.startsWith('/profile')) return 'Profile';
    if (pathname?.startsWith('/settings')) return 'Settings';
    if (pathname?.startsWith('/pricing')) return 'Billing';
    if (pathname?.startsWith('/invoices')) return 'Invoices';
    if (pathname?.startsWith('/clients')) return 'Clients & Debtors';
    if (pathname?.startsWith('/payroll')) return 'Payroll';
    if (pathname?.startsWith('/collaboration')) return 'Accountant Room';
    return 'Dashboard';
  }, [pathname]);

  // Unread Count Logic
  const notifRef = useMemoFirebase(
    () => {
      if (!firestore || !profile?.businessId) return null;
      return query(
        collection(firestore, `businesses/${profile.businessId}/notifications`),
        where('read', '==', false)
      );
    },
    [firestore, profile?.businessId]
  );
  const { data: unreadNotifications } = useCollection(notifRef);
  const unreadCount = unreadNotifications?.length || 0;

  if (isUserLoading || isProfileLoading || !hasMounted) {
    return <Loading />;
  }
  
  if (!user) return null;

  const isAdmin = profile?.role === 'admin';
  const profileImage = business?.profile.logoUrl || user.photoURL || `https://avatar.vercel.sh/${user.uid}.png`;

  const TierBadge = () => {
    if (isAdmin) return null;
    return (
      <div className="flex flex-col gap-1 mt-1 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-2">
          {isFree ? (
            <>
              <Badge variant="outline" className="text-[10px] bg-muted/50 py-0 px-1.5 border-muted-foreground/20">Free Plan</Badge>
              <Link href="/pricing" className="text-[9px] font-bold text-primary hover:underline">Upgrade</Link>
            </>
          ) : isCopilot ? (
            <Badge className="text-[10px] bg-accent text-white py-0 px-1.5 border-none shadow-sm flex gap-1 items-center">
              <Sparkles className="h-2 w-2" /> SME Copilot
            </Badge>
          ) : (
            <Badge className="text-[10px] bg-primary text-primary-foreground py-0 px-1.5 border-none flex gap-1 items-center">
              <ArrowUpCircle className="h-2 w-2" /> Pro
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
          <ShieldCheck className="h-2.5 w-2.5" /> {profile?.role === 'smeOwner' ? 'owner' : profile?.role} Access
        </div>
      </div>
    );
  };

  return (
    <>
      <RtdbBackupEngine />
      <Sidebar side="left" collapsible="icon" className="hidden md:flex">
        <SidebarHeader className="h-20 border-b border-sidebar-border/50 mb-4">
          <div className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center p-4">
            <Link href="/dashboard" className="shrink-0" onClick={handleNavItemClick}>
              <HarborLogo className="size-8 group-data-[collapsible=icon]:size-6 transition-all" />
            </Link>
            <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="truncate text-lg font-black tracking-tighter text-sidebar-foreground leading-tight">
                {isAdmin ? 'Admin' : (business?.profile.name || 'My Business')}
              </span>
              {!isAdmin && (
                <div className="flex items-center gap-1 mt-0.5">
                  <ShieldCheck className={cn("size-3", business?.isFullyVerified ? "text-accent" : "text-muted-foreground/40")} />
                  <span className={cn("text-[9px] font-bold uppercase tracking-widest", business?.isFullyVerified ? "text-accent" : "text-muted-foreground/40")}>
                    {business?.isFullyVerified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
              )}
              <TierBadge />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <ScrollArea className="h-full">
            <SidebarMenu className="p-2">
              {filteredMainItems.map(item => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isNavItemActive(item.href)}
                    tooltip={item.label}
                    onClick={handleNavItemClick}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="p-4 flex flex-col gap-2">
          <div className="group-data-[collapsible=icon]:hidden px-1 mb-2">
            <SyncStatus />
          </div>
          <SidebarMenu>
            {footerNavItems.map(item => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  onClick={handleNavItemClick}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
                <LogOut />
                <span className="group-data-[collapsible=icon]:hidden">Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col pb-16 md:pb-0">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="hidden md:flex" />
            <h1 className="text-xl font-semibold tracking-tight">
              {pageTitle}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative rounded-full"
              onClick={() => setIsNotifOpen(true)}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-destructive text-white border-2 border-background text-[8px]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>

            {!isAdmin && isFree && normalizedRole === 'owner' && (
              <Button asChild variant="ghost" size="sm" className={cn("hidden sm:flex gap-2 text-primary hover:bg-primary/5")}>
                <Link href="/pricing">
                  <ArrowUpCircle className="h-4 w-4" />
                  Upgrade Plan
                </Link>
              </Button>
            )}
            <div className="hidden sm:block">
              <SyncStatus />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={cn("relative h-10 w-10 rounded-full p-0")}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profileImage} alt={profile?.name || "User"} />
                    <AvatarFallback>{(profile?.name || "U").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className={cn("w-56")} align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                     {profile ? (
                      <>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium leading-none">{profile.name}</p>
                          <Badge variant="outline" className="text-[10px] scale-90 px-1 py-0">{profile.role === 'smeOwner' ? 'owner' : profile.role}</Badge>
                        </div>
                        <p className="text-xs leading-none text-muted-foreground">{profile.email}</p>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-3 w-[80px]" />
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleProfileNav('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleProfileNav('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className={cn("flex-1 overflow-auto p-4 md:p-6")}>
          {isNavigating ? <InternalLoading /> : children}
        </main>
      </SidebarInset>

      <MobileNav />

      {profile?.businessId && (
        <NotificationDrawer 
          open={isNotifOpen} 
          onOpenChange={setIsNotifOpen} 
          businessId={profile.businessId} 
        />
      )}
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Suspense fallback={<Loading />}>
        <AppLayoutContent>{children}</AppLayoutContent>
      </Suspense>
    </SidebarProvider>
  );
}