'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { 
  useFirestore, 
  useDoc, 
  useMemoFirebase 
} from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Invoice, Business } from '@/lib/types';
import { InvoicePDFView } from '@/components/invoice-pdf-view';
import { Skeleton } from '@/components/ui/skeleton';
import { HarborLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Printer, Mail } from 'lucide-react';

export default function PublicInvoicePage() {
  const params = useParams();
  const firestore = useFirestore();
  
  const businessId = params.businessId as string;
  const invoiceId = params.invoiceId as string;

  const businessRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'businesses', businessId) : null),
    [firestore, businessId]
  );
  const { data: business, isLoading: isBizLoading } = useDoc<Business>(businessRef);

  const invoiceRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `businesses/${businessId}/invoices`, invoiceId) : null),
    [firestore, businessId, invoiceId]
  );
  const { data: invoice, isLoading: isInvLoading } = useDoc<Invoice>(invoiceRef);

  if (isBizLoading || isInvLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl space-y-6">
          <Skeleton className="h-12 w-48 mx-auto" />
          <Skeleton className="h-[800px] w-full" />
        </div>
      </div>
    );
  }

  if (!invoice || !business) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-4">
        <HarborLogo className="size-16 opacity-20" />
        <h1 className="text-xl font-bold">Invoice Not Found</h1>
        <p className="text-muted-foreground">This link may have expired or the invoice was removed.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <header className="bg-background border-b h-16 flex items-center px-6 sticky top-0 z-50 print:hidden">
        <div className="max-w-5xl w-full mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <HarborLogo className="size-8" />
            <span className="text-xs font-bold uppercase tracking-tighter">Client Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button asChild size="sm" className="gap-2">
              <a href={`mailto:${business.profile.email}`}>
                <Mail className="h-4 w-4" /> Contact Vendor
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <InvoicePDFView invoice={invoice} business={business} isPublic />
      </main>
    </div>
  );
}