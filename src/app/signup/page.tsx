
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowRight, 
  ArrowLeft, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Building2, 
  Briefcase, 
  Users, 
  Phone, 
  Loader2, 
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  updateProfile,
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  collectionGroup, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  limit, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { getNextId } from '@/lib/id-generator';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HarborLogo } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { isAfter } from 'date-fns';

// --- SCHEMAS ---

const industries = [
  "Agriculture", "Construction", "Education", "Fashion", "Financial Services",
  "Food & Beverage", "Healthcare", "Hospitality", "Information Technology",
  "Manufacturing", "Oil & Gas", "Real Estate", "Retail", "Transportation", "Other"
];

const nigerianStates = [
  "FCT", "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", 
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", 
  "Sokoto", "Taraba", "Yobe", "Zamfara", 
];

const accountSchema = z.object({
  fullName: z.string().min(1, 'Full name is required.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const businessSchema = z.object({
  businessName: z.string().min(1, 'Business name is required.'),
  industry: z.string().min(1, 'Industry is required.'),
  companySize: z.string().min(1, 'Company size is required.'),
  phone: z.string().min(1, 'Phone number is required.'),
  state: z.string().min(1, 'State is required.'),
  tin: z.string().optional(),
  cac: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountSchema>;
type BusinessFormValues = z.infer<typeof businessSchema>;

// --- COMPONENTS ---

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const token = searchParams.get('token');
  
  // State
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(!!token);
  const [error, setError] = useState<string | null>(null);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [inviteData, setInviteData] = useState<{ email: string, role: string, businessId: string, businessName: string, docPath: string } | null>(null);
  const [accountData, setAccountData] = useState<AccountFormValues | null>(null);

  // Forms
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const businessForm = useForm<BusinessFormValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: { businessName: '', industry: '', companySize: '', phone: '', state: '', tin: '', cac: '' },
  });

  // Effect: Handle invite token validation
  useEffect(() => {
    async function validateToken() {
      if (!token || !firestore) {
        setIsValidatingToken(false);
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
          setError('This invitation link is invalid or has been removed.');
        } else {
          const data = snap.docs[0].data();
          const expiresAt = data.inviteExpiresAt instanceof Timestamp 
            ? data.inviteExpiresAt.toDate() 
            : data.inviteExpiresAt ? new Date(data.inviteExpiresAt) : null;
          
          if (data.inviteStatus === 'active') {
            setError('This invitation has already been used.');
          } else if (expiresAt && isAfter(new Date(), expiresAt)) {
            setError('This invitation link has expired.');
          } else {
            setInviteData({
              email: data.email,
              role: data.role,
              businessId: snap.docs[0].ref.parent.parent!.id,
              businessName: data.businessName || 'Business',
              docPath: snap.docs[0].ref.path
            });
            accountForm.setValue('email', data.email);
          }
        }
      } catch (e) {
        console.error(e);
        setError('An error occurred validating your invitation.');
      } finally {
        setIsValidatingToken(false);
      }
    }

    validateToken();
  }, [token, firestore, accountForm]);

  const handleStep1Submit = async (values: AccountFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!auth) throw new Error("Firebase not initialized");
      
      // Path A: Invited User - Submit directly
      if (inviteData) {
        await processSignup(values);
        return;
      }

      // Path B: New Owner - Proceed to Step 2
      setAccountData(values);
      setStep(2);
    } catch (e: any) {
      setError(e.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Submit = async (values: BusinessFormValues) => {
    if (!accountData) return;
    setIsLoading(true);
    setError(null);
    try {
      await processSignup(accountData, values);
    } catch (e: any) {
      setError(e.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const processSignup = async (account: AccountFormValues, business?: BusinessFormValues) => {
    if (!auth || !firestore) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, account.email, account.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: account.fullName });
      await sendEmailVerification(user);

      let businessId = inviteData?.businessId;
      let userRole = inviteData?.role || 'owner';

      if (inviteData) {
        // Path A: Join existing business
        const inviteRef = doc(firestore, inviteData.docPath);
        await updateDoc(inviteRef, {
          inviteStatus: 'active',
          uid: user.uid,
          acceptedAt: serverTimestamp()
        });
      } else if (business) {
        // Path B: Create new business
        businessId = await getNextId(firestore, 'business');
        const businessDocRef = doc(firestore, 'businesses', businessId);
        await setDoc(businessDocRef, {
          id: businessId,
          ownerId: user.uid,
          profile: {
            name: business.businessName,
            email: account.email,
            phone: business.phone,
            industry: business.industry,
            state: business.state,
            companySize: business.companySize,
            tin: business.tin || '',
            cac: business.cac || '',
            country: 'Nigeria',
            address: '',
          },
          subscription: { tier: 'free', status: 'active' },
          createdAt: serverTimestamp(),
          // Default verification fields
          tinVerified: false,
          tinVerifiedAt: null,
          tinRegisteredName: null,
          tinVerificationError: null,
          tinManuallyVerifiedBy: null,
          tinManuallyVerifiedAt: null,
          cacVerified: false,
          cacVerifiedAt: null,
          cacRegisteredName: null,
          cacRegistrationDate: null,
          cacStatus: null,
          cacVerificationError: null,
          cacManuallyVerifiedBy: null,
          cacManuallyVerifiedAt: null,
          isFullyVerified: false,
        });
      }

      // Create User Profile
      const userProfileRef = doc(firestore, 'user_profiles', user.uid);
      await setDoc(userProfileRef, {
        id: await getNextId(firestore, 'user'),
        authId: user.uid,
        email: account.email,
        name: account.fullName,
        role: userRole,
        businessId: businessId,
        status: 'active',
        createdAt: serverTimestamp()
      });

      await auth.signOut();
      setIsEmailSent(true);
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        throw new Error("An account with this email already exists. Please log in instead.");
      }
      throw e;
    }
  };

  const bgImage = PlaceHolderImages.find((img) => img.id === 'login-bg');

  if (isEmailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <Mail className="h-16 w-16 text-primary mb-6" />
        <h1 className="text-3xl font-black mb-2">Check your email</h1>
        <p className="text-muted-foreground text-center max-w-sm mb-8">
          We've sent a verification link to <strong>{inviteData?.email || accountData?.email}</strong>. Please verify your account to continue.
        </p>
        <Button asChild className="w-full max-w-sm"><Link href="/">Return to Login</Link></Button>
      </div>
    );
  }

  if (isValidatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <HarborLogo className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-3xl font-black tracking-tighter text-primary">Uruvia</h1>
            <p className="text-muted-foreground mt-2">
              {inviteData ? 'Complete your team registration' : 'Register your business account'}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Registration Blocked</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              {error.includes('already exists') && (
                <Button variant="link" className="p-0 h-auto text-destructive underline font-bold mt-2" asChild>
                  <Link href="/">Login here</Link>
                </Button>
              )}
            </Alert>
          )}

          {!error && (
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>{inviteData ? 'Join Your Team' : step === 1 ? 'Step 1: Your Account' : 'Step 2: Your Business'}</CardTitle>
                <CardDescription>
                  {inviteData ? `You're joining ${inviteData.businessName} as ${inviteData.role}.` : step === 1 ? 'Enter your login credentials.' : 'Tell us about your business.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {step === 1 ? (
                  <Form {...accountForm}>
                    <form onSubmit={accountForm.handleSubmit(handleStep1Submit)} className="space-y-4">
                      {inviteData && (
                        <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 flex items-start gap-3 mb-4">
                          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            You are joining <strong>{inviteData.businessName}</strong>. Your email is verified and locked to your invitation.
                          </p>
                        </div>
                      )}
                      
                      <FormField control={accountForm.control} name="fullName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl><Input placeholder="John Doe" {...field} disabled={isLoading} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={accountForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="email" {...field} disabled={isLoading || !!inviteData} className={cn(!!inviteData && "bg-muted pr-10")} />
                              {!!inviteData && <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-1 gap-4">
                        <FormField control={accountForm.control} name="password" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input type={showPassword ? "text" : "password"} {...field} disabled={isLoading} className="pr-10" />
                                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormDescription>Minimum 8 characters.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={accountForm.control} name="confirmPassword" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl><Input type="password" {...field} disabled={isLoading} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <Button type="submit" className="w-full h-12 text-lg shadow-lg shadow-primary/20" disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : inviteData ? 'Accept & Join' : 'Next Step'}
                        {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <Form {...businessForm}>
                    <form onSubmit={businessForm.handleSubmit(handleStep2Submit)} className="space-y-4">
                      <FormField control={businessForm.control} name="businessName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name</FormLabel>
                          <FormControl><Input placeholder="e.g., Sunrise Logistics" {...field} disabled={isLoading} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={businessForm.control} name="industry" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Industry</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                              <SelectContent>{industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={businessForm.control} name="companySize" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Size</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="1-5">Micro (1-5)</SelectItem>
                                <SelectItem value="6-20">Small (6-20)</SelectItem>
                                <SelectItem value="21-50">Medium (21-50)</SelectItem>
                                <SelectItem value="51+">Enterprise (51+)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={businessForm.control} name="phone" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl><Input placeholder="+234..." {...field} disabled={isLoading} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={businessForm.control} name="state" render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                              <SelectContent>{nigerianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="pt-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Official Registration (Optional)</p>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={businessForm.control} name="tin" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax ID / TIN</FormLabel>
                              <FormControl><Input placeholder="Optional" {...field} disabled={isLoading} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={businessForm.control} name="cac" render={({ field }) => (
                            <FormItem>
                              <FormLabel>CAC RC Number</FormLabel>
                              <FormControl><Input placeholder="Optional" {...field} disabled={isLoading} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <button 
                          type="button" 
                          className="mt-4 text-xs font-semibold text-primary hover:underline"
                          onClick={() => handleStep2Submit(businessForm.getValues())}
                        >
                          Skip for now — complete later in settings
                        </button>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={isLoading}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                        <Button type="submit" className="flex-1 h-12 text-lg shadow-lg shadow-primary/20" disabled={isLoading}>
                          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Business'}
                          {!isLoading && <Sparkles className="ml-2 h-5 w-5" />}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-4 border-t pt-6 bg-muted/10">
                <div className="text-center text-sm">
                  Already have an account? <Link href="/" className="font-bold text-primary hover:underline">Log In</Link>
                </div>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
      <div className="hidden lg:block relative">
        {bgImage && (
          <Image
            src={bgImage.imageUrl}
            alt="Uruvia Office"
            fill
            className="object-cover dark:brightness-[0.2]"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent lg:from-transparent lg:bg-gradient-to-r lg:to-transparent opacity-60" />
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupContent />
    </Suspense>
  );
}
