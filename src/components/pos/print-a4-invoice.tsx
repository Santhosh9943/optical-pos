// src/components/pos/print-a4-invoice.tsx
import React, { useMemo } from 'react';
import Decimal from 'decimal.js';
import type { PrintOrderData } from './print-layouts';

function formatDiopter(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '—';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '—';
  const sign = num > 0 ? '+' : num < 0 ? '−' : '';
  return `${sign}${Math.abs(num).toFixed(2)}`;
}

export function A4Invoice({ order }: { order: PrintOrderData }) {
  const storeName = order.storeName ?? 'Santhosh MMSS Pvt Ltd';
  const storeAddress =
    order.storeAddress ??
    'No. 42, Big Street, Near Annamalaiyar Temple, Tiruvannamalai - 606601, Tamil Nadu';
  const storePhone = order.storePhone ?? 'Phone: +91 94432 12345, +91 4175 223344';
  const storeGstin = order.storeGstin ?? 'GSTIN: 33AABCS1429B1Z8';

  const orderDate = useMemo(() => {
    const d = order.createdAt ? new Date(order.createdAt) : new Date();
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [order.createdAt]);

  const orderTime = useMemo(() => {
    const d = order.createdAt ? new Date(order.createdAt) : new Date();
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, [order.createdAt]);

  // Precise financial totals using Decimal.js
  const calc = useMemo(() => {
    let subtotal = new Decimal(0);
    let totalDiscount = new Decimal(0);
    let taxableValue = new Decimal(0);
    let cgst = new Decimal(0);
    let sgst = new Decimal(0);

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
      cgst = cgst.plus(lineCgst);
      sgst = sgst.plus(lineSgst);
    }

    const grandTotal = new Decimal(order.grandTotal || '0.00');
    const advance = new Decimal(order.advancePaid || '0.00');
    const balance = new Decimal(order.balanceDue || grandTotal.minus(advance));

    return {
      subtotal,
      totalDiscount,
      taxableValue,
      cgst,
      sgst,
      totalTax: cgst.plus(sgst),
      grandTotal,
      advancePaid: advance,
      balanceDue: balance,
    };
  }, [order.items, order.grandTotal, order.advancePaid, order.balanceDue]);

  const rx = order.prescription;
  const hasPrescription =
    rx &&
    (rx.odSphere !== 0 ||
      rx.odCylinder !== 0 ||
      rx.osSphere !== 0 ||
      rx.osCylinder !== 0 ||
      rx.odAdd !== 0 ||
      rx.osAdd !== 0 ||
      rx.binocularPd);

  return (
    <div
      id="a4-invoice"
      className="w-full bg-white text-black p-8 max-w-4xl mx-auto font-sans leading-normal border border-black"
      style={{ boxSizing: 'border-box' }}
    >
      {/* ── 1. HEADER ── */}
      <div className="border-b-2 border-black pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-black">
              {storeName}
            </h1>
            <p className="text-xs text-black font-medium mt-0.5">{storeAddress}</p>
            <p className="text-xs text-black mt-0.5">
              {storePhone} · Email: <span className="font-mono">billing@santhoshmmss.com</span>
            </p>
            <p className="text-xs font-bold text-black mt-1">
              {storeGstin} · State: Tamil Nadu (Code: 33)
            </p>
          </div>

          <div className="text-right">
            <div className="inline-block border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-wider bg-gray-100 text-black">
              TAX INVOICE
            </div>
            <div className="text-[11px] font-semibold text-black mt-1">
              Original for Recipient
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. META GRID: PATIENT & INVOICE DETAILS ── */}
      <div className="grid grid-cols-2 gap-4 border-b border-black py-3 text-xs">
        {/* Left Column: Patient Profile */}
        <div className="space-y-1 pr-2 border-r border-black">
          <div className="font-bold text-[11px] uppercase tracking-wider text-black mb-1">
            Billed To / Patient Details:
          </div>
          <div className="flex">
            <span className="w-24 font-bold text-black">Patient Name:</span>
            <span className="font-bold uppercase text-black">{order.customer.name}</span>
          </div>
          <div className="flex">
            <span className="w-24 font-bold text-black">Contact Phone:</span>
            <span className="font-mono text-black">{order.customer.phone}</span>
          </div>
          <div className="flex">
            <span className="w-24 text-black">Demographics:</span>
            <span className="text-black">
              {order.customer.gender ?? '—'}, {order.customer.age ? `${order.customer.age} yrs` : '—'}
            </span>
          </div>
          <div className="flex">
            <span className="w-24 text-black">Address / City:</span>
            <span className="text-black">{order.customer.address || 'Tiruvannamalai'}</span>
          </div>
        </div>

        {/* Right Column: Invoice Metadata */}
        <div className="space-y-1 pl-2">
          <div className="font-bold text-[11px] uppercase tracking-wider text-black mb-1">
            Invoice Information:
          </div>
          <div className="flex">
            <span className="w-28 font-bold text-black">Invoice Number:</span>
            <span className="font-mono font-black text-black">{order.invoiceNumber}</span>
          </div>
          <div className="flex">
            <span className="w-28 font-bold text-black">Invoice Date:</span>
            <span className="text-black">{orderDate} ({orderTime})</span>
          </div>
          <div className="flex">
            <span className="w-28 text-black">Payment Mode:</span>
            <span className="font-bold uppercase text-black">{order.paymentMode || 'CASH'}</span>
          </div>
          {order.paymentReference && (
            <div className="flex">
              <span className="w-28 text-black">Transaction Ref:</span>
              <span className="font-mono text-black">{order.paymentReference}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. RX PRESCRIPTION SUMMARY (COMPACT) ── */}
      {hasPrescription && (
        <div className="border-b border-black py-3">
          <div className="font-bold text-[11px] uppercase tracking-wider text-black mb-1.5 flex justify-between items-center">
            <span>Clinical Refraction Details (OD / OS Matrix)</span>
            {rx?.binocularPd && (
              <span className="text-[11px] font-normal">
                Binocular PD: <strong className="font-mono">{rx.binocularPd} mm</strong>
              </span>
            )}
          </div>

          <table className="w-full text-xs text-center border-collapse border border-black">
            <thead>
              <tr className="bg-gray-100 font-bold border-b border-black text-[11px]">
                <th className="border border-black py-1 px-2 text-left w-24">EYE</th>
                <th className="border border-black py-1 px-2">SPHERE (SPH)</th>
                <th className="border border-black py-1 px-2">CYLINDER (CYL)</th>
                <th className="border border-black py-1 px-2">AXIS (1–180°)</th>
                <th className="border border-black py-1 px-2">ADDITION (ADD)</th>
                <th className="border border-black py-1 px-2">MONO PD</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black py-1 px-2 text-left font-bold bg-gray-50">
                  OD (Right Eye)
                </td>
                <td className="border border-black py-1 px-2 font-mono font-semibold">
                  {formatDiopter(rx?.odSphere)}
                </td>
                <td className="border border-black py-1 px-2 font-mono font-semibold">
                  {formatDiopter(rx?.odCylinder)}
                </td>
                <td className="border border-black py-1 px-2 font-mono">
                  {rx?.odAxis ? `${rx.odAxis}°` : '—'}
                </td>
                <td className="border border-black py-1 px-2 font-mono font-semibold">
                  {formatDiopter(rx?.odAdd)}
                </td>
                <td className="border border-black py-1 px-2 font-mono">
                  {rx?.odPd ? `${rx.odPd} mm` : '—'}
                </td>
              </tr>
              <tr>
                <td className="border border-black py-1 px-2 text-left font-bold bg-gray-50">
                  OS (Left Eye)
                </td>
                <td className="border border-black py-1 px-2 font-mono font-semibold">
                  {formatDiopter(rx?.osSphere)}
                </td>
                <td className="border border-black py-1 px-2 font-mono font-semibold">
                  {formatDiopter(rx?.osCylinder)}
                </td>
                <td className="border border-black py-1 px-2 font-mono">
                  {rx?.osAxis ? `${rx.osAxis}°` : '—'}
                </td>
                <td className="border border-black py-1 px-2 font-mono font-semibold">
                  {formatDiopter(rx?.osAdd)}
                </td>
                <td className="border border-black py-1 px-2 font-mono">
                  {rx?.osPd ? `${rx.osPd} mm` : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── 4. LINE ITEMS TABLE ── */}
      <div className="py-3">
        <div className="font-bold text-[11px] uppercase tracking-wider text-black mb-1.5">
          Particulars & Itemized Charges
        </div>

        <table className="w-full text-xs border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100 font-bold border-b border-black text-[11px]">
              <th className="border border-black py-1.5 px-2 text-center w-10">S.No</th>
              <th className="border border-black py-1.5 px-2 text-left">Item Description</th>
              <th className="border border-black py-1.5 px-2 text-center w-16">HSN</th>
              <th className="border border-black py-1.5 px-2 text-center w-12">Qty</th>
              <th className="border border-black py-1.5 px-2 text-right w-20">Unit Price</th>
              <th className="border border-black py-1.5 px-2 text-right w-16">Discount</th>
              <th className="border border-black py-1.5 px-2 text-center w-16">Tax Rate</th>
              <th className="border border-black py-1.5 px-2 text-right w-24">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => {
              const qty = new Decimal(item.quantity > 0 ? item.quantity : 1);
              const unitPrice = new Decimal(item.unitPrice || '0.00');
              const discount = new Decimal(item.discount || item.discountPerUnit || '0.00');
              const taxRate = new Decimal(item.taxRate || '0.00');

              const lineSubtotal = unitPrice.times(qty);
              const diff = lineSubtotal.minus(discount);
              const lineTaxable = diff.isNegative() ? new Decimal(0) : diff;
              const lineTax = lineTaxable.times(taxRate).dividedBy(100);
              const lineTotal = lineTaxable.plus(lineTax);

              return (
                <tr key={item.id ?? idx} className="border-b border-black">
                  <td className="border border-black py-1.5 px-2 text-center">{idx + 1}</td>
                  <td className="border border-black py-1.5 px-2 text-left">
                    <div className="font-bold text-black">{item.description}</div>
                    {item.sku && (
                      <div className="text-[10px] text-gray-700 font-mono">
                        SKU: {item.sku}
                        {item.lensType ? ` · Type: ${item.lensType}` : ''}
                        {item.coating ? ` · Coating: ${item.coating}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="border border-black py-1.5 px-2 text-center font-mono text-[11px]">
                    {item.hsnCode || '—'}
                  </td>
                  <td className="border border-black py-1.5 px-2 text-center font-bold">
                    {item.quantity}
                  </td>
                  <td className="border border-black py-1.5 px-2 text-right font-mono">
                    ₹{unitPrice.toFixed(2)}
                  </td>
                  <td className="border border-black py-1.5 px-2 text-right font-mono">
                    {discount.greaterThan(0) ? `₹${discount.toFixed(2)}` : '—'}
                  </td>
                  <td className="border border-black py-1.5 px-2 text-center font-mono">
                    {taxRate.toFixed(0)}%
                  </td>
                  <td className="border border-black py-1.5 px-2 text-right font-mono font-bold">
                    ₹{lineTotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── 5. SUMMARY FOOTER & FINANCIAL BREAKDOWN ── */}
      <div className="grid grid-cols-2 gap-4 border-t border-black pt-3">
        {/* Left Side: Tax Breakdown Table & Bank Info */}
        <div className="space-y-2 text-xs pr-2">
          <div className="border border-black p-2 bg-gray-50 space-y-1">
            <div className="font-bold text-[10px] uppercase tracking-wider text-black">
              GST Tax Schedule:
            </div>
            <div className="text-[11px] flex justify-between">
              <span>Central GST (CGST):</span>
              <span className="font-mono font-semibold">₹{calc.cgst.toFixed(2)}</span>
            </div>
            <div className="text-[11px] flex justify-between">
              <span>State GST (SGST):</span>
              <span className="font-mono font-semibold">₹{calc.sgst.toFixed(2)}</span>
            </div>
            <div className="text-[11px] flex justify-between border-t border-black pt-0.5 font-bold">
              <span>Total Tax Collected:</span>
              <span className="font-mono">₹{calc.totalTax.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-[10px] text-gray-800 space-y-0.5">
            <div>Bank: <strong>HDFC Bank — Tiruvannamalai Branch</strong></div>
            <div>A/C Name: <strong>Santhosh MMSS Pvt Ltd</strong></div>
            <div>Account No: <span className="font-mono">50200088991122</span> · IFSC: <span className="font-mono">HDFC0001234</span></div>
          </div>
        </div>

        {/* Right Side: Calculation Summary Block */}
        <div className="pl-2">
          <table className="w-full text-xs border-collapse border border-black">
            <tbody>
              <tr>
                <td className="border border-black py-1 px-3 font-semibold bg-gray-50">
                  Items Subtotal:
                </td>
                <td className="border border-black py-1 px-3 text-right font-mono">
                  ₹{calc.subtotal.toFixed(2)}
                </td>
              </tr>
              {calc.totalDiscount.greaterThan(0) && (
                <tr>
                  <td className="border border-black py-1 px-3 font-semibold bg-gray-50">
                    Total Discount:
                  </td>
                  <td className="border border-black py-1 px-3 text-right font-mono text-black">
                    −₹{calc.totalDiscount.toFixed(2)}
                  </td>
                </tr>
              )}
              <tr>
                <td className="border border-black py-1 px-3 font-semibold bg-gray-50">
                  Taxable Value:
                </td>
                <td className="border border-black py-1 px-3 text-right font-mono">
                  ₹{calc.taxableValue.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="border border-black py-1 px-3 font-semibold bg-gray-50">
                  Total CGST:
                </td>
                <td className="border border-black py-1 px-3 text-right font-mono">
                  ₹{calc.cgst.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="border border-black py-1 px-3 font-semibold bg-gray-50">
                  Total SGST:
                </td>
                <td className="border border-black py-1 px-3 text-right font-mono">
                  ₹{calc.sgst.toFixed(2)}
                </td>
              </tr>
              <tr className="bg-gray-100 font-bold text-sm">
                <td className="border border-black py-1.5 px-3 uppercase">
                  Grand Total:
                </td>
                <td className="border border-black py-1.5 px-3 text-right font-mono font-black">
                  ₹{calc.grandTotal.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="border border-black py-1 px-3 font-semibold bg-gray-50">
                  Advance Paid:
                </td>
                <td className="border border-black py-1 px-3 text-right font-mono font-bold">
                  ₹{calc.advancePaid.toFixed(2)}
                </td>
              </tr>
              <tr className="border-t-2 border-black font-bold text-sm bg-gray-50">
                <td className="border border-black py-1.5 px-3 uppercase text-black">
                  Balance Due:
                </td>
                <td className="border border-black py-1.5 px-3 text-right font-mono font-black text-black">
                  ₹{calc.balanceDue.isNegative() ? '0.00' : calc.balanceDue.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 6. TERMS & SIGNATURE ── */}
      <div className="grid grid-cols-2 gap-4 border-t-2 border-black mt-4 pt-3 text-xs">
        {/* Left Terms */}
        <div className="space-y-1 text-[10px] text-gray-800 pr-4">
          <div className="font-bold text-[11px] uppercase tracking-wider text-black">
            Terms & Conditions:
          </div>
          <ol className="list-decimal list-inside space-y-0.5 leading-tight">
            <li>Goods once sold will not be taken back or exchanged after customized fitting.</li>
            <li>Adaptation period for new progressive or astigmatic lenses is 7 days.</li>
            <li>Frame warranty is subject to manufacturer terms against factory defects.</li>
            <li>Balance amount must be cleared before the delivery of finished spectacles.</li>
          </ol>
        </div>

        {/* Right Signature Block */}
        <div className="flex flex-col justify-between items-end pl-4 text-right">
          <div className="font-bold text-xs text-black">
            For {storeName}
          </div>
          <div className="w-48 pt-10 border-b border-black text-center" />
          <div className="text-[11px] font-bold text-black uppercase mt-1">
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  );
}
