
'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  useFirestore, 
  useDoc, 
  useCollection, 
  useMemoFirebase, 
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking
} from '@/firebase';
import { doc, collection, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import type { Business, TeamMember, Transaction } from '@/lib/types';
import { 
  Building2, 
  ShieldCheck, 
  CreditCard, 
  Users, 
  Receipt, 
  ChevronLeft, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  Trash2,
  Ban,
  Bell,
  Sparkles,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAdmin } from '@/hooks/use-admin';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { logAdminAction } from '@/lib/admin-logger';

export default function AdminBusinessDetailPage() {
  const { businessId } = useParams() as { businessId: string };
  const router = useRouter();
  const firestore = useFirestore();
  const { isSuperAdmin, profile: adminProfile } = useAdmin();
  const { toast } = useToast();

  // Dialog States
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifForm, setNotifForm] = useState({ title: '', message: '', type: 'info' });
  const [isTierOpen, setIsTierOpen] = useState(false);
  const [targetTier, setTargetTier] = useState('');
  const [copilotAmount, setCopilotAmount] = useState('50000');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Data Fetching
  const businessRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'businesses', businessId) : null),
    [firestore, businessId]
  );
  const { data: business, isLoading: isBusinessLoading } = useDoc<Business>(businessRef);

  const teamRef = useMemoFirebase(
    () => (firestore ? collection(firestore, `businesses/${businessId}/team_members`) : null),
    [firestore, businessId]
  );
  const { data: team } = useCollection<TeamMember>(teamRef);

  const transactionsRef = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `businesses/${businessId}/transactions`), orderBy('timestamp', 'desc'), limit(10)) : null),
    [firestore, businessId]
  );
  const { data: transactions } = useCollection<Transaction>(transactionsRef);

  // Actions
  const handleToggleVerification = async (field: 'tinVerified' | 'cacVerified', status: boolean) => {
    if (!firestore || !isSuperAdmin || !business || !adminProfile) return;
    const docRef = doc(firestore, 'businesses', businessId);
    
    const update: any = { [field]: status };
    if (field === 'tinVerified') {
      update.tinVerifiedAt = status ? new Date().toISOString() : null;
      update.tinManuallyVerifiedBy = status ? adminProfile?.name : null;
    } else {
      update.cacVerifiedAt = status ? new Date().toISOString() : null;
      update.cacManuallyVerifiedBy = status ? adminProfile?.name : null;
    }

    const currentTIN = field === 'tinVerified' ? status : !!business?.tinVerified;
    const currentCAC = field === 'cacVerified' ? status : !!business?.cacVerified;
    update.isFullyVerified = currentTIN && currentCAC;

    await updateDocumentNonBlocking(docRef, update);
    
    // Log Activity
    await logAdminAction(firestore, { uid: adminProfile.uid, name: adminProfile.name }, {
      action: status ? 'Verification Applied' : 'Verification Revoked',
      targetType: 'business',
      targetId: businessId,
      targetName: business.profile.name,
      details: `Manual override for ${field === 'tinVerified' ? 'TIN' : 'CAC'}.`
    });

    toast({ title: 'Verification Updated', description: `Manual override successful.` });
  };

  const handleUpdateTier = async () => {
    if (!firestore || !isSuperAdmin || !business || !adminProfile) return;
    const docRef = doc(firestore, 'businesses', businessId);
    
    const update: any = {
      'subscription.tier': targetTier,
      'subscription.planName': targetTier === 'copilot' ? 'SME Copilot' : targetTier === 'pro' ? 'Uruvia Pro' : 'Uruvia Free',
      'subscription.status': 'active'
    };

    if (targetTier === 'copilot') {
      update['subscription.monthlyAmount'] = parseFloat(copilotAmount);
    }

    await updateDocumentNonBlocking(docRef, update);

    // Log Activity
    await logAdminAction(firestore, { uid: adminProfile.uid, name: adminProfile.name }, {
      action: 'Tier Modification',
      targetType: 'subscription',
      targetId: businessId,
      targetName: business.profile.name,
      details: `Business moved to ${targetTier} tier.`
    });

    toast({ title: 'Tier Updated', description: `Business upgraded to ${targetTier}.` });
    setIsTierOpen(false);
  };

  const handleSendNotification = async () => {
    if (!firestore || !notifForm.title || !notifForm.message || !business || !adminProfile) return;
    const colRef = collection(firestore, `businesses/${businessId}/notifications`);
    
    await addDocumentNonBlocking(colRef, {
      title: notifForm.title,
      description: notifForm.message,
      type: notifForm.type,
      priority: notifForm.type === 'info' ? 'normal' : 'high',
      sentBy: adminProfile?.uid,
      timestamp: new Date().toISOString(),
      read: false,
      link: '/dashboard'
    });

    // Log Activity
    await logAdminAction(firestore, { uid: adminProfile.uid, name: adminProfile.name }, {
      action: 'Push Alert Sent',
      targetType: 'business',
      targetId: businessId,
      targetName: business.profile.name,
      details: `Manual notification sent: ${notifForm.title}`
    });

    toast({ title: 'Alert Sent', description: 'Notification pushed to business dashboard.' });
    setIsNotifOpen(false);
    setNotifForm({ title: '', message: '', type: 'info' });
  };

  const handleDelete = async () => {
    if (deleteConfirm !== business?.profile.name || !firestore || !adminProfile || !business) return;
    setIsDeleting(true);
    const docRef = doc(firestore, 'businesses', businessId);
    
    // Log before deletion
    await logAdminAction(firestore, { uid: adminProfile.uid, name: adminProfile.name }, {
      action: 'Entity Purged',
      targetType: 'business',
      targetId: businessId,
      targetName: business.profile.name,
      details: `Permanent deletion of business entity and associated data.`
    });

    await deleteDocumentNonBlocking(docRef);
    toast({ title: 'Entity Deleted', description: 'Business and all associated data purged.' });
    router.push('/admin/businesses');
  };

  if (isBusinessLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!business) return <div className="p-20 text-center italic">Business not found.</div>;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black flex items-center gap-2">
              {business.profile.name}
              {business.isFullyVerified && <ShieldCheck className="h-5 w-5 text-accent" />}
            </h1>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">ID: {business.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsNotifOpen(true)}>
            <Bell className="h-4 w-4" />
            Send Alert
          </Button>
          {isSuperAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Lifecycle
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="text-destructive" onClick={() => {}}>
                  <Ban className="h-4 w-4 mr-2" /> Deactivate
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive font-bold" onClick={() => {}}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Entity
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-card/50">
            <CardHeader className="bg-muted/20 border-b">
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Business Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Industry & Size</Label>
                  <p className="text-sm font-medium">{business.profile.industry} • {business.profile.companySize} Staff</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Registration Numbers</Label>
                  <p className="text-xs font-mono">TIN: {business.profile.tin || 'N/A'}</p>
                  <p className="text-xs font-mono">CAC: {business.profile.cac || 'N/A'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>{business.profile.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>{business.profile.phone}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-primary mt-0.5" />
                  <span className="leading-relaxed">{business.profile.address || 'No address set'}, {business.profile.state}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Ledger Audit (Recent 10)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!transactions || transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center italic text-muted-foreground">No recent transactions found.</TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs">{format(new Date(t.timestamp), 'MMM dd, p')}</TableCell>
                        <TableCell>
                          <Badge variant={t.type === 'income' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                            {t.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{t.categoryName}</TableCell>
                        <TableCell className={cn("text-right font-bold text-xs", t.type === 'income' ? 'text-accent' : 'text-destructive')}>
                          ₦{(t.amount || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Status */}
        <div className="space-y-6">
          {/* Verification Status Card */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-sm font-black uppercase">Compliance Audit</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold">Tax ID (TIN)</p>
                  <p className="text-[10px] text-muted-foreground italic">
                    {business.tinVerified ? `Verified by ${business.tinManuallyVerifiedBy || 'System'}` : 'Awaiting Verification'}
                  </p>
                </div>
                {isSuperAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={cn("h-7 text-[10px] font-black", business.tinVerified ? "text-destructive border-destructive/20" : "text-accent border-accent/20")}
                    onClick={() => handleToggleVerification('tinVerified', !business.tinVerified)}
                  >
                    {business.tinVerified ? 'Revoke' : 'Verify'}
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold">CAC Registration</p>
                  <p className="text-[10px] text-muted-foreground italic">
                    {business.cacVerified ? `Verified by ${business.cacManuallyVerifiedBy || 'System'}` : 'Awaiting Verification'}
                  </p>
                </div>
                {isSuperAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={cn("h-7 text-[10px] font-black", business.cacVerified ? "text-destructive border-destructive/20" : "text-accent border-accent/20")}
                    onClick={() => handleToggleVerification('cacVerified', !business.cacVerified)}
                  >
                    {business.cacVerified ? 'Revoke' : 'Verify'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subscription Status Card */}
          <Card className="border-none shadow-sm bg-accent/5 border-accent/10">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-accent" />
                Subscription Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-background border flex justify-between items-center">
                <Badge className="bg-accent text-white uppercase text-[10px]">{business.subscription?.tier || 'free'}</Badge>
                {business.subscription?.tier === 'copilot' && (
                  <span className="text-sm font-black">₦{(business.subscription?.monthlyAmount || 0).toLocaleString()}</span>
                )}
              </div>
              {isSuperAdmin && (
                <Button variant="outline" className="w-full text-xs font-bold border-accent/20 hover:bg-accent/5" onClick={() => setIsTierOpen(true)}>
                  Change Subscription Tier
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Business Team
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  {team?.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="py-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold truncate max-w-[120px]">{m.email}</span>
                          <span className="text-[9px] uppercase font-black text-primary">{m.role}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <Badge variant="outline" className="text-[8px] h-4 px-1">{m.inviteStatus}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* NOTIFICATION DIALOG */}
      <Dialog open={isNotifOpen} onOpenChange={setIsNotifOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Direct Business Alert
            </DialogTitle>
            <DialogDescription>Send a critical notification to the business owner's dashboard.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Alert Type</Label>
              <Select value={notifForm.type} onValueChange={(v) => setNotifForm({...notifForm, type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Information (Blue)</SelectItem>
                  <SelectItem value="warning">Warning (Amber)</SelectItem>
                  <SelectItem value="action">Action Required (Red)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={notifForm.title} onChange={(e) => setNotifForm({...notifForm, title: e.target.value})} placeholder="e.g., Audit Notice" />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={notifForm.message} onChange={(e) => setNotifForm({...notifForm, message: e.target.value})} placeholder="Detailed instruction for the owner..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNotifOpen(false)}>Cancel</Button>
            <Button onClick={handleSendNotification} className="gap-2">
              <Sparkles className="h-4 w-4" /> Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TIER MANAGEMENT DIALOG */}
      <Dialog open={isTierOpen} onOpenChange={setIsTierOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Subscription Tier</DialogTitle>
            <DialogDescription>Manually override this business's billing plan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={targetTier} onValueChange={setTargetTier}>
              <SelectTrigger>
                <SelectValue placeholder="Select New Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Downgrade to Free</SelectItem>
                <SelectItem value="pro">Upgrade to Pro (Standard)</SelectItem>
                <SelectItem value="copilot">Upgrade to SME Copilot (Managed)</SelectItem>
              </SelectContent>
            </Select>
            {targetTier === 'copilot' && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <Label>Monthly Amount (₦)</Label>
                <Input type="number" value={copilotAmount} onChange={(e) => setCopilotAmount(e.target.value)} />
                <p className="text-[10px] text-muted-foreground uppercase font-bold italic">Contracted monthly rate for human accountant services.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTierOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateTier} disabled={!targetTier}>Confirm Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
