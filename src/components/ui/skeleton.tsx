import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * @description Shimmering placeholder block shown while content is loading (shadcn/ui style).
 * Decorative only: it is hidden from assistive tech, so wrap loading regions in an element
 * with `aria-busy="true"` and a visually hidden status label.
 * @param props - Standard `div` attributes; size it via `className` (e.g. `h-4 w-24`).
 * @returns A muted, pulsing placeholder `div`.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}
