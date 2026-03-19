
'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  useFirestore, 
  useDoc, 
  useMemoFirebase, 
  updateDocumentNonBlocking,
  setDocumentNonBlocking
} from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Invoice, Business } from '@/lib/types';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  Download, 
  Share2, 
  CheckCircle2, 
  Printer,
  Mail,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { InvoicePDFView } from '@/components/invoice-pdf-view';
import { Badge } from '@/components/ui/badge';
import { getNextId } from '@/lib/id-generator';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { profile, business: bizProfile, isLoading: isProfileLoading } = useUserProfile();
  
  const invoiceId = params.invoiceId as string;
  const businessId = profile?.businessId;

  const invoiceRef = useMemoFirebase(
    () => (firestore && businessId ? doc(firestore, `businesses/${businessId}/invoices`, invoiceId) : null),
    [firestore, businessId, invoiceId]
  );
  const { data: invoice, isLoading: isInvoiceLoading } = useDoc<Invoice>(invoiceRef);

  const [isUpdating, setIsUpdating] = useState(false);

  const handleMarkAsPaid = async () => {
    if (!firestore || !businessId || !invoice || !profile) return;
    setIsUpdating(true);

    try {
      // Use sequential TC (Credit) ID for income
      const txId = await getNextId(firestore, 'income');
      const invRef = doc(firestore, `businesses/${businessId}/invoices`, invoice.id);
      const txRef = doc(firestore, `businesses/${businessId}/transactions`, txId);

      updateDocumentNonBlocking(invRef, { status: 'paid' });

      // Ledger Sync
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

      toast({ title: "Invoice Paid", description: "Payment recorded in ledger." });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to record payment.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShare = () => {
    if (!businessId || !invoice) return;
    const shareUrl = `${window.location.origin}/public/invoice/${businessId}/${invoice.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link Copied", description: "Public URL copied to clipboard." });
  };

  if (isInvoiceLoading || isProfileLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[800px] w-full" />
      </div>
    );
  }

  if (!invoice) return <div className="p-20 text-center">Invoice not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black">{invoice.invoiceNumber}</h1>
              <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'}>{invoice.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Client: {invoice.client.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {invoice.status !== 'paid' && (
            <Button onClick={handleMarkAsPaid} variant="outline" className="gap-2 border-accent text-accent hover:bg-accent/10" disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Mark as Paid
            </Button>
          )}
          <Button onClick={handleShare} variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share Link
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <InvoicePDFView invoice={invoice} business={bizProfile} />
    </div>
  );
}
