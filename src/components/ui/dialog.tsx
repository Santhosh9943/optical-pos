'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-4xl',
};

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'lg',
  className,
}: DialogProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div
        className={cn(
          'relative w-full rounded-3xl border border-border bg-card p-6 md:p-8 text-card-foreground shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200',
          maxWidthMap[maxWidth],
          className
        )}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        {(title || description) && (
          <div className="mb-5 space-y-1 pr-6">
            {title && (
              <h2 id={titleId} className="text-lg md:text-xl font-bold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p id={descriptionId} className="text-xs md:text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="space-y-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
