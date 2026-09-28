import * as React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-dashed border-border bg-card/50',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
        {icon}
      </div>
      <h3 className="text-base md:text-lg font-bold text-foreground">
        {title}
      </h3>
      <p className="mt-1 text-xs md:text-sm text-muted-foreground max-w-sm">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
