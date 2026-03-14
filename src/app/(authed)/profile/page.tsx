
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useFirestore, setDocumentNonBlocking, useDoc, useMemoFirebase, updateDocumentNonBlocking, useFirebaseApp } from '@/firebase';
import { doc } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Skeleton } from '@/components/ui/skeleton';
import type { Business } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Edit2, 
  MailWarning, 
  CheckCircle2, 
  MailCheck, 
  Clock,
  AlertCircle,
  ShieldCheck,
  Loader2,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ImageEditorDialog from '@/components/image-editor-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const industriesList = [
  "Agriculture", "Construction", "Education", "Fashion", "Financial Services",
  "Food & Beverage", "Healthcare", "Hospitality", "Information Technology",
  "Manufacturing", "Oil & Gas", "Real Estate", "Retail", "Transportation", "Other"
];

export default function ProfilePage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { user, profile, isProfileComplete, isLoading: isProfileLoading } = useUserProfile();

  const businessRef = useMemoFirebase(
    () => (firestore && profile?.businessId ? doc(firestore, 'businesses', profile.businessId) : null),
    [firestore, profile?.businessId]
  );
  const { data: business, isLoading: isBusinessLoading } = useDoc<Business>(businessRef);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userName, setUserName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  // Business Profile States
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [otherIndustry, setOtherIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [tin, setTin] = useState('');
  const [cac, setCac] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isBusinessSaving, setIsBusinessSaving] = useState(false);

  // Verification States
  const [isVerifyingTIN, setIsVerifyingTIN] = useState(false);
  const [isVerifyingCAC, setIsVerifyingCAC] = useState(false);
  const [tinError, setTinError] = useState<string | null>(null);
  const [cacError, setCacError] = useState<string | null>(null);

  // Image Editor States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.name) setUserName(profile.name);
  }, [profile]);

  useEffect(() => {
    if (business) {
      setBusinessName(business.profile.name || '');
      const currentIndustry = business.profile.industry || '';
      if (industriesList.includes(currentIndustry)) {
        setIndustry(currentIndustry);
        setOtherIndustry('');
      } else if (currentIndustry) {
        setIndustry('Other');
        setOtherIndustry(currentIndustry);
      }
      setCompanySize(business.profile.companySize || '1-5');
      setTin(business.profile.tin || '');
      setCac(business.profile.cac || '');
      setBusinessEmail(business.profile.email || '');
      setBusinessPhone(business.profile.phone || '');
      setCountry(business.profile.country || 'Nigeria');
      setState(business.profile.state || '');
      setAddress(business.profile.address || '');
      setLogoUrl(business.profile.logoUrl || null);
    }
  }, [business]);

  const isLoading = isProfileLoading || isBusinessLoading;
  const businessId = profile?.businessId;
  const canEdit = (!isProfileComplete || isEditing) && !isLoading && !isBusinessSaving;

  const handleUserSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !firestore || isLoading) return;
    setIsSaving(true);
    const userProfileRef = doc(firestore, 'user_profiles', profile.id);
    setDocumentNonBlocking(userProfileRef, { name: userName }, { merge: true });
    setTimeout(() => {
      toast({ title: 'Profile Updated', description: 'Your account details have been updated.' });
      setIsSaving(false);
      setIsEditing(false);
    }, 500);
  };

  const onCropComplete = (croppedImage: string) => {
    setLogoUrl(croppedImage);
    if (firestore && profile?.businessId) {
      const businessDocRef = doc(firestore, 'businesses', profile.businessId);
      updateDocumentNonBlocking(businessDocRef, { 'profile.logoUrl': croppedImage });
    }
    toast({ title: "Logo Updated", description: "Your business identity has been refreshed." });
  };

  const handleBusinessSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !firestore || isLoading || isBusinessSaving) return;
    const finalIndustry = industry === 'Other' ? otherIndustry : industry;
    setIsBusinessSaving(true);
    setIsEditing(false);
    const businessDocRef = doc(firestore, 'businesses', business.id);
    updateDocumentNonBlocking(businessDocRef, {
      'profile.name': businessName,
      'profile.industry': finalIndustry,
      'profile.companySize': companySize,
      'profile.tin': tin,
      'profile.cac': cac || '',
      'profile.email': businessEmail,
      'profile.phone': businessPhone,
      'profile.country': country,
      'profile.state': state,
      'profile.address': address,
      'profile.logoUrl': logoUrl || '',
    });
    setTimeout(() => {
      toast({ title: 'Profile Updated', description: 'Your business profile is now active.' });
      setIsBusinessSaving(false);
    }, 500);
  };

  const handleRequestVerification = async () => {
    if (!user || isSendingVerification) return;
    setIsSendingVerification(true);
    try {
      await sendEmailVerification(user);
      toast({ title: 'Link Sent', description: 'Check your email to verify your account.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send verification email.' });
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleStartEditing = () => {
    if (!user?.emailVerified) {
      handleRequestVerification();
      return;
    }
    setIsEditing(true);
  };

  // --- Verification Logic ---

  const handleVerifyTIN = async () => {
    if (!businessId || !firestore) {
      toast({ variant: 'destructive', title: 'Action Required', description: 'Please save your business profile before verifying.' });
      return;
    }
    if (!/^\d{10}$/.test(tin.trim())) {
      setTinError('TIN must be exactly 10 digits');
      return;
    }
    setTinError(null);
    setIsVerifyingTIN(true);
    try {
      const functions = getFunctions(firebaseApp!);
      const callVerifyTIN = httpsCallable(functions, 'verifyTIN');
      const result = await callVerifyTIN({ tin: tin.trim(), businessId });
      const data = result.data as any;
      
      if (data.verified) {
        toast({ title: 'TIN Verified', description: 'Business identity confirmed.' });
        // Immediate client-side update for isFullyVerified
        const businessDocRef = doc(firestore, 'businesses', businessId);
        updateDocumentNonBlocking(businessDocRef, {
          isFullyVerified: true && !!business?.cacVerified
        });
      } else {
        setTinError(data.error || 'Verification failed');
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Service Unavailable', description: 'Verification service unavailable. Please try again in a moment.' });
    } finally {
      setIsVerifyingTIN(false);
    }
  };

  const handleVerifyCAC = async () => {
    if (!businessId || !firestore) {
      toast({ variant: 'destructive', title: 'Action Required', description: 'Please save your business profile before verifying.' });
      return;
    }
    if (!/^(RC|BN|IT)\d+$/i.test(cac.trim())) {
      setCacError('Invalid CAC format. Example: RC123456');
      return;
    }
    setCacError(null);
    setIsVerifyingCAC(true);
    try {
      const functions = getFunctions(firebaseApp!);
      const callVerifyCAC = httpsCallable(functions, 'verifyCAC');
      const result = await callVerifyCAC({ cacNumber: cac.trim().toUpperCase(), businessId });
      const data = result.data as any;
      
      if (data.verified) {
        toast({ title: 'CAC Verified', description: 'Incorporation record confirmed.' });
        // Immediate client-side update for isFullyVerified
        const businessDocRef = doc(firestore, 'businesses', businessId);
        updateDocumentNonBlocking(businessDocRef, {
          isFullyVerified: !!business?.tinVerified && true
        });
      } else {
        setCacError(data.error || 'Verification failed');
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Service Unavailable', description: 'Verification service unavailable. Please try again in a moment.' });
    } finally {
      setIsVerifyingCAC(false);
    }
  };

  const handleResetVerification = (type: 'tin' | 'cac') => {
    if (!firestore || !businessId) return;
    const businessDocRef = doc(firestore, 'businesses', businessId);
    if (type === 'tin') {
      updateDocumentNonBlocking(businessDocRef, { 
        tinVerified: false, 
        tinRegisteredName: null,
        tinVerificationError: null,
        isFullyVerified: false 
      });
    } else {
      updateDocumentNonBlocking(businessDocRef, { 
        cacVerified: false, 
        cacRegisteredName: null,
        cacRegistrationDate: null,
        cacVerificationError: null,
        isFullyVerified: false 
      });
    }
  };

  if (isLoading) {
    return <div className="flex flex-col items-center pt-10 gap-6 max-w-lg mx-auto"><Skeleton className="h-[200px] w-full" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  const VerificationBanner = () => {
    if (!business) return null;
    const isTIN = business.tinVerified;
    const isCAC = business.cacVerified;

    if (isTIN && isCAC) {
      return (
        <div className="w-full max-w-lg mb-4 p-3 rounded-xl bg-accent/10 border border-accent/20 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
          <p className="text-xs font-bold text-accent-foreground">Verified Business — TIN and CAC confirmed</p>
        </div>
      );
    }
    if (isTIN || isCAC) {
      return (
        <div className="w-full max-w-lg mb-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
          <p className="text-xs font-bold text-orange-900">Partially Verified — Complete verification to unlock full platform trust</p>
        </div>
      );
    }
    return (
      <div className="w-full max-w-lg mb-4 p-3 rounded-xl bg-muted border border-border flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0" />
        <p className="text-xs font-bold text-muted-foreground">Unverified — Verify your TIN and CAC to build credibility with SME Copilot</p>
      </div>
    );
  };

  const VerificationBadge = () => {
    if (profile?.status === 'active') return <Badge className="bg-accent text-white gap-1.5 px-4 py-1.5 rounded-full"><CheckCircle2 className="h-4 w-4" />Verified Account</Badge>;
    if (profile?.status === 'pending') return <Badge variant="outline" className="text-orange-500 border-orange-500 bg-orange-500/5 gap-1.5 px-4 py-1.5 rounded-full"><Clock className="h-4 w-4" />Verification Pending</Badge>;
    return <Badge variant="destructive" className="gap-1.5 px-4 py-1.5 rounded-full"><AlertCircle className="h-4 w-4" />Rejected</Badge>;
  };

  return (
    <div className="flex flex-col items-center pt-10 gap-6 pb-20 px-4 max-w-4xl mx-auto w-full">
      {!user?.emailVerified && isProfileComplete && (
        <Alert variant="destructive" className="w-full max-w-lg"><MailWarning className="h-4 w-4" /><AlertTitle>Action Required</AlertTitle><AlertDescription>Verify your email to unlock editing.</AlertDescription></Alert>
      )}
      
      <div className="w-full max-w-lg flex flex-col gap-4">
        <VerificationBanner />
        <div className="flex justify-center"><VerificationBadge /></div>
      </div>

      <Card className="w-full max-w-lg border-none bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1"><CardTitle>Account Details</CardTitle><CardDescription>Personal profile settings.</CardDescription></div>
            <Badge variant="outline" className="capitalize">{profile?.role.replace('sme', 'SME ')}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="relative group cursor-pointer" onClick={() => (!isLoading && !isBusinessSaving) && fileInputRef.current?.click()}>
              <div className="size-28 rounded-full border-4 border-background shadow-xl relative bg-muted flex items-center justify-center overflow-hidden">
                {logoUrl ? <Image src={logoUrl} alt="Logo" fill className="object-cover" /> : <Camera className="size-10 text-muted-foreground" />}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => { setPendingImageSrc(reader.result as string); setIsEditorOpen(true); };
                  reader.readAsDataURL(file);
                }
              }} />
            </div>
          </div>
          <form onSubmit={handleUserSave} className="space-y-6">
            <div className="space-y-4 rounded-xl bg-muted/30 p-4 border">
              <div className="space-y-1"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">User ID</Label><p className="font-mono text-xs truncate">{user?.uid}</p></div>
              <div className="space-y-1"><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email</Label><p className="text-sm font-medium">{user?.email}</p></div>
            </div>
            <div className="space-y-2"><Label>Full Name</Label><Input value={userName} onChange={(e) => setUserName(e.target.value)} disabled={!canEdit} /></div>
            {canEdit && <Button type="submit" className="w-full">Update Name</Button>}
          </form>
        </CardContent>
      </Card>

      {business && (
        <Card className="w-full max-w-lg border-none bg-card/50 backdrop-blur-sm">
          <CardHeader><CardTitle>Business Profile</CardTitle><CardDescription>Information for your digital navigator.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={handleBusinessSave} className="space-y-6">
              <div className="space-y-2"><Label>Business Name</Label><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} disabled={!canEdit} /></div>
              
              {/* TIN & CAC Verification Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-widest">TIN (10 Digits)</Label>
                    {business.tinVerified && (
                      <button 
                        type="button" 
                        onClick={() => handleResetVerification('tin')}
                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="h-2.5 w-2.5" /> Edit
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      value={tin} 
                      onChange={(e) => setTin(e.target.value)} 
                      disabled={!canEdit || business.tinVerified} 
                      className={cn("flex-1", business.tinVerified && "bg-accent/5 border-accent/20")}
                    />
                    {!business.tinVerified ? (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="h-9 gap-2 border-primary text-primary"
                        disabled={isVerifyingTIN || tin.length < 10}
                        onClick={handleVerifyTIN}
                      >
                        {isVerifyingTIN ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify"}
                      </Button>
                    ) : (
                      <Badge variant="outline" className="h-9 gap-1.5 border-accent text-accent bg-accent/5 px-3">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                      </Badge>
                    )}
                  </div>
                  {tinError && <p className="text-[10px] text-destructive font-bold flex items-center gap-1"><XCircle className="h-2.5 w-2.5" /> {tinError}</p>}
                  {business.tinVerified && business.tinRegisteredName && (
                    <p className="text-[10px] text-muted-foreground font-medium italic">Registered: {business.tinRegisteredName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-widest">CAC Number</Label>
                    {business.cacVerified && (
                      <button 
                        type="button" 
                        onClick={() => handleResetVerification('cac')}
                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="h-2.5 w-2.5" /> Edit
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      value={cac} 
                      onChange={(e) => setCac(e.target.value)} 
                      disabled={!canEdit || business.cacVerified} 
                      className={cn("flex-1", business.cacVerified && "bg-accent/5 border-accent/20")}
                    />
                    {!business.cacVerified ? (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="h-9 gap-2 border-primary text-primary"
                        disabled={isVerifyingCAC || cac.length < 3}
                        onClick={handleVerifyCAC}
                      >
                        {isVerifyingCAC ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify"}
                      </Button>
                    ) : (
                      <Badge variant="outline" className="h-9 gap-1.5 border-accent text-accent bg-accent/5 px-3">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                      </Badge>
                    )}
                  </div>
                  {cacError && <p className="text-[10px] text-destructive font-bold flex items-center gap-1"><XCircle className="h-2.5 w-2.5" /> {cacError}</p>}
                  {business.cacVerified && (
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground font-medium italic">Name: {business.cacRegisteredName}</p>
                      {business.cacRegistrationDate && <p className="text-[10px] text-muted-foreground font-medium italic">Inc: {business.cacRegistrationDate}</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Industry</Label>
                  <Select value={industry} onValueChange={setIndustry} disabled={!canEdit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{industriesList.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Size</Label>
                  <Select value={companySize} onValueChange={setCompanySize} disabled={!canEdit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="1-5">1-5 staff</SelectItem><SelectItem value="6-20">6-20 staff</SelectItem><SelectItem value="21-50">21-50 staff</SelectItem><SelectItem value="51+">51+ staff</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Contact Email</Label><Input type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} disabled={!canEdit} /></div>
                <div className="space-y-2"><Label>Contact Phone</Label><Input value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} disabled={!canEdit} /></div>
              </div>
              <div className="space-y-2"><Label>Address</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} disabled={!canEdit} /></div>
              
              <div className="pt-4 border-t">
                {canEdit ? (
                  <div className="flex gap-2"><Button type="submit" className="flex-1">Submit Changes</Button><Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button></div>
                ) : (
                  <Button type="button" className={cn("w-full gap-2", !user?.emailVerified && "bg-orange-500")} onClick={handleStartEditing}>
                    {user?.emailVerified ? <><Edit2 className="h-4 w-4" />Edit Profile</> : <><MailCheck className="h-4 w-4" />{isSendingVerification ? 'Sending...' : 'Verify to Edit'}</>}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      <ImageEditorDialog imageSrc={pendingImageSrc} open={isEditorOpen} onOpenChange={setIsEditorOpen} onCropComplete={onCropComplete} />
    </div>
  );
}
