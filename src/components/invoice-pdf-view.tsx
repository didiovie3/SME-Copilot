'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { HarborLogo } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Invoice, Business } from '@/lib/types';
import Image from 'next/image';

interface InvoicePDFViewProps {
  invoice: Invoice;
  business: Business | null;
  isPublic?: boolean;
}

export function InvoicePDFView({ invoice, business, isPublic = false }: InvoicePDFViewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownloadPDF = async () => {
    const element = document.getElementById('invoice-content');
    if (!element) return;

    setIsDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const originalStyle = element.getAttribute('style') || '';
      element.style.backgroundColor = '#ffffff';
      element.style.padding = '40px';
      element.style.width = '794px'; // Standard A4 width at 96 DPI

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      element.setAttribute('style', originalStyle);

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${invoice.invoiceNumber}.pdf`);

      toast({ title: "PDF Generated", description: "Check your downloads folder." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to generate PDF." });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!business) return null;

  return (
    <div className="space-y-6">
      {!isPublic && (
        <div className="flex justify-end mb-4 print:hidden">
          <Button onClick={handleDownloadPDF} disabled={isDownloading} className="gap-2">
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </Button>
        </div>
      )}

      <div id="invoice-content" className="bg-white text-slate-900 border shadow-xl rounded-2xl overflow-hidden print:border-none print:shadow-none mx-auto w-[794px]">
        {/* Header Branding */}
        <div className="bg-slate-900 text-white p-10 flex justify-between items-start">
          <div className="space-y-6">
            {business.profile.logoUrl ? (
              <div className="size-24 relative rounded-2xl overflow-hidden border-2 border-white/20 bg-white">
                <Image src={business.profile.logoUrl} alt="Logo" fill className="object-cover" />
              </div>
            ) : (
              <div className="h-16 flex items-center">
                <h2 className="text-3xl font-black tracking-tight">{business.profile.name}</h2>
              </div>
            )}
            <div className="space-y-2">
              {business.profile.logoUrl && <h2 className="text-2xl font-black tracking-tight">{business.profile.name}</h2>}
              <div className="space-y-1 text-sm font-semibold text-slate-300">
                <p className="max-w-xs">{business.profile.address}</p>
                <p>{business.profile.phone}</p>
                {business.profile.tin && <p className="text-xs font-black text-white uppercase mt-2">TIN: {business.profile.tin}</p>}
              </div>
            </div>
          </div>
          <div className="text-right space-y-4">
            <h1 className="text-5xl font-black tracking-tighter uppercase text-white">Invoice</h1>
            <div className="space-y-1">
              <p className="text-xs uppercase font-black text-slate-400">Invoice Number</p>
              <p className="text-2xl font-mono font-black text-white">{invoice.invoiceNumber}</p>
            </div>
          </div>
        </div>

        <div className="p-12 space-y-12 bg-white text-slate-900">
          {/* Billing Info */}
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b-2 border-slate-100 pb-2">Bill To</h4>
              <div className="space-y-2">
                <p className="text-2xl font-black text-slate-900">{invoice.client.name}</p>
                <div className="space-y-1 text-sm font-semibold text-slate-600">
                  {invoice.client.address && <p>{invoice.client.address}</p>}
                  {invoice.client.email && <p>{invoice.client.email}</p>}
                  {invoice.client.phone && <p>{invoice.client.phone}</p>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Date Issued</p>
                <p className="text-base font-bold text-slate-900">{format(new Date(invoice.date), 'MMMM dd, yyyy')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Due Date</p>
                <p className="text-base font-black text-destructive">{format(new Date(invoice.dueDate), 'MMMM dd, yyyy')}</p>
              </div>
              <div className="space-y-1 col-span-2 pt-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Payment Method</p>
                <p className="text-base font-bold text-slate-900">{invoice.paymentMethod}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border-2 border-slate-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left font-black uppercase text-xs text-slate-500">Description</th>
                  <th className="px-6 py-4 text-center font-black uppercase text-xs text-slate-500">Qty</th>
                  <th className="px-6 py-4 text-right font-black uppercase text-xs text-slate-500">Unit Price</th>
                  <th className="px-6 py-4 text-right font-black uppercase text-xs text-slate-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-50">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-6 py-5 font-bold text-slate-900">{item.itemName}</td>
                    <td className="px-6 py-5 text-center font-bold text-slate-700">{item.quantity}</td>
                    <td className="px-6 py-5 text-right font-bold text-slate-700">₦{item.unitPrice.toLocaleString()}</td>
                    <td className="px-6 py-5 text-right font-black text-slate-900 text-base">₦{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Section */}
          <div className="flex justify-end pt-6">
            <div className="w-full max-w-[420px] space-y-4 bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-bold uppercase tracking-tight">Subtotal</span>
                <span className="font-bold text-slate-900 text-lg">₦{invoice.subtotal.toLocaleString()}</span>
              </div>
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-sm items-center">
                  <span className="text-slate-500 font-bold uppercase tracking-tight">Tax ({invoice.taxRate}%)</span>
                  <span className="font-bold text-slate-900">₦{invoice.taxAmount.toLocaleString()}</span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between text-sm items-center text-emerald-700">
                  <span className="font-bold uppercase tracking-tight">Discount</span>
                  <span className="font-black">-₦{invoice.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t-2 border-slate-200 pt-6 mt-2 flex justify-between items-center gap-6">
                <div className="flex flex-col min-w-fit">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Amount</span>
                  <span className="text-sm font-black uppercase text-slate-900 whitespace-nowrap">Balance Due</span>
                </div>
                <span className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter text-right">
                  ₦{invoice.total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t-2 border-slate-100">
              {invoice.terms && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Terms & Conditions</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{invoice.terms}</p>
                </div>
              )}
              {invoice.notes && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Notes</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{invoice.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Branding Footer */}
          <div className="pt-24 text-center space-y-3">
            <div className="flex items-center justify-center">
              <span className="text-[8px] font-bold uppercase tracking-[2px] text-[#0D1B2A]">POWERED BY URUVIA</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Professional Business Navigation by Harbor & Co.</p>
          </div>
        </div>
      </div>
    </div>
  );
}