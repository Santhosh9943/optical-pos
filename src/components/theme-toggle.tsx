'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-8 w-8 rounded-md border border-border bg-background" />
    );
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
      title={`Current theme: ${theme} (click to toggle)`}
    >
      {theme === 'light' && (
        <>
          <Sun className="h-3.5 w-3.5 text-amber-500 transition-transform" />
          <span className="text-[11px] font-medium capitalize text-muted-foreground">Light</span>
        </>
      )}
      {theme === 'dark' && (
        <>
          <Moon className="h-3.5 w-3.5 text-blue-400 transition-transform" />
          <span className="text-[11px] font-medium capitalize text-muted-foreground">Dark</span>
        </>
      )}
      {theme !== 'light' && theme !== 'dark' && (
        <>
          <Laptop className="h-3.5 w-3.5 text-emerald-500 transition-transform" />
          <span className="text-[11px] font-medium capitalize text-muted-foreground">System</span>
        </>
      )}
    </button>
  );
}
