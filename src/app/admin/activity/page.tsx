
'use client';

import React, { useState, useMemo } from 'react';
import { 
  List, 
  Search, 
  Download, 
  Filter, 
  User, 
  Shield, 
  Clock,
  History,
  Building2,
  FileText,
  CreditCard,
  Briefcase
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { AdminActivityLog } from '@/lib/types';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function AdminActivityLogPage() {
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const [targetFilter, setTargetFilter] = useState('all');

  const logRef = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'admin_activity_log'), orderBy('timestamp', 'desc'), limit(200)) : null),
    [firestore]
  );
  const { data: logs, isLoading } = useCollection<AdminActivityLog>(logRef);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter(log => {
      const matchesSearch = 
        log.adminName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTarget = targetFilter === 'all' || log.targetType === targetFilter;
      return matchesSearch && matchesTarget;
    });
  }, [logs, searchQuery, targetFilter]);

  const handleExport = async () => {
    if (!logs) return;
    const XLSX = await import('xlsx');
    const data = filteredLogs.map(l => ({
      'Timestamp': format(new Date(l.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      'Administrator': l.adminName,
      'Action': l.action,
      'Target Type': l.targetType.toUpperCase(),
      'Target Entity': l.targetName,
      'Details': l.details
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');
    XLSX.writeFile(wb, `Uruvia_AuditLog_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'business': return <Building2 className="h-3 w-3" />;
      case 'user': return <User className="h-3 w-3" />;
      case 'subscription': return <CreditCard className="h-3 w-3" />;
      case 'accountant': return <Shield className="h-3 w-3" />;
      case 'report': return <FileText className="h-3 w-3" />;
      default: return <History className="h-3 w-3" />;
    }
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-[600px] w-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <List className="h-6 w-6 text-primary" />
            System Audit Trail
          </h1>
          <p className="text-muted-foreground text-sm">Immutable history of administrative changes and overrides.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export Audit Ledger
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-card/50">
        <CardHeader className="pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search logs..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <Select value={targetFilter} onValueChange={setTargetFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Targets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Targets</SelectItem>
                <SelectItem value="business">Businesses</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="subscription">Billing</SelectItem>
                <SelectItem value="accountant">Staff</SelectItem>
                <SelectItem value="report">Reports</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Administrator</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target Entity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center italic text-muted-foreground">
                    No activity found for selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((l) => (
                  <TableRow key={l.id} className="group hover:bg-muted/20">
                    <TableCell className="font-bold text-xs">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black">
                          {l.adminName.charAt(0)}
                        </div>
                        {l.adminName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] uppercase font-black px-1.5 py-0">
                        {l.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <div className="text-muted-foreground">{getTargetIcon(l.targetType)}</div>
                        {l.targetName}
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground leading-relaxed max-w-[300px] truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:max-w-none transition-all">
                      {l.details}
                    </TableCell>
                    <TableCell className="text-right text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                      {format(new Date(l.timestamp), 'MMM dd, HH:mm:ss')}
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
