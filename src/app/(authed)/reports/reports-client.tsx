'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  BarChart3, 
  Download, 
  Table as TableIcon,
  Filter,
  Loader2,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTier } from '@/hooks/use-tier';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Transaction, InventoryItem, ReportReview } from '@/lib/types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  isWithinInterval,
  startOfYear,
  endOfYear
} from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { exportToExcel, exportToPDF } from '@/lib/report-utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Heavy Report Preview loaded dynamically to reduce main bundle size
const DynamicReportPreview = dynamic(
  () => import('@/components/reports/report-preview'),
  { 
    ssr: false,
    loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }
);

type ReportType = 'profit-loss' | 'income-expense' | 'inventory-valuation' | 'transaction-history';
type DateRangeType = 'this-month' | 'last-month' | 'last-3-months' | 'last-6-months' | 'this-year' | 'custom';

export default function ReportsClient() {
  const { profile, business, isLoading: isProfileLoading } = useUserProfile();
  const { isFree, isCopilot, isProOrAbove } = useTier();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [reportType, setReportType] = useState<ReportType>('profit-loss');
  const [rangeType, setRangeType] = useState<DateRangeType>('this-month');
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  
  const businessId = profile?.businessId;
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadLogo() {
      if (!business?.profile.logoUrl) {
        setLogoBase64(null);
        return;
      }
      try {
        const response = await fetch(business.profile.logoUrl);
        if (!response.ok) throw new Error('Failed to fetch');
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        setLogoBase64(base64);
      } catch (e) {
        console.error('Logo load failed', e);
        setLogoBase64(null);
      }
    }
    loadLogo();
  }, [business?.profile.logoUrl]);

  const txRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/transactions`) : null),
    [firestore, businessId]
  );
  const { data: transactions, isLoading: isTxLoading } = useCollection<Transaction>(txRef);

  const invRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/inventory_items`) : null),
    [firestore, businessId]
  );
  const { data: inventory, isLoading: isInvLoading } = useCollection<InventoryItem>(invRef);

  const reviewsRef = useMemoFirebase(
    () => (firestore && businessId && isCopilot ? collection(firestore, `businesses/${businessId}/report_reviews`) : null),
    [firestore, businessId, isCopilot]
  );
  const { data: reviews } = useCollection<ReportReview>(reviewsRef);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (rangeType) {
      case 'this-month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-month': return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case 'last-3-months': return { start: startOfMonth(subMonths(now, 3)), end: endOfMonth(now) };
      case 'last-6-months': return { start: startOfMonth(subMonths(now, 6)), end: endOfMonth(now) };
      case 'this-year': return { start: startOfYear(now), end: endOfYear(now) };
      default: return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [rangeType]);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(t => 
      isWithinInterval(new Date(t.timestamp), { start: dateRange.start, end: dateRange.end })
    );
  }, [transactions, dateRange]);

  const currentReview = useMemo(() => {
    if (!reviews || !isCopilot) return null;
    return reviews.find(r => 
      r.reportType === reportType && 
      r.periodStart === dateRange.start.toISOString() &&
      r.periodEnd === dateRange.end.toISOString()
    );
  }, [reviews, reportType, dateRange, isCopilot]);

  const handleExportExcel = async () => {
    setIsExporting('excel');
    try {
      await exportToExcel(reportType, filteredTransactions, inventory || [], dateRange, business?.profile.name || 'Uruvia');
      toast({ title: "Excel Exported", description: "Your report is ready for download." });
    } catch (e) {
      toast({ variant: "destructive", title: "Export Failed", description: "Could not generate Excel file." });
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting('pdf');
    try {
      await exportToPDF(reportRef.current, `${reportType}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast({ title: "PDF Exported", description: "Your professional report has been generated." });
    } catch (e) {
      toast({ variant: "destructive", title: "Export Failed", description: "Could not generate PDF file." });
    } finally {
      setIsExporting(null);
    }
  };

  const isLoading = isProfileLoading || isTxLoading || isInvLoading;

  if (isProfileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Skeleton className="h-40 col-span-1" />
          <Skeleton className="h-[600px] lg:col-span-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Reporting Center
          </h1>
          <p className="text-muted-foreground text-sm">Professional financial analysis and operational auditing.</p>
        </div>
        
        {isProOrAbove && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleExportExcel} 
              disabled={!!isExporting || isLoading}
              className="gap-2"
            >
              {isExporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TableIcon className="h-4 w-4" />}
              Excel
            </Button>
            <Button 
              onClick={handleExportPDF} 
              disabled={!!isExporting || isLoading}
              className="gap-2 shadow-lg shadow-primary/20"
            >
              {isExporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              PDF Report
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <Card className="border-none bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground/60">
                <Filter className="h-3 w-3" /> Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Report Type</label>
                <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profit-loss">Profit & Loss</SelectItem>
                    <SelectItem value="income-expense">Income vs Expense</SelectItem>
                    <SelectItem value="inventory-valuation">Inventory Valuation</SelectItem>
                    <SelectItem value="transaction-history">Transaction History</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Date Range</label>
                <Select value={rangeType} onValueChange={(v: any) => setRangeType(v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                    <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                    <SelectItem value="this-year">Full Year {new Date().getFullYear()}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {isCopilot && (
            <Card className={cn(
              "border-none shadow-sm overflow-hidden",
              currentReview ? "bg-accent/5" : "bg-orange-500/5"
            )}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                  {currentReview ? (
                    <><CheckCircle2 className="h-4 w-4 text-accent" /> Copilot Reviewed</>
                  ) : (
                    <><Clock className="h-4 w-4 text-orange-600" /> Awaiting Review</>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {currentReview 
                    ? `Approved by ${currentReview.reviewerName} on ${format(new Date(currentReview.reviewedAt), 'PPP')}.` 
                    : "Your assigned accountant has not yet approved this period's ledger. Reports are generated as draft."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-3">
          {isFree ? (
            <UpgradePrompt 
              variant="blur"
              featureName="Report Export Engine"
              requiredTier="pro"
              description="Unlock professional PDF and Excel reports for stakeholders and tax audits."
            >
              <div className="pointer-events-none p-10">
                <div className="h-8 w-64 bg-muted rounded mb-10" />
                <div className="space-y-4">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="h-4 w-full bg-muted rounded opacity-50" />
                  ))}
                </div>
              </div>
            </UpgradePrompt>
          ) : (
            <div className="space-y-6">
              <div 
                ref={reportRef}
                className="bg-white text-[#0D1B2A] dark:bg-white dark:text-[#0D1B2A] shadow-2xl rounded-2xl overflow-hidden min-h-[800px] max-w-[850px] mx-auto p-12 border"
              >
                <div className="flex justify-between items-start border-b-2 border-slate-100 pb-10 mb-10">
                  <div className="space-y-4">
                    {logoBase64 ? (
                      <img 
                        src={logoBase64} 
                        alt="Logo" 
                        className="h-16 w-16 object-contain rounded-xl border border-slate-50" 
                      />
                    ) : (
                      <div className="h-16 flex items-center">
                        <h2 className="text-3xl font-black tracking-tighter text-[#0D1B2A]">{business?.profile.name}</h2>
                      </div>
                    )}
                    <div className="space-y-1">
                      {logoBase64 && <h2 className="text-xl font-black tracking-tighter text-[#0D1B2A]">{business?.profile.name}</h2>}
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Professional Business Report</p>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <h1 className="text-2xl font-black uppercase text-[#0D1B2A]">
                      {reportType.replace('-', ' ')}
                    </h1>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold uppercase text-[#6B7280]">Reporting Period</p>
                      <p className="text-sm font-black">{format(dateRange.start, 'MMM dd')} — {format(dateRange.end, 'MMM dd, yyyy')}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase font-black bg-slate-50 text-[#0D1B2A] border-slate-200">Generated: {format(new Date(), 'PPP')}</Badge>
                  </div>
                </div>

                <div className="space-y-10">
                  <DynamicReportPreview 
                    type={reportType} 
                    transactions={filteredTransactions} 
                    inventory={inventory || []} 
                  />
                </div>

                <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-end">
                  <div className="flex items-center w-full">
                    <span className="text-[8px] font-bold uppercase tracking-[2px] text-[#0D1B2A]">POWERED BY URUVIA</span>
                  </div>
                  
                  {isCopilot && currentReview && (
                    <div className="border-4 border-emerald-100 rounded-xl p-4 rotate-[-5deg] bg-[#F0FDF4]">
                      <div className="flex items-center gap-2 text-[#15803D]">
                        <ShieldCheck className="h-5 w-5" />
                        <span className="font-black uppercase text-xs tracking-tighter">Verified Review</span>
                      </div>
                      <p className="text-[10px] font-bold text-[#15803D]/80 mt-1">
                        {currentReview.reviewerName} | {format(new Date(currentReview.reviewedAt), 'MMM yyyy')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
