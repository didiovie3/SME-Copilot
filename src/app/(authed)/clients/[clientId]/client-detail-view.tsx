'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  useFirestore, 
  useDoc, 
  useCollection, 
  useMemoFirebase 
} from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Client, Transaction, Invoice } from '@/lib/types';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  User as UserIcon,
  Receipt,
  FileText,
  TrendingUp,
  AlertCircle,
  MessageCircle,
  Calendar
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { profile } = useUserProfile();
  
  const clientId = params.clientId as string;
  const businessId = profile?.businessId;

  const clientRef = useMemoFirebase(
    () => (firestore && businessId ? doc(firestore, `businesses/${businessId}/clients`, clientId) : null),
    [firestore, businessId, clientId]
  );
  const { data: client, isLoading: isClientLoading } = useDoc<Client>(clientRef);

  const transactionsRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/transactions`) : null),
    [firestore, businessId]
  );
  const { data: allTransactions } = useCollection<Transaction>(transactionsRef);

  const invoicesRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/invoices`) : null),
    [firestore, businessId]
  );
  const { data: allInvoices } = useCollection<Invoice>(invoicesRef);

  const clientTransactions = useMemo(() => 
    allTransactions?.filter(t => t.clientId === clientId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [allTransactions, clientId]
  );

  const clientInvoices = useMemo(() => 
    allInvoices?.filter(i => i.clientId === clientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allInvoices, clientId]
  );

  const stats = useMemo(() => {
    if (!clientTransactions || !clientInvoices) return { totalPurchases: 0, outstanding: 0 };
    
    const totalPurchases = clientTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const outstanding = clientInvoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.total, 0);
    
    return { totalPurchases, outstanding };
  }, [clientTransactions, clientInvoices]);

  const handleWhatsApp = () => {
    if (!client) return;
    window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}`, '_blank');
  };

  if (isClientLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] md:col-span-1" />
          <Skeleton className="h-[400px] md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!client) return <div className="p-20 text-center">Client not found.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
          Back to Hub
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleWhatsApp}>
            <MessageCircle className="h-4 w-4 text-accent" />
            WhatsApp
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Sidebar */}
        <div className="space-y-6">
          <Card className="border-none bg-card/50 shadow-sm overflow-hidden">
            <div className="h-24 bg-primary/10 flex items-center justify-center">
              <div className="size-16 rounded-full bg-primary text-white flex items-center justify-center border-4 border-background shadow-lg">
                {client.type === 'business' ? <Building2 className="h-8 w-8" /> : <UserIcon className="h-8 w-8" />}
              </div>
            </div>
            <CardHeader className="text-center pt-10">
              <CardTitle className="text-2xl">{client.name}</CardTitle>
              <CardDescription className="uppercase tracking-widest text-[10px] font-bold">
                {client.businessName || `${client.type} Account`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
                {client.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="leading-relaxed">{client.address}</span>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Member Since</p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-primary" />
                  {format(new Date(client.dateAdded), 'MMMM dd, yyyy')}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            <Card className="border-none bg-accent/5 border-accent/10">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-accent">LTV / Total Purchases</CardDescription>
                <CardTitle className="text-2xl text-accent">₦{stats.totalPurchases.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
            <Card className={cn(
              "border-none",
              stats.outstanding > 0 ? "bg-destructive/5 border-destructive/10" : "bg-muted/30"
            )}>
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Outstanding Debt</CardDescription>
                <CardTitle className={cn(
                  "text-2xl",
                  stats.outstanding > 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  ₦{stats.outstanding.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Activity Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="invoices" className="w-full">
            <TabsList className="bg-muted/50 border mb-6">
              <TabsTrigger value="invoices" className="gap-2">
                <FileText className="h-4 w-4" />
                Invoices
                <Badge variant="outline" className="h-4 px-1 text-[8px]">{clientInvoices?.length || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="gap-2">
                <Receipt className="h-4 w-4" />
                Ledger History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invoices" className="m-0">
              <Card className="border-none bg-card/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Invoicing History</CardTitle>
                  <CardDescription>All professional billing issued to this client.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!clientInvoices || clientInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No invoices found.</TableCell>
                        </TableRow>
                      ) : (
                        clientInvoices.map((inv) => (
                          <TableRow key={inv.id} className="cursor-pointer" onClick={() => router.push(`/invoices/${inv.id}`)}>
                            <TableCell className="font-mono text-xs font-bold text-primary">{inv.invoiceNumber}</TableCell>
                            <TableCell className="text-xs">{format(new Date(inv.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant={inv.status === 'paid' ? 'default' : 'outline'} className="text-[10px] uppercase font-bold px-2">
                                {inv.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold">₦{inv.total.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="m-0">
              <Card className="border-none bg-card/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Transaction Ledger</CardTitle>
                  <CardDescription>Raw logs of all sales and financial interactions.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!clientTransactions || clientTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground italic">No transactions recorded.</TableCell>
                        </TableRow>
                      ) : (
                        clientTransactions.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs">{format(new Date(t.timestamp), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-xs font-medium">{t.categoryName}</span>
                                <span className="text-[9px] text-muted-foreground uppercase">{t.paymentMethod}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-accent">
                              ₦{t.amount.toLocaleString()}
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
        </div>
      </div>
    </div>
  );
}
