import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ClientProviders } from './client-providers';
import React from 'react';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Uruvia | Digital Business Management',
  description: 'Professional SME management navigator.',
};

/**
 * Root Layout Component
 * Handles the global HTML structure and meta tags via Server Component.
 * Delegates interactive providers to the ClientProviders component.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('font-body antialiased min-h-screen bg-background', inter.variable)}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
