
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth, useUser } from '@/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Eye, EyeOff, Monitor, Moon, Sun, Shield, Users, Palette, Loader2, CreditCard } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamManagement } from './team-management';
import { useRole } from '@/hooks/use-role';
import { useSearchParams, useRouter } from 'next/navigation';

const formSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters.'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof formSchema>;

function SettingsContent() {
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { isOwner, isAdmin } = useRole();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('appearance');

  useEffect(() => {
    setMounted(true);
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleChangePassword = async (values: FormValues) => {
    if (!user || !user.email) {
      setError('User not found or email is missing.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, values.newPassword);

      toast({
        title: 'Success',
        description: 'Your password has been updated.',
      });
      form.reset();
    } catch (e: any) {
      let errorMessage = 'An unexpected error occurred.';
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        errorMessage = 'The current password you entered is incorrect.';
      } else if (e.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      }
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Password Change Failed',
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const AppearanceOption = ({ value, label, icon: Icon }: { value: string, label: string, icon: any }) => (
    <button
      onClick={() => setTheme(value)}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:bg-muted/50 w-full",
        theme === value ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
      )}
    >
      <Icon className={cn("h-6 w-6", theme === value ? "text-primary" : "text-muted-foreground")} />
      <span className={cn("text-xs font-bold uppercase tracking-widest", theme === value ? "text-primary" : "text-muted-foreground")}>
        {label}
      </span>
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto w-full pt-10 pb-20 px-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8 bg-background border h-12">
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2" disabled={!isOwner && !isAdmin}>
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2" onClick={() => router.push('/pricing')}>
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="w-full border-none bg-card/50 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how Uruvia looks on your screen.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {mounted ? (
                  <>
                    <AppearanceOption value="light" label="Light" icon={Sun} />
                    <AppearanceOption value="dark" label="Dark" icon={Moon} />
                    <AppearanceOption value="system" label="System" icon={Monitor} />
                  </>
                ) : (
                  <div className="col-span-3 h-24 bg-muted animate-pulse rounded-xl" />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center mt-6">
                Theme changes are applied instantly across all devices
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="w-full border-none bg-card/50 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security, including your password.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleChangePassword)} className="space-y-4">
                  {error && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showCurrentPassword ? "text" : "password"} {...field} disabled={isSaving} className="pr-10" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              disabled={isSaving}
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                             <div className="relative">
                              <Input type={showNewPassword ? "text" : "password"} {...field} disabled={isSaving} className="pr-10" />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                disabled={isSaving}
                              >
                                {showNewPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                             <div className="relative">
                              <Input type={showConfirmPassword ? "text" : "password"} {...field} disabled={isSaving} className="pr-10" />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                disabled={isSaving}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" disabled={isSaving} className="w-full mt-4">
                    {isSaving ? 'Saving...' : 'Change Password'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <TeamManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>}>
      <SettingsContent />
    </Suspense>
  )
}
