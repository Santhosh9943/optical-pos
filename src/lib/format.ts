import Decimal from 'decimal.js';

/**
 * @description Accepted input shapes for monetary display values. Drizzle returns
 * `numeric(12, 2)` columns as `string`, so strings are the primary input.
 */
export type MoneyInput = string | number | Decimal | null | undefined;

/**
 * @description Options for {@link formatINR}.
 */
export interface FormatINROptions {
  /** Number of fraction digits to render (default `2`). */
  decimals?: number;
}

const inrFormatterCache = new Map<number, Intl.NumberFormat>();

/**
 * @description Returns a cached `en-IN` INR currency formatter for the given fraction digits.
 * @param decimals - Fixed number of fraction digits.
 * @returns A reusable `Intl.NumberFormat` instance.
 */
function getINRFormatter(decimals: number): Intl.NumberFormat {
  const cached = inrFormatterCache.get(decimals);
  if (cached) return cached;
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  inrFormatterCache.set(decimals, formatter);
  return formatter;
}

/**
 * @description Formats a monetary value as Indian Rupees with lakh/crore digit grouping
 * (e.g. `"125000.5"` → `"₹1,25,000.50"`). The value is normalised and rounded with
 * `decimal.js` (never native float math); the rounded fixed-point string is only
 * converted to a `Number` at the final step for locale-aware DISPLAY formatting.
 * `null`, `undefined` and empty strings render as zero; unparseable input renders `"—"`.
 * @param value - Amount as a Drizzle numeric string, number, or `Decimal`.
 * @param opts - Optional formatting options ({@link FormatINROptions}).
 * @returns The formatted INR currency string.
 */
export function formatINR(value: MoneyInput, opts?: FormatINROptions): string {
  const decimals = opts?.decimals ?? 2;
  let amount: Decimal;
  try {
    amount =
      value === null || value === undefined || value === ''
        ? new Decimal(0)
        : new Decimal(value);
  } catch {
    return '—';
  }
  if (!amount.isFinite()) return '—';
  const fixed = amount.toFixed(decimals, Decimal.ROUND_HALF_UP);
  return getINRFormatter(decimals).format(Number(fixed));
}

/**
 * @description Formats an optical power (SPH / CYL / ADD) for printed documents with an
 * explicit sign and two decimals, using a typographic minus (e.g. `+2.25`, `−4.50`, `0.00`).
 * Empty or unparseable values render as an em dash (`"—"`).
 * @param val - Diopter value as a number or numeric string.
 * @returns The signed, two-decimal diopter string, or `"—"` when absent.
 */
export function formatDiopter(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '—';
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return '—';
  const sign = num > 0 ? '+' : num < 0 ? '−' : '';
  return `${sign}${Math.abs(num).toFixed(2)}`;
}
