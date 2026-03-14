
'use client';

import React, { useState } from 'react';
import { 
  Check, 
  X, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  ArrowRight,
  MessageCircle,
  Loader2,
  CalendarDays,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTier } from '@/hooks/use-tier';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, addMonths } from 'date-fns';

export default function PricingPage() {
  const { tier, isFree, isPro, isCopilot, nextBillingDate, monthlyAmount, planName, status, assignedAccountantName } = useTier();
  const { business } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const WHATSAPP_NUMBER = "2348000000000"; // Placeholder

  const handleUpgradeToPro = async () => {
    if (!firestore || !business) return;
    setIsUpdating(true);
    
    const businessDocRef = doc(firestore, 'businesses', business.id);
    const now = new Date();
    
    updateDocumentNonBlocking(businessDocRef, {
      'subscription.tier': 'pro',
      'subscription.planName': 'Uruvia Pro',
      'subscription.monthlyAmount': 15000,
      'subscription.currency': 'NGN',
      'subscription.status': 'active',
      'subscription.subscribedAt': now.toISOString(),
      'subscription.billingDate': now.getDate(),
      'subscription.nextBillingDate': addMonths(now, 1).toISOString(),
      'subscription.businessSize': null
    });

    toast({ title: "Welcome to Pro!", description: "Your business now has full platform access." });
    setIsUpdating(false);
    setIsProModalOpen(false);
  };

  const handleCancelPlan = async () => {
    if (!firestore || !business) return;
    setIsUpdating(true);
    const businessDocRef = doc(firestore, 'businesses', business.id);
    
    updateDocumentNonBlocking(businessDocRef, {
      'subscription.status': 'cancelled',
      'subscription.cancelledAt': new Date().toISOString()
    });

    toast({ title: "Subscription Cancelled", description: "You will have access until your current period ends." });
    setIsUpdating(false);
  };

  const handleApplyCopilot = () => {
    const text = encodeURIComponent(`Hi, I'm interested in SME Copilot for my business. Business name: ${business?.profile.name || 'My Business'}. I'd like to get a custom quote.`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
  };

  const comparison = [
    { feature: "Dashboard View", free: "30 Days", pro: "Unlimited", copilot: "Unlimited" },
    { feature: "Monthly Transactions", free: "50", pro: "Unlimited", copilot: "Unlimited" },
    { feature: "Inventory Items", free: "10", pro: "Unlimited", copilot: "Unlimited" },
    { feature: "Strategic Goals", free: "1 Active", pro: "Up to 5", copilot: "Up to 5" },
    { feature: "Copilot AI Insights", free: "Basic", pro: "Full AI Analysis", copilot: "Human + AI Analysis" },
    { feature: "Invoice Generator", free: false, pro: true, copilot: true },
    { feature: "PDF/Excel Reports", free: false, pro: true, copilot: true },
    { feature: "Managed Bookkeeping", free: false, pro: false, copilot: true },
    { feature: "Tax Filing (VAT/PAYE)", free: false, pro: false, copilot: true },
    { feature: "Assigned Accountant", free: false, pro: false, copilot: true },
    { feature: "Loan Readiness Score", free: "Locked", pro: "Locked", copilot: "Unlocked" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black tracking-tighter text-primary">Subscription & Growth</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Manage your business tier and unlock professional-grade operational tools.
        </p>
      </div>

      {/* Current Subscription Card */}
      {!isFree && (
        <Card className="border-none bg-primary/5 shadow-sm overflow-hidden">
          <CardHeader className="bg-primary/10 pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Active Subscription</p>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {planName}
                  <Badge className="bg-accent hover:bg-accent text-white border-none">{status}</Badge>
                </CardTitle>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black">₦{monthlyAmount?.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Monthly investment</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8">
            <div className="flex items-start gap-3">
              <CalendarDays className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Next Billing Date</p>
                <p className="text-sm font-medium">{nextBillingDate ? format(new Date(nextBillingDate), 'MMMM dd, yyyy') : '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Payment Status</p>
                <p className="text-sm font-medium capitalize">{status.replace('_', ' ')}</p>
              </div>
            </div>
            {isCopilot && (
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-accent mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Assigned Professional</p>
                  <p className="text-sm font-medium">{assignedAccountantName || 'Pending Assignment'}</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/30 py-4 flex justify-end gap-3">
            {isPro && (
              <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/5" onClick={handleCancelPlan}>
                Cancel Subscription
              </Button>
            )}
            <Button className="gap-2" onClick={isCopilot ? handleApplyCopilot : () => setIsProModalOpen(true)}>
              {isCopilot ? <MessageCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {isCopilot ? 'Contact Support' : 'Manage Tiers'}
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
        {/* FREE PLAN */}
        <Card className={cn("relative transition-all border-none bg-card/50", isFree && "ring-2 ring-primary shadow-xl")}>
          {isFree && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Current Plan</Badge>}
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-xl">Uruvia Free</CardTitle>
            <div className="flex flex-col mt-4">
              <span className="text-4xl font-black">₦0</span>
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">Per Month</span>
            </div>
            <CardDescription className="pt-4 italic">For solo operators and micro businesses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-sm">
              {[
                "Dashboard (30-day view)",
                "Up to 50 transactions/month",
                "Up to 10 inventory items",
                "1 strategic goal",
                "Basic Copilot insights"
              ].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled={isFree}>
              {isFree ? "Currently Active" : "Get Started"}
            </Button>
          </CardFooter>
        </Card>

        {/* PRO PLAN */}
        <Card className={cn("relative transition-all border-none shadow-lg bg-primary/5 scale-105 z-10", isPro && "ring-2 ring-primary")}>
          <div className="absolute -top-4 right-4">
            <Badge className="bg-primary text-white shadow-lg">Growth Tier</Badge>
          </div>
          {isPro && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Current Plan</Badge>}
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-xl text-primary flex items-center justify-center gap-2">
              <Zap className="h-5 w-5 fill-primary" />
              Uruvia Pro
            </CardTitle>
            <div className="flex flex-col mt-4">
              <span className="text-4xl font-black">₦15,000</span>
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">Standard Rate / Month</span>
            </div>
            <CardDescription className="pt-4 italic text-primary/80 font-medium">Full historical control and professional reporting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-sm">
              {[
                "Unlimited transactions & history",
                "Unlimited inventory items",
                "Up to 5 strategic goals",
                "Full AI Copilot insights",
                "Invoice Generator",
                "PDF/Excel Report Export",
                "Debtor & Client Tracker"
              ].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setIsProModalOpen(true)} className="w-full gap-2 shadow-lg shadow-primary/20" disabled={isPro || isCopilot}>
              {isPro ? "Currently Active" : "Upgrade to Pro"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>

        {/* COPILOT PLAN */}
        <Card className={cn("relative transition-all border-none bg-card/50", isCopilot && "ring-2 ring-primary shadow-xl")}>
          <div className="absolute -top-4 right-4">
            <Badge variant="outline" className="bg-accent text-white border-none shadow-lg">Managed</Badge>
          </div>
          {isCopilot && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Current Plan</Badge>}
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-xl flex items-center justify-center gap-2 text-accent">
              <ShieldCheck className="h-5 w-5" />
              SME Copilot
            </CardTitle>
            <div className="flex flex-col mt-4">
              <span className="text-4xl font-black">From ₦50,000</span>
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">Per Month</span>
            </div>
            <CardDescription className="pt-4 italic text-accent font-medium">
              A dedicated accountant managing your compliance and growth.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-sm">
              {[
                "Assigned Human Accountant",
                "Monthly managed bookkeeping",
                "Tax filing (VAT, PAYE, CIT)",
                "Full Payroll processing",
                "Bank reconciliation",
                "Loan Readiness Score",
                "Priority WhatsApp Support"
              ].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button onClick={handleApplyCopilot} variant="outline" className="w-full gap-2 hover:bg-accent/10 hover:text-accent border-accent/20">
              <MessageCircle className="h-4 w-4" />
              Get Custom Quote
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="pt-10 space-y-8">
        <h2 className="text-2xl font-bold text-center">Plan Comparison</h2>
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px]">Feature</TableHead>
                <TableHead className="text-center">Free</TableHead>
                <TableHead className="text-center">Pro</TableHead>
                <TableHead className="text-center">SME Copilot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium text-sm">{item.feature}</TableCell>
                  <TableCell className="text-center text-xs">
                    {typeof item.free === 'string' ? item.free : item.free ? <Check className="h-4 w-4 mx-auto text-accent" /> : <X className="h-4 w-4 mx-auto text-muted-foreground/30" />}
                  </TableCell>
                  <TableCell className="text-center text-xs bg-primary/5">
                    {typeof item.pro === 'string' ? item.pro : item.pro ? <Check className="h-4 w-4 mx-auto text-primary" /> : <X className="h-4 w-4 mx-auto text-muted-foreground/30" />}
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    {typeof item.copilot === 'string' ? item.copilot : item.copilot ? <Check className="h-4 w-4 mx-auto text-accent" /> : <X className="h-4 w-4 mx-auto text-muted-foreground/30" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* PRO UPGRADE CONFIRMATION */}
      <Dialog open={isProModalOpen} onOpenChange={setIsProModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade to Uruvia Pro</DialogTitle>
            <DialogDescription>
              Unlock unlimited history, professional reports, and full AI analysis for ₦15,000/month.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex justify-between items-center">
              <div className="space-y-0.5">
                <span className="font-bold text-sm">Monthly Subscription</span>
                <p className="text-[10px] text-muted-foreground uppercase">Charged today</p>
              </div>
              <span className="font-black text-primary text-xl">₦15,000</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpgradeToPro} disabled={isUpdating} className="gap-2">
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Confirm & Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
