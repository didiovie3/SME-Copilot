'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  useFirestore, 
} from '@/firebase';
import { 
  collectionGroup, 
  query, 
  where, 
  getDocs, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HarborLogo } from '@/components/icons';
import { Loader2, ShieldCheck, AlertCircle, Clock, ArrowRight, Home, LogIn } from 'lucide-react';
import type { TeamMember } from '@/lib/types';
import { isAfter } from 'date-fns';

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const firestore = useFirestore();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<TeamMember | null>(null);
  const [errorState, setErrorState] = useState<'not_found' | 'expired' | 'used' | 'permission_denied' | null>(null);

  useEffect(() => {
    async function validateToken() {
      if (!token || !firestore) {
        if (!token) setErrorState('not_found');
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collectionGroup(firestore, 'team_members'),
          where('inviteToken', '==', token),
          limit(1)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          setErrorState('not_found');
        } else {
          const inviteData = snap.docs[0].data() as any;
          
          // Handle Firestore Timestamp conversion
          const expiresAt = inviteData.inviteExpiresAt instanceof Timestamp 
            ? inviteData.inviteExpiresAt.toDate() 
            : inviteData.inviteExpiresAt ? new Date(inviteData.inviteExpiresAt) : null;

          if (inviteData.inviteStatus === 'active') {
            setErrorState('used');
          } else if (expiresAt && isAfter(new Date(), expiresAt)) {
            setErrorState('expired');
          } else {
            setInvite({
              ...inviteData,
              id: snap.docs[0].id
            } as TeamMember);
          }
        }
      } catch (e: any) {
        console.error('Invite validation error:', e);
        if (e.code === 'permission-denied') {
          setErrorState('permission_denied');
        } else {
          setErrorState('not_found');
        }
      } finally {
        setLoading(false);
      }
    }

    validateToken();
  }, [token, firestore]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse uppercase tracking-widest">Validating Invitation...</p>
        </div>
      </div>
    );
  }

  if (errorState === 'permission_denied') {
    return (
      <InviteCard 
        icon={<AlertCircle className="h-12 w-12 text-destructive" />}
        title="Access Denied"
        message="We encountered a security permissions error while validating your link. Please try again or contact support."
        action={<Button className="w-full gap-2" onClick={() => window.location.reload()}><Loader2 className="h-4 w-4" /> Retry</Button>}
      />
    );
  }

  if (errorState === 'used') {
    return (
      <InviteCard 
        icon={<ShieldCheck className="h-12 w-12 text-accent" />}
        title="Invitation Already Used"
        message="This invitation has already been accepted. If you have already created your account, please log in."
        action={<Button className="w-full gap-2" onClick={() => router.push('/')}><LogIn className="h-4 w-4" /> Go to Login</Button>}
      />
    );
  }

  if (errorState === 'expired') {
    return (
      <InviteCard 
        icon={<Clock className="h-12 w-12 text-destructive" />}
        title="Invitation Expired"
        message="This invitation link has expired. Please ask your business owner to resend your invitation."
        action={<Button variant="outline" className="w-full gap-2" onClick={() => router.push('/')}><Home className="h-4 w-4" /> Back to Homepage</Button>}
      />
    );
  }

  if (errorState === 'not_found' || !invite) {
    return (
      <InviteCard 
        icon={<AlertCircle className="h-12 w-12 text-muted-foreground" />}
        title="Invalid Invitation"
        message="This invitation link is invalid or has been removed."
        action={<Button variant="outline" className="w-full gap-2" onClick={() => router.push('/')}><Home className="h-4 w-4" /> Back to Homepage</Button>}
      />
    );
  }

  return (
    <InviteCard 
      icon={<div className="p-4 rounded-full bg-primary/10"><HarborLogo className="h-16 w-16" /></div>}
      title="You're Invited!"
      message={
        <span>
          You've been invited to join <strong className="text-primary">{invite.businessName}</strong> on Uruvia as <strong className="capitalize">{invite.role}</strong>.
        </span>
      }
      action={
        <Button className="w-full h-12 text-lg gap-2 shadow-lg shadow-primary/20" onClick={() => router.push(`/signup?token=${token}`)}>
          Accept Invitation <ArrowRight className="h-5 w-5" />
        </Button>
      }
    />
  );
}

function InviteCard({ icon, title, message, action }: { icon: React.ReactNode, title: string, message: React.ReactNode, action: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <Card className="w-full max-w-md border-none shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center pt-10">
          <div className="flex justify-center mb-6">{icon}</div>
          <CardTitle className="text-2xl font-black tracking-tight">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center pb-10">
          <div className="text-muted-foreground leading-relaxed px-4">
            {message}
          </div>
        </CardContent>
        <CardFooter className="px-10 pb-10">
          {action}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={null}>
      <InviteContent />
    </Suspense>
  );
}