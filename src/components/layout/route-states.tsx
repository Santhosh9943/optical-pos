'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * @description Generic page-level loading skeleton used by route `loading.tsx` files
 * (dashboard and owner portals). Mirrors the standard page wrapper, header block, KPI strip
 * and a content table so the layout does not jump when the real page streams in.
 * @returns A full-width skeleton page announced to assistive tech as busy.
 */
export function RouteLoadingSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col h-full w-full p-4 md:p-6 gap-6" aria-busy="true">
      <span className="sr-only" role="status">
        Loading page…
      </span>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>
      <div className="flex-1 rounded-xl border border-border bg-card p-4 space-y-3">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * @description Props for {@link RouteErrorFallback}.
 */
export interface RouteErrorFallbackProps {
  /** The error forwarded by the Next.js error boundary (message is generic for Server Component errors). */
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the failed route segment (Next.js 16 `retry` prop). */
  retry: () => void;
  /** Short name of the area that failed, used in the heading (e.g. "dashboard"). */
  area?: string;
}

/**
 * @description Themed, accessible fallback UI for route-segment `error.tsx` boundaries.
 * Logs the error once, focuses the heading so screen-reader and keyboard users land on it,
 * and offers a Retry action that calls the Next.js `retry()` boundary function.
 * @param props - {@link RouteErrorFallbackProps}
 * @returns The error card rendered inside the standard page wrapper.
 */
export function RouteErrorFallback({ error, retry, area = 'page' }: RouteErrorFallbackProps): React.JSX.Element {
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => {
    console.error(`[route-error:${area}]`, error);
    headingRef.current?.focus();
  }, [error, area]);

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-6 gap-6">
      <div
        role="alert"
        className="flex flex-col items-start gap-4 rounded-xl border border-destructive/40 bg-card p-6 text-card-foreground shadow-xs"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-base md:text-lg font-bold text-foreground focus:outline-hidden"
            >
              This {area} could not be loaded
            </h1>
            <p className="text-sm text-muted-foreground">
              Something went wrong while loading. Try again, or reload the page if the problem persists.
            </p>
          </div>
        </div>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        )}
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );
}
