
'use client';

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  CreditCard, 
  History, 
  PlusCircle, 
  Search,
  Building2,
  ShieldAlert,
  Loader2,
  UserPlus,
  Edit,
  CalendarDays
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import { collection } from 'firebase/firestore';
import type { PayrollStaff, PayrollRecord } from '@/lib/types';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTier } from '@/hooks/use-tier';
import { useRole } from '@/hooks/use-role';
import { Skeleton } from '@/components/ui/skeleton';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import StaffDialog from './staff-dialog';
import { PayrollRunView } from './payroll-run-view';
import { format, subMonths, startOfMonth } from 'date-fns';

export default function PayrollPage() {
  const { profile, isLoading: isProfileLoading } = useUserProfile();
  const { isFree, isCopilot } = useTier();
  const { canManagePayroll } = useRole();
  const firestore = useFirestore();
  
  const [activeTab, setActiveTab] = useState('run');
  const [searchQuery, setSearchQuery] = useState('');
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<PayrollStaff | undefined>(undefined);
  
  // Month Selection
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const businessId = profile?.businessId;

  const staffRef = useMemoFirebase(
    () => (firestore && businessId && !isFree && canManagePayroll ? collection(firestore, `businesses/${businessId}/payrollStaff`) : null),
    [firestore, businessId, isFree, canManagePayroll]
  );
  const { data: staff, isLoading: isStaffLoading } = useCollection<PayrollStaff>(staffRef);

  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const d = subMonths(today, i);
      options.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy')
      });
    }
    return options;
  }, []);

  if (isFree) {
    return (
      <UpgradePrompt 
        variant="page"
        featureName="Payroll & Compliance"
        requiredTier="pro"
        description="Automate salary calculations, manage deductions (Tax/Pension), and generate compliant payroll records."
      />
    );
  }

  if (!canManagePayroll) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldAlert className="h-12 w-12 text-destructive opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          Only Business Owners and Accountants can access payroll management.
        </p>
      </div>
    );
  }

  const isLoading = isProfileLoading || isStaffLoading;
  const filteredStaff = (staff || []).filter(s => 
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentMonth = format(new Date(), 'yyyy-MM');
  const isHistoryMode = selectedMonth !== currentMonth;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Payroll Hub
          </h1>
          <p className="text-muted-foreground text-sm">Manage staff compensation and statutory compliance.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-background border px-3 py-1 rounded-lg">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="border-none bg-transparent h-8 min-w-[140px] focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => {
            setSelectedStaff(undefined);
            setIsStaffDialogOpen(true);
          }} className="gap-2 shadow-lg shadow-primary/20">
            <UserPlus className="h-4 w-4" />
            Add Staff
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-8 bg-background border h-12">
          <TabsTrigger value="run" className="gap-2">
            <CreditCard className="h-4 w-4" />
            {isHistoryMode ? 'Month Summary' : 'Process Payroll'}
          </TabsTrigger>
          <TabsTrigger value="directory" className="gap-2">
            <Users className="h-4 w-4" />
            Directory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="run" className="animate-in fade-in duration-500">
          {businessId && profile && (
            <PayrollRunView 
              businessId={businessId} 
              profile={profile} 
              staff={staff || []} 
              isCopilot={isCopilot}
              selectedMonth={selectedMonth}
            />
          )}
        </TabsContent>

        <TabsContent value="directory" className="space-y-6 animate-in fade-in duration-500">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search staff..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Staff Details</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Gross Salary</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell className="h-5 w-12 mx-auto"><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                        No staff records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{s.fullName}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{s.role}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-[10px]">{s.employmentType}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">₦{s.monthlyGrossSalary.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setSelectedStaff(s);
                            setIsStaffDialogOpen(true);
                          }}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {businessId && profile && (
        <StaffDialog 
          open={isStaffDialogOpen}
          onOpenChange={setIsStaffDialogOpen}
          businessId={businessId}
          ownerId={profile.authId || profile.id}
          staff={selectedStaff}
        />
      )}
    </div>
  );
}
