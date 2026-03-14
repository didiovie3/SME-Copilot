'use client';

import { HarborLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-6 text-center">
          <HarborLogo className="h-20 w-20 mx-auto text-primary" />
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tighter">Critical Failure</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A root-level system error has occurred. Please reload the entire application window.
            </p>
          </div>
          <Button onClick={() => reset()} className="w-full" size="lg">
            Restart Application
          </Button>
        </div>
      </body>
    </html>
  );
}
