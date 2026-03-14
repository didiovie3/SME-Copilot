'use client';

import { HarborLogo } from "@/components/icons";

/**
 * Internal Navigation Loader
 * This screen appears within the sidebar layout when navigating between sections.
 */
export default function InternalLoading() {
  return (
    <div className="flex h-[calc(100vh-12rem)] w-full flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-20 w-20 animate-spin rounded-full border-b-2 border-primary/20" />
        <HarborLogo className="h-12 w-12 text-primary/40 animate-pulse" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.3em]">
          Retrieving Records
        </p>
      </div>
    </div>
  );
}
