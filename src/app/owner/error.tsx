'use client';

import { RouteErrorFallback } from '@/components/layout/route-states';

/**
 * @description Route-segment error boundary. Renders inside the persistent layout so navigation
 * stays usable, and offers a Retry that re-fetches and re-renders the failed segment.
 * @param props.error - The error forwarded by Next.js (generic message for Server Component errors).
 * @param props.retry - Next.js 16 boundary function that re-fetches and re-renders the segment.
 * @returns The themed error fallback.
 */
export default function OwnerSegmentError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <RouteErrorFallback error={error} retry={retry} area="owner portal page" />;
}
