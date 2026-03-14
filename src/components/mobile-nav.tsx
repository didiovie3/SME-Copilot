'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Receipt, 
  Boxes, 
  MoreHorizontal,
  Plus,
  Users,
  Settings,
  ShieldCheck,
  FileText,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRole } from '@/hooks/use-role';

export function MobileNav() {
  const pathname = usePathname();
  const { role, isAdmin } = useRole();

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { href: '/transactions', icon: Receipt, label: 'Ledger' },
    { href: '/inventory', icon: Boxes, label: 'Stock' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors",
              pathname === item.href ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
          </Link>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger className="flex flex-col items-center justify-center gap-1 w-full h-full text-muted-foreground outline-none">
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">More</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mb-4 mr-2 p-2">
            <DropdownMenuItem asChild>
              <Link href="/invoices" className="flex items-center gap-3 py-3">
                <FileText className="h-4 w-4" /> <span>Invoices</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/clients" className="flex items-center gap-3 py-3">
                <Users className="h-4 w-4" /> <span>Clients & Debtors</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/reports" className="flex items-center gap-3 py-3">
                <BarChart3 className="h-4 w-4" /> <span>Reports</span>
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/admin/feedback" className="flex items-center gap-3 py-3">
                  <ShieldCheck className="h-4 w-4" /> <span>Admin Portal</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-3 py-3">
                <Settings className="h-4 w-4" /> <span>Settings</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}