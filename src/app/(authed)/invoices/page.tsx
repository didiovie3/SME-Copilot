
'use client';

import React, { useState, useMemo } from 'react';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  FileText, 
  MoreHorizontal, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Download,
  Share2
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  updateDocumentNonBlocking,
  setDocumentNonBlocking
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Invoice, Business } from '@/lib/types';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTier } from '@/hooks/use-tier';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import InvoiceDialog from './invoice-dialog';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getNextId } from '@/lib/id-generator';

export default function InvoicesPage() {
  const { profile, business, isLoading: isProfileLoading } = useUserProfile();
  const { isFree } = useTier();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const businessId = profile?.businessId;

  const invoicesRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/invoices`) : null),
    [firestore, businessId]
  );
  const { data: invoices, isLoading: isInvoicesLoading } = useCollection<Invoice>(invoicesRef);

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(inv => {
      const matchesSearch = 
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.client.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, searchQuery, statusFilter]);

  const handleMarkAsPaid = async (invoice: Invoice) => {
    if (!firestore || !businessId || !profile) return;

    // Use sequential TC (Credit) ID for income
    const txId = await getNextId(firestore, 'income');
    const invoiceRef = doc(firestore, `businesses/${businessId}/invoices`, invoice.id);
    const txRef = doc(firestore, `businesses/${businessId}/transactions`, txId);

    updateDocumentNonBlocking(invoiceRef, { status: 'paid' });

    // Auto-create corresponding income transaction
    setDocumentNonBlocking(txRef, {
      businessId,
      ownerId: profile.authId || profile.id,
      type: 'income',
      amount: invoice.total,
      category: 'Invoice Payment',
      categoryName: 'Invoice Payment',
      categoryGroup: 'Revenue',
      paymentMethod: invoice.paymentMethod,
      timestamp: new Date().toISOString(),
      description: `Payment for Invoice ${invoice.invoiceNumber}`,
      clientName: invoice.client.name,
      id: txId
    });

    toast({ title: "Invoice Paid", description: "Ledger updated with income transaction." });
  };

  const handleShare = (invoice: Invoice) => {
    const shareUrl = `${window.location.origin}/public/invoice/${businessId}/${invoice.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link Copied", description: "Public invoice URL is ready to share." });
  };

  if (isFree) {
    return (
      <UpgradePrompt 
        variant="page"
        featureName="Invoice Generator"
        requiredTier="pro"
        description="Generate professional PDFs, track receivables, and automate your bookkeeping with our full invoicing suite."
      />
    );
  }

  const isLoading = isProfileLoading || isInvoicesLoading;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Invoice Center</h1>
          <p className="text-muted-foreground text-sm">Professional billing and receivable tracking.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
          <PlusCircle className="h-4 w-4" />
          Create New Invoice
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-none bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Total Outstanding</CardDescription>
            <CardTitle className="text-2xl">
              ₦{invoices?.reduce((sum, inv) => inv.status !== 'paid' ? sum + inv.total : sum, 0).toLocaleString() || '0'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Pending Count</CardDescription>
            <CardTitle className="text-2xl">
              {invoices?.filter(inv => inv.status === 'sent').length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-none bg-card/50 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search invoice # or client..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-1 bg-muted p-1 rounded-lg text-[10px] font-bold uppercase">
                {['all', 'draft', 'sent', 'paid', 'overdue'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "px-2 py-1 rounded transition-all",
                      statusFilter === s ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                      No invoices found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((inv) => (
                    <TableRow key={inv.id} className="group hover:bg-muted/50 cursor-pointer" onClick={() => {}}>
                      <TableCell className="font-mono text-xs font-bold text-primary">{inv.invoiceNumber}</TableCell>
                      <TableCell className="font-medium text-sm">{inv.client.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.dueDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={
                          inv.status === 'paid' ? 'default' : 
                          inv.status === 'overdue' ? 'destructive' : 
                          inv.status === 'sent' ? 'secondary' : 'outline'
                        } className="text-[10px] uppercase font-bold px-2 py-0">
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black">₦{inv.total.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link href={`/invoices/${inv.id}`} className="flex items-center gap-2">
                                <Eye className="h-4 w-4" /> View Detail
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleShare(inv)} className="flex items-center gap-2">
                              <Share2 className="h-4 w-4" /> Share Link
                            </DropdownMenuItem>
                            {inv.status !== 'paid' && (
                              <DropdownMenuItem onClick={() => handleMarkAsPaid(inv)} className="flex items-center gap-2 text-accent focus:text-accent">
                                <CheckCircle2 className="h-4 w-4" /> Mark as Paid
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
        <InvoiceDialog 
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          businessId={businessId}
          ownerId={profile.authId || profile.id}
          business={business}
        />
      )}
    </div>
  );
}
