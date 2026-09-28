import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 pb-1',
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          {icon && (
            <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
              {icon}
            </span>
          )}
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
            {title}
          </h1>
          {badge && <span className="ml-1">{badge}</span>}
        </div>
        {description && (
          <p className="text-xs md:text-sm text-muted-foreground max-w-3xl">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
