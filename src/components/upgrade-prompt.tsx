
'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Sparkles, ChevronRight, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface UpgradePromptProps {
  featureName: string;
  requiredTier: "pro" | "copilot";
  description: string;
  variant?: "inline" | "overlay" | "page" | "blur";
  children?: React.ReactNode;
}

export function UpgradePrompt({ 
  featureName, 
  requiredTier, 
  description, 
  variant = "overlay", 
  children 
}: UpgradePromptProps) {
  const tierLabel = requiredTier === 'pro' 
    ? "Upgrade to Pro — ₦15,000/month" 
    : "Available on SME Copilot — From ₦50,000/month";
  
  const content = (
    <div className="flex flex-col items-center text-center gap-4 max-w-sm mx-auto p-6">
      <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          {tierLabel}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      <div className="w-full space-y-3 pt-2">
        <Button asChild className="w-full gap-2 shadow-lg shadow-primary/20">
          <Link href="/pricing">
            <ArrowUpCircle className="h-4 w-4" />
            {requiredTier === 'pro' ? 'Upgrade Now' : 'Get Custom Quote'}
          </Link>
        </Button>
        <Link href="/pricing" className="text-[10px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors flex items-center justify-center gap-1">
          Learn More <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );

  if (variant === 'blur') {
    return (
      <div className="relative group overflow-hidden rounded-xl border">
        <div className="blur-[8px] grayscale pointer-events-none opacity-40 transition-all duration-700">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
          <Card className="border-none shadow-2xl bg-card/90 max-w-xs">
            <CardContent className="p-0">
              <div className="flex flex-col items-center text-center gap-3 p-6">
                <div className="p-2 rounded-full bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm">Unlock {featureName}</h4>
                  <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
                </div>
                <Button asChild size="sm" className="w-full h-8 text-[10px] uppercase font-bold">
                  <Link href="/pricing">Upgrade to {requiredTier === 'copilot' ? 'Copilot' : 'Pro'}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-bold">{featureName} is Premium</p>
            <p className="text-[10px] text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="h-8 text-xs">
          <Link href="/pricing">Upgrade Plan</Link>
        </Button>
      </div>
    );
  }

  if (variant === 'page') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-700">
        <Card className="max-w-md border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardContent className="p-0">
            {content}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="border-dashed bg-card/30 backdrop-blur-[1px]">
      <CardContent className="p-0">
        {content}
      </CardContent>
    </Card>
  );
}
