// src/lib/gst.ts
// Single source of truth for GST line & invoice arithmetic.
// Shared by the checkout server action, the POS cart preview and every print layout,
// so the cart, the persisted invoice and the printed receipt can never disagree.
//
// Rounding policy (per GST practice): tax is rounded to paise PER LINE (ROUND_HALF_UP);
// CGST = round(tax / 2), SGST = tax − CGST so the halves always sum exactly to the line tax.
// Invoice totals are sums of the already-rounded line values.

import Decimal from 'decimal.js';

/** Monetary input accepted by the calculator (Drizzle numeric columns arrive as strings). */
export type MoneyInput = string | number | Decimal | null | undefined;

/** Raw values for one invoice line. */
export interface GstLineInput {
  /** Price per unit before discount. */
  unitPrice: MoneyInput;
  /** Units sold (≥ 1). */
  quantity: number;
  /** Discount for the WHOLE line (not per unit). */
  lineDiscount?: MoneyInput;
  /** GST percentage, e.g. "5.00" or "18.00". */
  taxRate: MoneyInput;
}

/** Fully computed, paise-rounded values for one line. */
export interface GstLineResult {
  gross: Decimal;
  discount: Decimal;
  taxable: Decimal;
  tax: Decimal;
  cgst: Decimal;
  sgst: Decimal;
  total: Decimal;
}

/** Aggregated invoice totals plus a per-slab (5% / 18% / other) breakdown. */
export interface GstInvoiceResult {
  subtotal: Decimal;
  discount: Decimal;
  taxable: Decimal;
  tax: Decimal;
  cgst: Decimal;
  sgst: Decimal;
  grandTotal: Decimal;
  lines: GstLineResult[];
  slabs: Record<string, { taxable: Decimal; cgst: Decimal; sgst: Decimal; tax: Decimal }>;
}

/**
 * @description Converts any monetary input to a Decimal, treating empty values as zero.
 * @param value - String, number or Decimal amount.
 * @returns A Decimal instance.
 */
export function toDecimal(value: MoneyInput): Decimal {
  if (value === null || value === undefined || value === '') return new Decimal(0);
  return value instanceof Decimal ? value : new Decimal(value);
}

/**
 * @description Rounds an amount to paise (2 dp) using ROUND_HALF_UP.
 * @param value - Amount to round.
 * @returns Rounded Decimal.
 */
export function roundPaise(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * @description Computes one invoice line: taxable value is net of discount and never negative;
 * the discount is capped at the gross so it cannot create negative lines.
 * @param line - Unit price, quantity, whole-line discount and GST rate.
 * @returns Paise-rounded gross, discount, taxable, tax, CGST, SGST and total.
 */
export function computeGstLine(line: GstLineInput): GstLineResult {
  const qty = Math.max(1, Math.trunc(line.quantity || 1));
  const gross = roundPaise(toDecimal(line.unitPrice).times(qty));
  const discount = Decimal.min(roundPaise(Decimal.max(0, toDecimal(line.lineDiscount))), gross);
  const taxable = gross.minus(discount);
  const tax = roundPaise(taxable.times(toDecimal(line.taxRate)).dividedBy(100));
  const cgst = roundPaise(tax.dividedBy(2));
  const sgst = tax.minus(cgst);
  return { gross, discount, taxable, tax, cgst, sgst, total: taxable.plus(tax) };
}

/**
 * @description Computes invoice totals from lines by summing paise-rounded line values.
 * @param lines - Invoice lines.
 * @returns Totals, per-line results and per-slab breakdown keyed by normalized rate ("5.00").
 */
export function computeGstInvoice(lines: GstLineInput[]): GstInvoiceResult {
  const zero = () => new Decimal(0);
  const result: GstInvoiceResult = {
    subtotal: zero(),
    discount: zero(),
    taxable: zero(),
    tax: zero(),
    cgst: zero(),
    sgst: zero(),
    grandTotal: zero(),
    lines: [],
    slabs: {},
  };

  for (const input of lines) {
    const line = computeGstLine(input);
    result.lines.push(line);
    result.subtotal = result.subtotal.plus(line.gross);
    result.discount = result.discount.plus(line.discount);
    result.taxable = result.taxable.plus(line.taxable);
    result.tax = result.tax.plus(line.tax);
    result.cgst = result.cgst.plus(line.cgst);
    result.sgst = result.sgst.plus(line.sgst);

    const slabKey = toDecimal(input.taxRate).toFixed(2);
    const slab = (result.slabs[slabKey] ??= { taxable: zero(), cgst: zero(), sgst: zero(), tax: zero() });
    slab.taxable = slab.taxable.plus(line.taxable);
    slab.cgst = slab.cgst.plus(line.cgst);
    slab.sgst = slab.sgst.plus(line.sgst);
    slab.tax = slab.tax.plus(line.tax);
  }

  result.grandTotal = result.taxable.plus(result.tax);
  return result;
}

/** Statutory GST slabs accepted on invoice lines (0% covers GST-exempt items). */
export const GST_RATES = ['0.00', '5.00', '12.00', '18.00', '28.00'] as const;

/** One of the accepted GST slab strings, e.g. "5.00". */
export type GstRate = (typeof GST_RATES)[number];

/**
 * @description Normalizes any rate input ("5", 5, "5.0", Decimal) to a canonical GST slab string.
 * @param value - Raw tax rate.
 * @returns The matching slab (e.g. "12.00"), or `null` when the value is not a statutory slab.
 */
export function normalizeGstRate(value: MoneyInput): GstRate | null {
  try {
    const fixed = toDecimal(value).toFixed(2);
    return (GST_RATES as readonly string[]).includes(fixed) ? (fixed as GstRate) : null;
  } catch {
    return null;
  }
}
