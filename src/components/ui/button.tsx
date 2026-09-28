import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md',
        primary:
          'bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow-md dark:bg-blue-600 dark:hover:bg-blue-500',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 border border-border',
        outline:
          'border border-border bg-background shadow-xs hover:bg-muted hover:text-foreground text-foreground',
        ghost:
          'hover:bg-muted hover:text-foreground text-muted-foreground',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
        success:
          'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500',
        warning:
          'bg-amber-600 text-white shadow-xs hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500',
        link:
          'text-primary underline-offset-4 hover:underline p-0 h-auto font-medium',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-xl px-6 text-sm',
        icon: 'h-9 w-9 p-0 rounded-lg',
        iconSm: 'h-7 w-7 p-0 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
