'use client';

import { useEffect, useRef } from 'react';

export interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxIntervalMs?: number;
  enabled?: boolean;
}

/**
 * High-speed Global USB/Bluetooth HID Barcode Scanner Listener.
 * Optical retail scanners transmit keystrokes with <50ms inter-character latency ending with 'Enter'.
 * This hook captures hardware barcode sweeps globally even when search inputs are unfocused.
 */
export function useBarcodeScanner({
  onScan,
  minChars = 3,
  maxIntervalMs = 50,
  enabled = true,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept function keys or control combinations
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key.startsWith('F') && e.key.length > 1) return;

      const now = performance.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // If more than 200ms passed since last keystroke, reset buffer
      if (interval > 200) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        if (barcode.length >= minChars) {
          // If active element is an input, blur it or prevent duplicate form submission
          const activeTag = document.activeElement?.tagName?.toLowerCase();
          if (activeTag === 'input' || activeTag === 'textarea') {
            // Check if the input field already caught it or if we should dispatch scan
            e.preventDefault();
          }
          onScanRef.current(barcode);
          bufferRef.current = '';
        }
        return;
      }

      // Only accumulate printable single characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, minChars, maxIntervalMs]);
}
