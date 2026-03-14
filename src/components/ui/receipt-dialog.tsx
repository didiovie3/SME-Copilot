
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { 
  Printer, 
  Camera, 
  Download, 
  Loader2, 
  Flag, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import type { Business, Transaction } from '@/lib/types';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/hooks/use-role';
import { useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';

interface ReceiptDialogProps {
  transaction: Transaction | null;
  business: Business | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReceiptDialog({
  transaction,
  business,
  open,
  onOpenChange,
}: ReceiptDialogProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);
  const [flagNote, setFlagNote] = useState('');
  const [showFlagInput, setShowFlagInput] = useState(false);
  
  const { toast } = useToast();
  const { isAccountant, isAdmin, role, isOwner } = useRole();
  const firestore = useFirestore();

  useEffect(() => {
    if (open) {
      setHasMounted(true);
      setShowProof(false);
      setShowFlagInput(false);
      setFlagNote('');
    }
  }, [open]);

  if (!transaction || !business) {
    return null;
  }

  const handleFlag = async () => {
    if (!firestore || !flagNote.trim()) return;
    setIsFlagging(true);

    try {
      const txRef = doc(firestore, `businesses/${business.id}/transactions`, transaction.id);
      await updateDocumentNonBlocking(txRef, {
        flagged: true,
        flagNote: flagNote.trim(),
        flaggedAt: new Date().toISOString(),
        flaggedBy: role
      });

      // Log to Collaboration Feed
      const feedCol = collection(firestore, `businesses/${business.id}/collaborationFeed`);
      addDocumentNonBlocking(feedCol, {
        businessId: business.id,
        type: 'flag',
        content: `Flagged Transaction ${transaction.id}: ${flagNote.trim()}`,
        metadata: {
          transactionId: transaction.id,
          amount: transaction.amount,
          category: transaction.category
        },
        createdBy: role,
        createdByName: 'Accountant',
        timestamp: new Date().toISOString(),
        readBy: []
      });

      // Notify Owner
      const notifCol = collection(firestore, `businesses/${business.id}/notifications`);
      addDocumentNonBlocking(notifCol, {
        title: 'Transaction Flagged',
        description: `Accountant flagged a transaction for review: ${flagNote.trim()}`,
        type: 'collaboration',
        priority: 'high',
        link: '/collaboration',
        read: false,
        timestamp: new Date().toISOString()
      });

      toast({ title: "Transaction Flagged", description: "Audit note has been recorded." });
      setShowFlagInput(false);
    } finally {
      setIsFlagging(false);
    }
  };

  const itemsSubtotal = transaction.items?.reduce((sum, item) => sum + item.unitCost * item.quantity, 0) ?? 0;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('receipt-content');
    if (!element) return;

    setIsDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const originalStyle = element.getAttribute('style') || '';
      element.style.backgroundColor = '#ffffff';
      element.style.color = '#000000';
      element.style.padding = '20px';
      element.style.borderRadius = '0';

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 450,
      });

      element.setAttribute('style', originalStyle);

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width / 3, canvas.height / 3],
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 3, canvas.height / 3);
      
      const datePart = format(new Date(transaction.timestamp), 'yyyyMMdd-HHmm');
      const filename = `${datePart}-${transaction.id}.pdf`;
      
      pdf.save(filename);
      toast({ title: 'Receipt Downloaded', description: `Saved as ${filename}` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not generate PDF.' });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="max-h-[80vh] overflow-y-auto pr-2">
            <div id="receipt-content" className="print-area pr-2">
            <DialogHeader className="text-center mb-4 flex flex-col items-center">
                {business.profile.logoUrl && (
                  <div className="size-16 relative mb-4 rounded-md overflow-hidden border print:border-none">
                    <Image src={business.profile.logoUrl} alt="Logo" fill className="object-cover" />
                  </div>
                )}
                <DialogTitle className="text-2xl font-bold">
                {business.profile.name}
                </DialogTitle>
                <div className="text-sm text-muted-foreground">
                <p>{business.profile.address}</p>
                <p>{business.profile.phone}</p>
                </div>
            </DialogHeader>
            <Separator />
            
            {transaction.flagged && (
              <div className="my-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3 items-start">
                <AlertCircle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Accountant Flag</p>
                  <p className="text-xs font-medium text-orange-900 leading-relaxed italic">"{transaction.flagNote}"</p>
                </div>
              </div>
            )}

            <div className="my-4 space-y-2 text-sm">
                <div className="flex justify-between">
                <span className="text-muted-foreground">Receipt No:</span>
                <span className="font-mono">{transaction.id.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>{hasMounted ? format(new Date(transaction.timestamp), 'PPP p') : '...'}</span>
                </div>
                {transaction.clientName && (
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Client:</span>
                    <span>{transaction.clientName}</span>
                </div>
                )}
            </div>
            <Separator />

            <div className="my-4 min-h-[6rem]">
                <p className="font-semibold mb-2 text-sm">
                {transaction.type === 'income' ? 'Sale Details' : 'Expense Details'}
                </p>
                {transaction.items && transaction.items.length > 0 ? (
                    <div className="space-y-2 text-sm">
                        {transaction.items.map((item, index) => (
                            <div className="flex justify-between" key={index}>
                                <span className="flex-1 pr-4">{item.itemName} (x{item.quantity})</span>
                                <span className="whitespace-nowrap">₦{formatCurrency(item.unitCost * item.quantity)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex justify-between text-sm">
                        <span className="flex-1 pr-2 break-words">{transaction.description || transaction.category}</span>
                        <span className="text-right whitespace-nowrap">₦{formatCurrency(transaction.amount)}</span>
                    </div>
                )}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 text-sm">
                {transaction.items && transaction.items.length > 0 && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>₦{formatCurrency(itemsSubtotal)}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t mt-2">
                <span>Total</span>
                <span>₦{formatCurrency(transaction.amount)}</span>
                </div>
                <div className="flex justify-between mt-2">
                <span className="text-muted-foreground">Paid via:</span>
                <span className="capitalize">{transaction.paymentMethod}</span>
                </div>
            </div>

            <div className="mt-10 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 border-t border-dashed pt-6">
                <p>Thank you for your patronage</p>
                <p className="mt-1">Verified Audit Trail Enabled</p>
            </div>
            </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 print:hidden">
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" type="button" onClick={() => window.print()} className="w-full">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button type="button" onClick={handleDownloadPDF} disabled={isDownloading} className="w-full">
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              PDF
            </Button>
          </div>

          {(isAccountant || isAdmin) && !transaction.flagged && (
            <div className="w-full space-y-2 pt-2">
              {!showFlagInput ? (
                <Button variant="ghost" className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => setShowFlagInput(true)}>
                  <Flag className="h-4 w-4 mr-2" />
                  Flag for Review
                </Button>
              ) : (
                <div className="space-y-2 animate-in slide-in-from-bottom-2">
                  <Input 
                    placeholder="Reason for flagging..." 
                    className="text-xs bg-muted/30"
                    value={flagNote}
                    onChange={(e) => setFlagNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={handleFlag} disabled={isFlagging || !flagNote.trim()}>
                      {isFlagging ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm Flag"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowFlagInput(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
