'use client';

import Image from 'next/image';
import { cn } from "@/lib/utils";
import React, { useState } from 'react';

/**
 * Uruvia Official Logo Component
 * 
 * This component handles the display of the app logo.
 * It is configured to use 'public/icon.png'.
 * The 'fill' property ensures it fills the container size provided via className.
 * 
 * Usage heights in the app:
 * - 32px (size-8) - Sidebar
 * - 48px (h-12) - Internal Loading
 * - 80px (h-20) - Login/Signup/Error
 * - 96px (h-24) - Global Boot Screen
 */
export function HarborLogo({ className, ...props }: React.ComponentProps<"div">) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", className)} {...props}>
      {!hasError ? (
        <Image
          src="/icon.png"
          alt="Uruvia Logo"
          fill
          className="object-contain"
          priority
          unoptimized
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="w-full h-full bg-primary flex items-center justify-center rounded-lg shadow-inner">
          <span className="text-primary-foreground font-black text-[50%] select-none">U</span>
        </div>
      )}
    </div>
  );
}
