'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, AlertTriangle, BarChart3, Boxes, Eye, EyeOff, Mail, ShieldAlert } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HarborLogo } from '@/components/icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ModeToggle } from '@/components/mode-toggle';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import type { UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const form = e.currentTarget as HTMLFormElement;
    const email = form.email.value;
    const password = form.password.value;

    try {
      if (!firestore || !auth) throw new Error("Firebase services are not available.");

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userProfileRef = doc(firestore, 'user_profiles', user.uid);
      const userProfileSnap = await getDoc(userProfileRef);

      if (userProfileSnap.exists()) {
        const userProfile = userProfileSnap.data() as UserProfile;
        
        if (userProfile.status === 'pending') {
          setError('Your account is pending admin approval.');
          await auth.signOut();
        } else {
          toast({ title: 'Welcome back!', description: "You're now logged in." });
          
          // Role-Based Redirect Logic
          const isAdmin = 
            userProfile.role === 'superAdmin' || 
            userProfile.role === 'accountantAdmin' ||
            userProfile.role === 'admin';
            
          router.push(isAdmin ? '/admin/overview' : '/dashboard');
        }
      } else {
        setError(`Profile not found for UID: ${user.uid}. Please register.`);
        await auth.signOut();
      }

    } catch (e: any) {
      console.error('Login Error:', e);
      let errorMessage = 'An unexpected error occurred.';
      
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password. Please verify your credentials.';
      } else if (e.code === 'auth/too-many-requests') {
        errorMessage = 'Security block: Too many failed attempts. Please reset your password or wait 15 minutes.';
      } else {
        errorMessage = e.message || 'Check your connection.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !auth) return;
    setIsResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: 'Reset Link Sent',
        description: `Instructions sent to ${resetEmail}.`,
      });
      setIsResetDialogOpen(false);
      setResetEmail('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Reset Failed',
        description: error.message || 'Check the email address.',
      });
    } finally {
      setIsResetLoading(false);
    }
  };

  const bgImage = PlaceHolderImages.find(img => img.id === 'login-bg');

  if (!mounted) return null;

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen relative">
      <div className="fixed top-4 right-4 z-50">
        <ModeToggle />
      </div>
      <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6">
        <div className="mx-auto grid w-full max-w-sm gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex flex-col items-center justify-center gap-2 mb-4">
              <HarborLogo className="h-20 w-20" />
              <h1 className="text-4xl font-black font-headline tracking-tighter text-primary">Uruvia</h1>
            </div>
            <p className="text-balance text-muted-foreground text-sm">Professional SME Management Navigator</p>
          </div>
          <Card className="transition-all duration-300 hover:shadow-lg border-none bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>
                Welcome back to your business command center.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <form onSubmit={handleLogin} className="grid gap-4">
                  {error && (
                    <Alert variant="destructive" className="animate-in fade-in zoom-in-95">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Login Blocked</AlertTitle>
                      <AlertDescription className="text-xs leading-relaxed">{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="email">Work Email</Label>
                    <Input id="email" name="email" type="email" placeholder="owner@business.com" required disabled={isLoading} />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Security Password</Label>
                      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                        <DialogTrigger asChild>
                          <button type="button" className="text-xs font-semibold text-primary hover:underline">
                            Forgot Access?
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <form onSubmit={handleForgotPassword}>
                            <DialogHeader>
                              <DialogTitle>Account Recovery</DialogTitle>
                              <DialogDescription>
                                We will send a secure reset link to your registered email.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-6">
                              <div className="grid gap-2">
                                <Label htmlFor="reset-email">Email Address</Label>
                                <Input
                                  id="reset-email"
                                  type="email"
                                  placeholder="owner@business.com"
                                  value={resetEmail}
                                  onChange={(e) => setResetEmail(e.target.value)}
                                  required
                                  disabled={isResetLoading}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setIsResetDialogOpen(false)} disabled={isResetLoading}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={isResetLoading || !resetEmail}>
                                {isResetLoading ? 'Processing...' : 'Send Link'}
                                <Mail className="ml-2 h-4 w-4" />
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="relative">
                      <Input 
                        id="password" 
                        name="password"
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••"
                        required 
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all" disabled={isLoading}>
                    {isLoading ? 'Authenticating...' : 'Enter Dashboard'} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <div className="mt-4 text-center text-xs">
                      New enterprise?{' '}
                      <Link href="/signup" className="underline font-bold text-primary">
                          Register your business
                      </Link>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative">
        {bgImage && (
          <Image
            src={bgImage.imageUrl}
            alt="Uruvia Office"
            data-ai-hint={bgImage.imageHint}
            fill
            className="object-cover dark:brightness-[0.2]"
            priority
          />
        )}
      </div>
    </div>
  );
}
