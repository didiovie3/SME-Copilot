'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { HarborLogo } from '@/components/icons';
import { RefreshCcw, AlertTriangle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application Crash:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="relative inline-block">
          <div className="absolute inset-0 animate-ping rounded-full bg-destructive/10" />
          <HarborLogo className="h-20 w-20 relative mx-auto text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tighter">Something went wrong</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The application encountered an unexpected error. We've captured the diagnostic data and are ready to help you recover.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={() => reset()} size="lg" className="w-full gap-2 shadow-lg shadow-primary/20">
            <RefreshCcw className="h-4 w-4" />
            Try Recovery
          </Button>
          <Button variant="outline" size="lg" className="w-full gap-2" asChild>
            <Link href="/dashboard">
              Return to Safety
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="pt-8 opacity-40 grayscale flex items-center justify-center gap-2">
          <AlertTriangle className="h-3 w-3" />
          <span className="text-[10px] uppercase font-bold tracking-widest">Diagnostic ID: {error.digest || 'Unknown'}</span>
        </div>
      </div>
    </div>
  );
}
