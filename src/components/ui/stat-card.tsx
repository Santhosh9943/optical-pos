import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './card';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden hover:border-primary/40 transition-colors', className)}>
      <CardContent className="p-5 md:p-6 flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  'text-xs font-bold px-1.5 py-0.5 rounded-md',
                  trend.isPositive
                    ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'text-red-700 bg-red-100 dark:bg-red-950 dark:text-red-400'
                )}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
