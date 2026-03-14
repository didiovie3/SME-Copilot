
'use client';

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  PlusCircle, 
  Phone, 
  Mail, 
  Building2, 
  User as UserIcon,
  ChevronRight,
  AlertCircle,
  MessageCircle,
  TrendingUp,
  Clock,
  ArrowUpCircle,
  MoreHorizontal,
  Edit,
  RefreshCw,
  Loader2,
  CheckCircle2
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import type { Client, Transaction, Invoice } from '@/lib/types';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTier } from '@/hooks/use-tier';
import { format, differenceInDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { getNextIdRange, formatBinaryId } from '@/lib/id-generator';
import ClientDialog from './client-dialog';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function ClientsPage() {
  const { profile, business, isLoading: isProfileLoading } = useUserProfile();
  const { isFree } = useTier();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);
  const [isMigrating, setIsMigrating] = useState(false);

  const businessId = profile?.businessId;

  const clientsRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/clients`) : null),
    [firestore, businessId]
  );
  const { data: clients, isLoading: isClientsLoading } = useCollection<Client>(clientsRef);

  const invoicesRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/invoices`) : null),
    [firestore, businessId]
  );
  const { data: invoices, isLoading: isInvoicesLoading } = useCollection<Invoice>(invoicesRef);

  const transactionsRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/transactions`) : null),
    [firestore, businessId]
  );
  const { data: transactions } = useCollection<Transaction>(transactionsRef);

  const unlinkedTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(t => !t.clientId && t.clientName && t.clientPhone);
  }, [transactions]);

  const clientStats = useMemo(() => {
    if (!clients || !invoices || !transactions) return [];

    return clients.map(client => {
      const clientInvoices = invoices.filter(i => i.clientId === client.id);
      const clientTransactions = transactions.filter(t => t.clientId === client.id && t.type === 'income');
      
      const unpaidInvoices = clientInvoices.filter(i => i.status !== 'paid');
      const totalOwed = unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalPurchased = clientTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      const oldestUnpaid = unpaidInvoices.length > 0 
        ? unpaidInvoices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
        : null;

      return {
        ...client,
        totalOwed,
        totalPurchased,
        unpaidCount: unpaidInvoices.length,
        oldestUnpaidDate: oldestUnpaid?.date,
      };
    });
  }, [clients, invoices, transactions]);

  const filteredClients = useMemo(() => {
    let result = [...clientStats];
    
    if (activeTab === 'debtors') {
      result = result.filter(c => c.totalOwed > 0);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.phone.includes(q) || 
        c.businessName?.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => b.totalPurchased - a.totalPurchased);
  }, [clientStats, activeTab, searchQuery]);

  const handleSendReminder = (client: any) => {
    const message = encodeURIComponent(
      `Hi ${client.name}, this is a reminder regarding your outstanding balance of ₦${client.totalOwed.toLocaleString()} with ${business?.profile.name}. You have ${client.unpaidCount} unpaid invoice(s). Please let us know when payment can be expected. Thank you!`
    );
    window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const handleMigrateClients = async () => {
    if (!firestore || !businessId || !transactions || !profile || unlinkedTransactions.length === 0) return;
    
    setIsMigrating(true);
    try {
      // 1. Group unique unlinked clients by phone number
      const legacyGroups = new Map<string, { name: string, transactions: Transaction[] }>();
      unlinkedTransactions.forEach(t => {
        const key = t.clientPhone!.trim();
        if (!legacyGroups.has(key)) {
          legacyGroups.set(key, { name: t.clientName!, transactions: [] });
        }
        legacyGroups.get(key)!.transactions.push(t);
      });

      // 2. Filter out those already in the clients collection
      const existingPhones = new Set(clients?.map(c => c.phone.trim()));
      const uniqueNewClients = Array.from(legacyGroups.entries())
        .filter(([phone]) => !existingPhones.has(phone))
        .map(([phone, data]) => ({ phone, ...data }));

      if (uniqueNewClients.length > 0) {
        const batch = writeBatch(firestore);
        const startId = await getNextIdRange(firestore, 'client', uniqueNewClients.length);
        
        uniqueNewClients.forEach((clientData, index) => {
          const newId = formatBinaryId('CL', startId + (index + 1));
          const clientRef = doc(firestore, `businesses/${businessId}/clients`, newId);
          
          const newClient: Client = {
            id: newId,
            businessId,
            ownerId: profile.authId || profile.id,
            name: clientData.name,
            phone: clientData.phone,
            type: 'individual',
            dateAdded: new Date().toISOString(),
          };
          
          batch.set(clientRef, newClient);

          // Update linked transactions
          clientData.transactions.forEach(t => {
            const txRef = doc(firestore, `businesses/${businessId}/transactions`, t.id);
            batch.update(txRef, { clientId: newId });
          });
        });

        await batch.commit();
        toast({ title: 'Migration Complete', description: `Successfully registered ${uniqueNewClients.length} new clients from your ledger.` });
      } else if (unlinkedTransactions.length > 0) {
        // Just link to existing clients if possible
        const batch = writeBatch(firestore);
        let linkCount = 0;
        
        unlinkedTransactions.forEach(t => {
          const matchedClient = clients?.find(c => c.phone.trim() === t.clientPhone?.trim());
          if (matchedClient) {
            const txRef = doc(firestore, `businesses/${businessId}/transactions`, t.id);
            batch.update(txRef, { clientId: matchedClient.id });
            linkCount++;
          }
        });

        if (linkCount > 0) {
          await batch.commit();
          toast({ title: 'Ledger Updated', description: `Linked ${linkCount} transactions to existing client profiles.` });
        }
      }
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Migration Failed', description: 'Could not sync legacy client data.' });
    } finally {
      setIsMigrating(false);
    }
  };

  if (isFree) {
    return (
      <UpgradePrompt 
        variant="page"
        featureName="Client & Debtor Hub"
        requiredTier="pro"
        description="Track customer lifetime value, manage receivables, and automate debt recovery with WhatsApp reminders."
      />
    );
  }

  const isLoading = isProfileLoading || isClientsLoading || isInvoicesLoading;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Client Hub</h1>
          <p className="text-muted-foreground text-sm">Manage your customer database and track receivables.</p>
        </div>
        <div className="flex items-center gap-2">
          {unlinkedTransactions.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleMigrateClients} 
              disabled={isMigrating}
              className="gap-2 border-primary/20 text-primary hover:bg-primary/5"
            >
              {isMigrating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync Legacy Clients ({unlinkedTransactions.length})
            </Button>
          )}
          <Button onClick={() => {
            setSelectedClient(undefined);
            setIsDialogOpen(true);
          }} className="gap-2 shadow-lg shadow-primary/20">
            <PlusCircle className="h-4 w-4" />
            Add New Client
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-none bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Total Clients</CardDescription>
            <CardTitle className="text-2xl">{clients?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2 text-destructive">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Total Receivables</CardDescription>
            <CardTitle className="text-2xl">
              ₦{clientStats.reduce((sum, c) => sum + c.totalOwed, 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2 text-accent">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Active Debtors</CardDescription>
            <CardTitle className="text-2xl">
              {clientStats.filter(c => c.totalOwed > 0).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-none bg-card/50 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="bg-muted/50 border h-9">
                <TabsTrigger value="all" className="text-xs">All Clients</TabsTrigger>
                <TabsTrigger value="debtors" className="text-xs gap-2">
                  Debtors
                  {clientStats.filter(c => c.totalOwed > 0).length > 0 && (
                    <Badge variant="destructive" className="h-4 px-1 py-0 text-[8px]">
                      {clientStats.filter(c => c.totalOwed > 0).length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search name, phone or company..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-background"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Client Details</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Total Purchases</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                      No clients found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id} className="group hover:bg-muted/50 cursor-pointer">
                      <TableCell>
                        <Link href={`/clients/${client.id}`} className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                            {client.type === 'business' ? <Building2 className="h-5 w-5 text-primary" /> : <UserIcon className="h-5 w-5 text-primary" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm truncate">{client.name}</span>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> {client.phone}</span>
                              {client.email && <span className="flex items-center gap-1"><Mail className="h-2.5 w-2.5" /> {client.email}</span>}
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-[10px] py-0">
                          {client.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₦{client.totalPurchased.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {client.totalOwed > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="font-black text-destructive">₦{client.totalOwed.toLocaleString()}</span>
                            {client.oldestUnpaidDate && (
                              <span className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">
                                <Clock className="h-2 w-2" />
                                {differenceInDays(new Date(), new Date(client.oldestUnpaidDate))} days old
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          {client.totalOwed > 0 && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 gap-2 border-accent text-accent hover:bg-accent hover:text-white"
                              onClick={() => handleSendReminder(client)}
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Remind</span>
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/clients/${client.id}`} className="flex items-center gap-2">
                                  <ChevronRight className="h-4 w-4" /> View Full Profile
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedClient(client);
                                setIsDialogOpen(true);
                              }} className="flex items-center gap-2">
                                <Edit className="h-4 w-4" /> Edit Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {businessId && profile && (
        <ClientDialog 
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          businessId={businessId}
          ownerId={profile.authId || profile.id}
          client={selectedClient}
        />
      )}
    </div>
  );
}
