'use client';

import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  Mail, 
  Clock,
  Loader2,
  Lock,
  ArrowUpCircle,
  Copy,
  Check as CheckIcon,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTier } from '@/hooks/use-tier';
import { useRole } from '@/hooks/use-role';
import { useToast } from '@/hooks/use-toast';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import type { TeamMember } from '@/lib/types';
import { format, addDays, isAfter } from 'date-fns';

export function TeamManagement() {
  const { profile, business } = useUserProfile();
  const { isFree, isPro, isCopilot } = useTier();
  const { isOwner } = useRole();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'accountant' | 'staff'>('staff');
  const [isInviting, setIsInviting] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const businessId = profile?.businessId;

  const teamRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/team_members`) : null),
    [firestore, businessId]
  );
  const { data: team, isLoading } = useCollection<TeamMember>(teamRef);

  const maxMembers = isPro ? 3 : isCopilot ? 999 : 0;
  const currentMemberCount = team?.length || 0;
  const canAddMore = currentMemberCount < maxMembers;

  const handleInvite = async () => {
    if (!firestore || !businessId || !inviteEmail.trim() || !business || !profile) return;
    
    setIsInviting(true);
    try {
      const inviteToken = crypto.randomUUID();
      const inviteExpiresAt = addDays(new Date(), 7).toISOString();
      const inviteLink = `${window.location.origin}/invite?token=${inviteToken}`;

      const colRef = collection(firestore, `businesses/${businessId}/team_members`);
      await addDocumentNonBlocking(colRef, {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        inviteStatus: 'pending',
        dateAdded: new Date().toISOString(),
        inviteToken,
        inviteLink,
        inviteExpiresAt,
        businessName: business.profile.name,
        ownerName: profile.name
      });

      toast({ 
        title: 'Invitation Created', 
        description: `Link generated for ${inviteEmail}. Copy it from the list.` 
      });
      setInviteEmail('');
      setIsInviteOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Invite Failed', description: 'Could not create invitation.' });
    } finally {
      setIsInviting(false);
    }
  };

  const handleResend = (member: TeamMember) => {
    if (!firestore || !businessId) return;
    
    const inviteToken = crypto.randomUUID();
    const inviteExpiresAt = addDays(new Date(), 7).toISOString();
    const inviteLink = `${window.location.origin}/invite?token=${inviteToken}`;

    const docRef = doc(firestore, `businesses/${businessId}/team_members`, member.id);
    updateDocumentNonBlocking(docRef, {
      inviteToken,
      inviteLink,
      inviteExpiresAt,
      inviteStatus: 'pending'
    });

    toast({ title: 'Invite Refreshed', description: 'Expiry extended and new link generated.' });
  };

  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast({ title: 'Link Copied', description: 'Share this link with your teammate.' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRemove = (memberId: string) => {
    if (!firestore || !businessId) return;
    const docRef = doc(firestore, `businesses/${businessId}/team_members`, memberId);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Member Removed', description: 'Access has been revoked.' });
  };

  const handleUpdateRole = (memberId: string, newRole: TeamMember['role']) => {
    if (!firestore || !businessId) return;
    const docRef = doc(firestore, `businesses/${businessId}/team_members`, memberId);
    updateDocumentNonBlocking(docRef, { role: newRole });
    toast({ title: 'Role Updated', description: 'Access level changed successfully.' });
  };

  if (isFree) {
    return (
      <UpgradePrompt 
        variant="page"
        featureName="Multi-User Access"
        requiredTier="pro"
        description="Invite staff and accountants to manage your business ledger and stock levels with you."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-primary/5 border-b border-primary/10">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Members
            </CardTitle>
            <CardDescription>
              {isPro ? `You have used ${currentMemberCount} of 3 user slots.` : 'Manage unlimited team access for your business.'}
            </CardDescription>
          </div>
          {isOwner && (
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canAddMore} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>Assign a role to generate an invite link.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email Address</label>
                    <Input 
                      placeholder="colleague@business.com" 
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Assign Role</label>
                    <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accountant">Accountant (Full Ledger Access)</SelectItem>
                        <SelectItem value="staff">Staff (Quick Actions Only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                  <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
                    {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Link'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>User Email</TableHead>
                <TableHead>Role & Status</TableHead>
                <TableHead>Invite Link</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !team || team.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                    No team members found. Start by inviting your first colleague.
                  </TableCell>
                </TableRow>
              ) : (
                team.map((m) => {
                  const isExpired = m.inviteStatus === 'pending' && m.inviteExpiresAt && isAfter(new Date(), new Date(m.inviteExpiresAt));
                  
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{m.email}</span>
                          <span className="text-[10px] text-muted-foreground">Added {format(new Date(m.dateAdded), 'MMM dd, yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          {isOwner ? (
                            <Select 
                              value={m.role} 
                              onValueChange={(v: any) => handleUpdateRole(m.id, v)}
                              disabled={m.role === 'owner'}
                            >
                              <SelectTrigger className="h-7 w-[130px] border-none bg-muted/50 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="owner">Owner</SelectItem>
                                <SelectItem value="accountant">Accountant</SelectItem>
                                <SelectItem value="staff">Staff</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="capitalize w-fit">{m.role}</Badge>
                          )}
                          <Badge variant={m.inviteStatus === 'active' ? 'default' : 'secondary'} className="gap-1 px-2 py-0.5 text-[9px] w-fit">
                            {m.inviteStatus === 'active' ? <ShieldCheck className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                            {m.inviteStatus}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {m.inviteStatus === 'pending' && m.inviteLink && !isExpired ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-2 text-xs"
                            onClick={() => handleCopyLink(m.inviteLink!, m.id)}
                          >
                            {copiedId === m.id ? <CheckIcon className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                            Copy Link
                          </Button>
                        ) : m.inviteStatus === 'active' ? (
                          <span className="text-xs text-muted-foreground italic">Accepted</span>
                        ) : isExpired ? (
                          <Badge variant="destructive" className="gap-1 text-[10px]">
                            <AlertTriangle className="h-3 w-3" /> Expired
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {m.inviteStatus === 'pending' && m.inviteExpiresAt ? (
                          <span className={isExpired ? "text-destructive font-bold" : "text-muted-foreground"}>
                            {format(new Date(m.inviteExpiresAt), 'MMM dd')}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {m.inviteStatus === 'pending' && isExpired && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-primary"
                              onClick={() => handleResend(m)}
                              title="Resend Invite"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          {isOwner && m.role !== 'owner' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                              onClick={() => handleRemove(m.id)}
                              title="Remove Member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isPro && !canAddMore && (
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-primary" />
            <div className="space-y-0.5">
              <p className="text-sm font-bold">Team Limit Reached</p>
              <p className="text-xs text-muted-foreground">Your Pro plan is limited to 3 users. Upgrade to Copilot for unlimited staff.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <a href="/pricing">
              <ArrowUpCircle className="h-4 w-4" />
              Upgrade
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}