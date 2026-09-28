import type { Metadata } from 'next';
import Link from 'next/link';
import { Glasses, Home } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Page not found | OptixOS',
};

/**
 * @description Global themed 404 page for unmatched URLs and `notFound()` calls.
 * Standalone screen (no dashboard layout), so a constrained centered card is permitted.
 * @returns The not-found screen with a link back to the home page.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-full w-full items-center justify-center bg-background p-4 md:p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center text-card-foreground shadow-xs">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Glasses className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="font-mono text-sm font-semibold text-muted-foreground">404</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you are looking for does not exist or may have moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          <span>Back to home</span>
        </Link>
      </div>
    </main>
  );
}
