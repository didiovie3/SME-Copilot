'use client';

import { HarborLogo } from "@/components/icons";

/**
 * Global Boot Loader
 * This screen is shown during the initial app load and critical auth/profile checks.
 */
export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <HarborLogo className="h-24 w-24 relative" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-black tracking-tighter text-primary">Uruvia</h2>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-full origin-left bg-primary animate-infinite-loading" />
          </div>
          <p className="text-xs font-medium text-muted-foreground animate-pulse uppercase tracking-[0.3em]">
            Synchronizing
          </p>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes infinite-loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        .animate-infinite-loading {
          animation: infinite-loading 2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
      `}} />
    </div>
  );
}
