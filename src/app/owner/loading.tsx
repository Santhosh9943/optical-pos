import { RouteLoadingSkeleton } from '@/components/layout/route-states';

/**
 * @description Streaming loading state for this route group, shown inside the persistent
 * layout while a page segment loads.
 * @returns A full-width page skeleton.
 */
export default function OwnerSegmentLoading() {
  return <RouteLoadingSkeleton />;
}
