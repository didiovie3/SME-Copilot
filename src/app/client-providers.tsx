'use client';

import React, { useEffect, useState } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from "@/components/ui/toaster";

/**
 * Client-only wrapper for global providers.
 * This prevents hydration mismatches and server-side crashes 
 * during the static build phase.
 */
export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <FirebaseClientProvider>
        {children}
      </FirebaseClientProvider>
      <Toaster />
    </ThemeProvider>
  );
}
