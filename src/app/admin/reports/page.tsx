
'use client';

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Loader2,
  ChevronRight
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collectionGroup, query, where, doc, collection } from 'firebase/firestore';
import type { ReportReview, Business } from '@/lib/types';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdmin } from '@/hooks/use-admin';
import { useToast } from '@/hooks/use-toast';
import { logAdminAction } from '@/lib/admin-logger';
import { cn } from '@/lib/utils';

export default function AdminReportReviewPage() {
  const firestore = useFirestore();
  const { profile: adminProfile } = useAdmin();
  const { toast } = useToast();
  
  const [selectedReport, setSelectedReport] = useState<ReportReview | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch all pending reports
  const pendingRef = useMemoFirebase(
    () => (firestore ? query(collectionGroup(firestore, 'report_reviews'), where('status', '==', 'pending')) : null),
    [firestore]
  );
  const { data: reports, isLoading } = useCollection<ReportReview>(pendingRef);

  const handleAction = async (status: 'approved' | 'changes_requested') => {
    if (!firestore || !selectedReport || !adminProfile) return;
    setIsSubmitting(true);

    try {
      const reportRef = doc(firestore, `businesses/${selectedReport.businessId}/report_reviews`, selectedReport.id);
      
      const updateData: any = {
        status,
        reviewerNotes,
        reviewedBy: adminProfile.uid,
        reviewerName: adminProfile.name,
        reviewedAt: new Date().toISOString()
      };

      if (status === 'approved') {
        updateData.stampApplied = true;
      }

      await updateDocumentNonBlocking(reportRef, updateData);

      // Notify Business
      const notifRef = collection(firestore, `businesses/${selectedReport.businessId}/notifications`);
      addDocumentNonBlocking(notifRef, {
        title: status === 'approved' ? 'Report Approved' : 'Review: Changes Requested',
        description: `Your ${selectedReport.reportType} has been reviewed by Harbor & Co.`,
        type: 'collaboration',
        priority: status === 'approved' ? 'normal' : 'high',
        link: '/reports',
        read: false,
        timestamp: new Date().toISOString()
      });

      // Log Admin Action
      await logAdminAction(firestore, { uid: adminProfile.uid, name: adminProfile.name }, {
        action: `Report ${status.replace('_', ' ')}`,
        targetType: 'report',
        targetId: selectedReport.id,
        targetName: selectedReport.reportType,
        details: `Reviewed for business ${selectedReport.businessId}. Notes: ${reviewerNotes.substring(0, 50)}...`
      });

      toast({ 
        title: status === 'approved' ? "Report Approved" : "Changes Requested", 
        description: "Business owner has been notified." 
      });
      setSelectedReport(null);
      setReviewerNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-[500px] w-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Professional Audit Queue
        </h1>
        <p className="text-muted-foreground text-sm">Review and certify financial reports for SME Copilot clients.</p>
      </div>

      <Card className="border-none shadow-sm bg-card/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Business Entity</TableHead>
                <TableHead>Report Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!reports || reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center italic text-muted-foreground">
                    No reports currently awaiting review.
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-bold text-xs">
                      <div className="flex flex-col">
                        <span>{r.businessName || 'SME Client'}</span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">{r.businessId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px] font-black">
                        {r.reportType.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {format(new Date(r.periodStart), 'MMM dd')} — {format(new Date(r.periodEnd), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {format(new Date(r.timestamp || new Date()), 'MMM dd, p')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="gap-2 h-8" onClick={() => setSelectedReport(r)}>
                        Review Audit <ChevronRight className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* REVIEW SIDE PANEL */}
      <Sheet open={!!selectedReport} onOpenChange={(o) => !o && setSelectedReport(null)}>
        <SheetContent className="sm:max-w-xl flex flex-col h-full">
          <SheetHeader className="pb-6 border-b">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Audit Review
            </SheetTitle>
            <SheetDescription>Verify metrics and certify the business ledger.</SheetDescription>
          </SheetHeader>

          {selectedReport && (
            <div className="flex-1 overflow-y-auto py-6 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 border space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Revenue</p>
                  <p className="text-lg font-black">₦{(selectedReport.summary?.totalIncome || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Expenses</p>
                  <p className="text-lg font-black">₦{(selectedReport.summary?.totalExpense || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary">Compliance Notes</h4>
                <Textarea 
                  placeholder="Provide feedback or internal notes for this audit..." 
                  className="min-h-[150px] bg-muted/10"
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                />
              </div>

              <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 flex gap-3 items-start">
                <ShieldCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-accent-foreground">Certification Ready</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                    Approving this report will apply the **Harbor Certified** stamp, confirming to third parties that this data is verified by a professional.
                  </p>
                </div>
              </div>
            </div>
          )}

          <SheetFooter className="pt-6 border-t bg-muted/10 -mx-6 px-6">
            <div className="flex gap-3 w-full">
              <Button 
                variant="outline" 
                className="flex-1 text-destructive border-destructive/20 hover:bg-destructive/5"
                disabled={isSubmitting}
                onClick={() => handleAction('changes_requested')}
              >
                Request Changes
              </Button>
              <Button 
                className="flex-1 gap-2 bg-accent hover:bg-accent/90"
                disabled={isSubmitting}
                onClick={() => handleAction('approved')}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Certify & Approve
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
