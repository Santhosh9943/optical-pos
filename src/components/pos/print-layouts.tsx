// src/components/pos/print-layouts.tsx
import React, { useMemo } from 'react';
import Decimal from 'decimal.js';

export interface PrintInvoiceItem {
  id?: string;
  inventoryItemId?: string | null;
  sku?: string;
  description: string;
  hsnCode?: string | null;
  quantity: number;
  unitPrice: string | number;
  discount?: string | number;
  discountPerUnit?: string | number;
  taxRate: string;
  category?: string;
  brand?: string | null;
  model?: string | null;
  lensType?: string | null;
  coating?: string | null;
  lensMaterial?: string | null;
  patientId?: string | null;
  patientName?: string | null;
  isCustomerOwnFrame?: boolean;
  fittingNote?: string | null;
}

export interface PrintPrescriptionData {
  patientId?: string;
  patientName?: string;
  relationType?: string;
  isCustomerOwnFrame?: boolean;
  fittingNote?: string | null;
  odSphere?: number | string | null;
  odCylinder?: number | string | null;
  odAxis?: number | string | null;
  odAdd?: number | string | null;
  odPd?: number | string | null;
  osSphere?: number | string | null;
  osCylinder?: number | string | null;
  osAxis?: number | string | null;
  osAdd?: number | string | null;
  osPd?: number | string | null;
  binocularPd?: number | string | null;
  notes?: string | null;
}

export interface PrintCustomerData {
  name: string;
  phone: string;
  age?: number | null;
  gender?: string | null;
  address?: string | null;
  email?: string | null;
  gstin?: string | null;
}

export interface PrintOrderData {
  invoiceNumber: string;
  invoiceId?: string;
  createdAt?: string | Date;
  promisedDeliveryDate?: string | Date | null;
  customer: PrintCustomerData;
  items: PrintInvoiceItem[];
  prescription?: PrintPrescriptionData | null;
  prescriptions?: PrintPrescriptionData[] | null;
  grandTotal: string | number;
  advancePaid: string | number;
  balanceDue: string | number;
  paymentMode?: string;
  paymentReference?: string | null;
  storeName?: string;
  storeGstin?: string;
  storeAddress?: string;
  storePhone?: string;
}

/** Format SPH/CYL/ADD with +/- sign and 2 decimals */
function formatDiopter(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '—';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '—';
  const sign = num > 0 ? '+' : num < 0 ? '−' : '';
  return `${sign}${Math.abs(num).toFixed(2)}`;
}

// ─────────────────────────────────────────────────────────────
// 1. THERMAL 80mm RECEIPT (Output A - Customer Tax Invoice)
// ─────────────────────────────────────────────────────────────

export function ThermalReceipt({ order }: { order: PrintOrderData }) {
  const storeName = order.storeName ?? 'Santhosh MMSS Pvt Ltd';
  const storeGstin = order.storeGstin ?? 'GSTIN: 29AABCS1429B1Z8';
  const storeAddress =
    order.storeAddress ?? '#12, Optical Plaza, CMH Road, Indiranagar, Bengaluru - 560038';
  const storePhone = order.storePhone ?? 'Ph: +91 80 2520 1234';

  const orderDate = useMemo(() => {
    const d = order.createdAt ? new Date(order.createdAt) : new Date();
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) + ' ' + d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, [order.createdAt]);

  // Tax breakdowns using Decimal.js
  const calc = useMemo(() => {
    let subtotal = new Decimal(0);
    let totalDiscount = new Decimal(0);
    let taxableValue = new Decimal(0);

    let taxable5 = new Decimal(0);
    let cgst5 = new Decimal(0);
    let sgst5 = new Decimal(0);

    let taxable18 = new Decimal(0);
    let cgst18 = new Decimal(0);
    let sgst18 = new Decimal(0);

    for (const item of order.items) {
      const qty = new Decimal(item.quantity > 0 ? item.quantity : 1);
      const unitPrice = new Decimal(item.unitPrice || '0.00');
      const discount = new Decimal(item.discount || item.discountPerUnit || '0.00');
      const taxRate = new Decimal(item.taxRate || '0.00');

      const lineSubtotal = unitPrice.times(qty);
      const diff = lineSubtotal.minus(discount);
      const lineTaxable = diff.isNegative() ? new Decimal(0) : diff;
      const lineTax = lineTaxable.times(taxRate).dividedBy(100);
      const lineCgst = lineTax.dividedBy(2);
      const lineSgst = lineTax.dividedBy(2);

      subtotal = subtotal.plus(lineSubtotal);
      totalDiscount = totalDiscount.plus(discount);
      taxableValue = taxableValue.plus(lineTaxable);

      if (item.taxRate === '5.00') {
        taxable5 = taxable5.plus(lineTaxable);
        cgst5 = cgst5.plus(lineCgst);
        sgst5 = sgst5.plus(lineSgst);
      } else if (item.taxRate === '18.00') {
        taxable18 = taxable18.plus(lineTaxable);
        cgst18 = cgst18.plus(lineCgst);
        sgst18 = sgst18.plus(lineSgst);
      }
    }

    const grandTotal = new Decimal(order.grandTotal || '0.00');
    const advance = new Decimal(order.advancePaid || '0.00');
    const balance = new Decimal(order.balanceDue || grandTotal.minus(advance));

    return {
      subtotal,
      totalDiscount,
      taxableValue,
      gst5: {
        taxable: taxable5,
        cgst: cgst5,
        sgst: sgst5,
        total: cgst5.plus(sgst5),
      },
      gst18: {
        taxable: taxable18,
        cgst: cgst18,
        sgst: sgst18,
        total: cgst18.plus(sgst18),
      },
      totalTax: cgst5.plus(sgst5).plus(cgst18).plus(sgst18),
      grandTotal,
      advancePaid: advance,
      balanceDue: balance,
    };
  }, [order.items, order.grandTotal, order.advancePaid, order.balanceDue]);

  return (
    <div id="thermal-receipt" className="text-black bg-white">
      {/* Header */}
      <div className="text-center">
        <div className="font-bold text-xs uppercase tracking-wider">{storeName}</div>
        <div className="text-[9px] leading-tight">{storeAddress}</div>
        <div className="text-[9px]">{storePhone}</div>
        <div className="text-[9px] font-semibold">{storeGstin}</div>
        <div className="text-[9px] font-bold uppercase mt-1">*** TAX INVOICE ***</div>
      </div>

      <div className="divider" />

      {/* Invoice & Patient Meta */}
      <div className="text-[9px] space-y-0.5">
        <div className="flex justify-between">
          <span className="font-bold">INVOICE:</span>
          <span className="font-mono font-bold">{order.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>DATE:</span>
          <span>{orderDate}</span>
        </div>
        <div className="flex justify-between">
          <span>PATIENT:</span>
          <span className="font-semibold">{order.customer.name}</span>
        </div>
        <div className="flex justify-between">
          <span>PHONE:</span>
          <span>{order.customer.phone}</span>
        </div>
      </div>

      <div className="divider" />

      {/* Itemised Table */}
      <table>
        <thead>
          <tr className="border-b border-black text-[9px]">
            <th style={{ width: '48%' }}>ITEM</th>
            <th className="amount-col" style={{ width: '12%' }}>QTY</th>
            <th className="amount-col" style={{ width: '18%' }}>RATE</th>
            <th className="amount-col" style={{ width: '22%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody className="text-[9px]">
          {order.items.map((item, idx) => {
            const qty = item.quantity;
            const rate = new Decimal(item.unitPrice || '0.00').toFixed(2);
            const lineTotal = new Decimal(item.unitPrice || '0.00')
              .times(qty)
              .minus(item.discount || item.discountPerUnit || '0.00')
              .toFixed(2);

            return (
              <tr key={item.id ?? idx}>
                <td>
                  <div className="font-semibold leading-tight">{item.description}</div>
                  <div className="text-[8px] text-slate-600">
                    HSN: {item.hsnCode || '—'} · GST {item.taxRate}%
                  </div>
                </td>
                <td className="amount-col">{qty}</td>
                <td className="amount-col">{rate}</td>
                <td className="amount-col">{lineTotal}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="divider" />

      {/* Financial Summary */}
      <div className="text-[9px] space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="amount-col font-mono">₹{calc.subtotal.toFixed(2)}</span>
        </div>
        {calc.totalDiscount.greaterThan(0) && (
          <div className="flex justify-between text-slate-700">
            <span>Discount:</span>
            <span className="amount-col font-mono">−₹{calc.totalDiscount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Taxable Value:</span>
          <span className="amount-col font-mono">₹{calc.taxableValue.toFixed(2)}</span>
        </div>
      </div>

      <div className="divider" />

      {/* GST Breakdown (5% & 18%) */}
      <div className="text-[8.5px] space-y-0.5">
        <div className="font-bold text-[9px] underline">GST BREAKDOWN:</div>
        {calc.gst5.taxable.greaterThan(0) && (
          <div className="pl-1">
            <div className="flex justify-between text-slate-800">
              <span>GST 5% (HSN 9001 on ₹{calc.gst5.taxable.toFixed(2)}):</span>
              <span className="font-mono">₹{calc.gst5.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[8px] text-slate-600 pl-2">
              <span>CGST 2.5%: ₹{calc.gst5.cgst.toFixed(2)} | SGST 2.5%: ₹{calc.gst5.sgst.toFixed(2)}</span>
            </div>
          </div>
        )}
        {calc.gst18.taxable.greaterThan(0) && (
          <div className="pl-1">
            <div className="flex justify-between text-slate-800">
              <span>GST 18% (HSN 9003 on ₹{calc.gst18.taxable.toFixed(2)}):</span>
              <span className="font-mono">₹{calc.gst18.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[8px] text-slate-600 pl-2">
              <span>CGST 9%: ₹{calc.gst18.cgst.toFixed(2)} | SGST 9%: ₹{calc.gst18.sgst.toFixed(2)}</span>
            </div>
          </div>
        )}
        <div className="flex justify-between font-semibold border-t border-dotted border-black pt-0.5">
          <span>Total GST:</span>
          <span className="font-mono">₹{calc.totalTax.toFixed(2)}</span>
        </div>
      </div>

      <div className="divider" />

      {/* Grand Total & Settlement */}
      <div className="text-[10px] space-y-1">
        <div className="flex justify-between font-bold text-xs">
          <span>GRAND TOTAL:</span>
          <span className="font-mono">₹{calc.grandTotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-[9px] pt-1">
          <span>Payment Mode:</span>
          <span className="font-semibold uppercase">{order.paymentMode || 'CASH'}</span>
        </div>

        <div className="flex justify-between text-[9px]">
          <span>Advance Paid:</span>
          <span className="font-mono font-semibold">₹{calc.advancePaid.toFixed(2)}</span>
        </div>

        <div className="flex justify-between font-bold text-[10px] border-t border-black pt-0.5">
          <span>BALANCE DUE:</span>
          <span className="font-mono">
            ₹{calc.balanceDue.isNegative() ? '0.00' : calc.balanceDue.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="divider" />

      {/* Store Policies & Footer */}
      <div className="text-center text-[8px] space-y-1 pt-1">
        <div>Goods once sold will not be taken back.</div>
        <div>Warranty as per manufacturer terms.</div>
        <div className="font-semibold mt-1">Thank you for visiting Santhosh MMSS!</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. WORKSHOP LAB SLIP (Output B - Workshop Fabrication Slip)
// ─────────────────────────────────────────────────────────────

export function WorkshopSlip({ order }: { order: PrintOrderData }) {
  const rx = order.prescription;
  const promisedDate = useMemo(() => {
    if (order.promisedDeliveryDate) {
      const d = new Date(order.promisedDeliveryDate);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    const d = new Date();
    d.setDate(d.getDate() + 2); // Default 2 days for lab fabrication
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [order.promisedDeliveryDate]);

  // Identify frame and lens details from cart items
  const frameItems = order.items.filter(
    (i) => i.category === 'FRAME' || i.category === 'SUNGLASS' || (!i.category && (i.brand || i.model))
  );
  const lensItems = order.items.filter((i) => i.category === 'LENS' || i.lensType);

  return (
    <div id="lab-slip" className="text-black bg-white">
      {/* Header with Job Ticket */}
      <div className="border-b-2 border-black pb-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="job-ticket">JOB #{order.invoiceNumber}</div>
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-700">
              OPTICAL WORKSHOP FABRICATION ORDER
            </div>
          </div>
          <div className="text-right text-xs">
            <div><span className="font-bold">Promised:</span> {promisedDate}</div>
            <div>
              <span className="font-bold">Order Date:</span>{' '}
              {new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN')}
            </div>
          </div>
        </div>

        {/* Patient Profile */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs bg-slate-50 p-2 border border-slate-200">
          <div>
            <span className="font-semibold text-slate-600">Patient: </span>
            <span className="font-bold">{order.customer.name}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">Phone: </span>
            <span>{order.customer.phone}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">Demographics: </span>
            <span>
              {order.customer.gender ?? '—'}, {order.customer.age ? `${order.customer.age} yrs` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Frame Chassis Specification */}
      <div className="mt-4">
        <div className="font-bold text-sm uppercase tracking-wide border-b border-black pb-1">
          1. Frame Chassis Specification
        </div>
        <div className="mt-2 text-xs space-y-1">
          {frameItems.length > 0 ? (
            frameItems.map((f, idx) => (
              <div key={idx} className="p-2 border border-slate-300 rounded bg-slate-50/50">
                <div className="font-bold text-sm">
                  {f.brand ? `${f.brand} ` : ''}{f.model ? `${f.model} — ` : ''}{f.description}
                </div>
                <div className="text-slate-600 text-[11px] mt-0.5">
                  SKU: <span className="font-mono">{f.sku || '—'}</span> · Type: {f.category || 'FRAME'}
                </div>
              </div>
            ))
          ) : (
            <div className="p-2 border border-dashed border-slate-300 rounded text-slate-600">
              Customer's Own Frame (Fitting Only)
            </div>
          )}
        </div>
      </div>

      {/* Refraction Matrix - Loops over each distinct prescription for family orders */}
      <div className="mt-4 space-y-4">
        <div className="font-bold text-sm uppercase tracking-wide border-b border-black pb-1">
          2. Clinical Refraction Matrix (OD / OS)
        </div>

        {(() => {
          const rxList =
            order.prescriptions && order.prescriptions.length > 0
              ? order.prescriptions
              : order.prescription
                ? [order.prescription]
                : [];

          if (rxList.length === 0) {
            return (
              <div className="p-3 border border-dashed border-slate-300 text-xs italic text-slate-500">
                No clinical prescription attached to this order.
              </div>
            );
          }

          return rxList.map((rxItem, idx) => (
            <div key={idx} className="space-y-1.5 border border-slate-300 p-2.5 rounded bg-slate-50/40">
              {/* Prescription Header / Recipient */}
              <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-200">
                <div className="font-bold">
                  <span className="text-slate-600">For: </span>
                  <span className="text-blue-900">{rxItem.patientName || order.customer.name}</span>
                  {rxItem.relationType && (
                    <span className="ml-1.5 font-normal text-slate-500">
                      ({rxItem.relationType})
                    </span>
                  )}
                </div>

                {rxItem.isCustomerOwnFrame && (
                  <span className="font-bold text-[10px] uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                    Customer&apos;s Own Frame
                    {rxItem.fittingNote ? ` — ${rxItem.fittingNote}` : ''}
                  </span>
                )}
              </div>

              <table className="rx-grid">
                <thead>
                  <tr>
                    <th className="eye-label">Eye</th>
                    <th>SPHERE (SPH)</th>
                    <th>CYLINDER (CYL)</th>
                    <th>AXIS (1–180°)</th>
                    <th>ADDITION (ADD)</th>
                    <th>MONO PD (mm)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="eye-label">OD (Right Eye)</td>
                    <td className="font-mono font-bold text-sm">{formatDiopter(rxItem.odSphere)}</td>
                    <td className="font-mono font-bold text-sm">{formatDiopter(rxItem.odCylinder)}</td>
                    <td className="font-mono font-bold text-sm">
                      {rxItem.odAxis ? `${rxItem.odAxis}°` : '—'}
                    </td>
                    <td className="font-mono font-bold text-sm">{formatDiopter(rxItem.odAdd)}</td>
                    <td className="font-mono text-sm">
                      {rxItem.odPd ? `${rxItem.odPd} mm` : rxItem.binocularPd ? `${rxItem.binocularPd} mm (Binoc)` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="eye-label">OS (Left Eye)</td>
                    <td className="font-mono font-bold text-sm">{formatDiopter(rxItem.osSphere)}</td>
                    <td className="font-mono font-bold text-sm">{formatDiopter(rxItem.osCylinder)}</td>
                    <td className="font-mono font-bold text-sm">
                      {rxItem.osAxis ? `${rxItem.osAxis}°` : '—'}
                    </td>
                    <td className="font-mono font-bold text-sm">{formatDiopter(rxItem.osAdd)}</td>
                    <td className="font-mono text-sm">
                      {rxItem.osPd ? `${rxItem.osPd} mm` : rxItem.binocularPd ? `${rxItem.binocularPd} mm (Binoc)` : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {rxItem.binocularPd && (
                <div className="pt-1 text-[11px] font-semibold text-slate-700">
                  Binocular Pupillary Distance (PD): <span className="font-mono">{rxItem.binocularPd} mm</span>
                </div>
              )}
            </div>
          ));
        })()}
      </div>

      {/* Ophthalmic Lens Fabrication Parameters */}
      <div className="mt-4">
        <div className="font-bold text-sm uppercase tracking-wide border-b border-black pb-1">
          3. Ophthalmic Lens Fabrication Parameters
        </div>

        <div className="mt-2 text-xs space-y-2">
          {lensItems.length > 0 ? (
            lensItems.map((l, idx) => (
              <div
                key={idx}
                className="border border-slate-300 p-2.5 rounded bg-slate-50/50 space-y-1.5"
              >
                <div className="flex justify-between items-center font-bold text-xs">
                  <span>{l.description}</span>
                  {l.patientName && (
                    <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      For: {l.patientName}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Design: </span>
                    <span className="font-semibold">
                      {l.lensType || 'Single Vision (Standard)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Coating: </span>
                    <span className="font-semibold">
                      {l.coating || 'Anti-Reflective + UV400'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Material: </span>
                    <span className="font-semibold">
                      {l.lensMaterial || 'CR39 Organic (Index 1.50)'}
                    </span>
                  </div>
                </div>
                {l.isCustomerOwnFrame && (
                  <div className="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1">
                    <span className="font-bold">Customer's Own Frame: </span>
                    <span>
                      {l.fittingNote || 'Standard assembly into customer supplied frame chassis.'}
                    </span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-3 border border-dashed border-slate-300 rounded text-xs text-slate-500 italic">
              No ophthalmic lenses attached to this order.
            </div>
          )}
        </div>
      </div>

      {/* Special Lab Instructions & Quality Sign-Off */}
      <div className="mt-4 border-t border-black pt-3">
        <div className="flex justify-between items-end">
          <div className="text-xs space-y-1 w-2/3">
            <div className="font-semibold">Special Workshop Instructions:</div>
            <div className="p-2 border border-slate-200 rounded min-h-[40px] text-slate-700 bg-slate-50/50">
              {rx?.notes || 'Standard edge beveling and center thickness optimization.'}
            </div>
          </div>

          <div className="text-center w-1/3 pl-4">
            <div className="h-10 border-b border-dashed border-black" />
            <div className="text-[11px] font-semibold mt-1">Lab Technician Sign-off</div>
          </div>
        </div>
      </div>

      {/*
        STRICT REDACTION REQUIREMENT:
        Wrapped inside .financial-data so that @media print forcibly applies
        display: none !important; and strips all monetary figures.
      */}
      <div className="financial-data mt-6 p-2 border border-red-300 bg-red-50 text-red-700 text-xs">
        <div className="font-bold">[REDACTED FINANCIAL DATA - LAB SLIP EXCLUSION]</div>
        <div>Grand Total: ₹{order.grandTotal}</div>
        <div>Advance Paid: ₹{order.advancePaid}</div>
        <div>Balance Due: ₹{order.balanceDue}</div>
      </div>
    </div>
  );
}
