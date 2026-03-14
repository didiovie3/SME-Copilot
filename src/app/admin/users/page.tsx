'use client';

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Building2, 
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { useAdmin } from '@/hooks/use-admin';
import { collection, query, orderBy } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminUsersPage() {
  const { user } = useUser();
  const { isAdmin } = useAdmin();
  const firestore = useFirestore();
  
  const [searchQuery, setSearchQuery] = useState('');

  const isAuth = !!(user && isAdmin);

  const usersRef = useMemoFirebase(
    () => (firestore && isAuth ? query(collection(firestore, 'user_profiles'), orderBy('createdAt', 'desc')) : null),
    [firestore, isAuth]
  );
  const { data: users, isLoading } = useCollection<UserProfile>(usersRef);

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

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  if (isLoading || !isAuth) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          User Directory
        </h1>
        <p className="text-muted-foreground text-sm">Manage all platform participants and their access levels.</p>
      </div>

      <Card className="border-none shadow-sm bg-card/50">
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>User Identity</TableHead>
                <TableHead>Platform Role</TableHead>
                <TableHead>Business Link</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center italic text-muted-foreground">
                    No users found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id} className="group hover:bg-muted/20">
                    <TableCell className="font-bold text-sm">
                      <div className="flex flex-col">
                        {u.name}
                        <span className="text-[10px] text-muted-foreground font-medium lowercase">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {u.role.replace('sme', 'SME ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.businessId ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                          <Building2 className="h-3 w-3" />
                          {u.businessId}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unlinked</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {safeFormat(u.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'active' ? 'default' : 'secondary'} className="text-[9px] uppercase">
                        {u.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Details</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
