'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Glasses, LogOut, User } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { authClient } from '@/lib/auth-client';
import { clearClientStorageCaches } from '@/hooks/use-cached-resource';
import { toast } from 'sonner';

export default function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      clearClientStorageCaches();
      await authClient.signOut();
      toast.success('Signed out successfully');
      router.push('/auth/login');
      router.refresh();
    } catch {
      router.push('/auth/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top Navbar */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <Glasses className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-foreground">Optix Patient Portal</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full">
              Customer View
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={handleSignOut}
            data-testid="customer-logout-btn"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Portal Body */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
