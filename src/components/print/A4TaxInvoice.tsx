'use client';

import React, { useMemo } from 'react';
import Decimal from 'decimal.js';
import type { PrintOrderData } from '@/components/pos/print-layouts';

interface A4TaxInvoiceProps {
  order: PrintOrderData;
}

export function A4TaxInvoice({ order }: A4TaxInvoiceProps) {
  const storeName = order.storeName || 'Santhosh Optical Center';
  const storeGstin = order.storeGstin || '29AABCS1429B1Z8';
  const storeAddress =
    order.storeAddress || '123 Optical Plaza, MG Road, Bengaluru - 560001';
  const storePhone = order.storePhone || '+91 98765 43210';

  const orderDate = useMemo(() => {
    const d = order.createdAt ? new Date(order.createdAt) : new Date();
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [order.createdAt]);

  const deliveryDate = useMemo(() => {
    if (!order.promisedDeliveryDate) return '—';
    const d = new Date(order.promisedDeliveryDate);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [order.promisedDeliveryDate]);

  // Compute itemized values & tax breakdowns using decimal.js
  const { itemsComputed, taxableTotal, cgstTotal, sgstTotal, totalTaxAmount } =
    useMemo(() => {
      let taxSub = new Decimal(0);
      let cgst = new Decimal(0);
      let sgst = new Decimal(0);

      const items = (order.items || []).map((it, idx) => {
        const price = new Decimal(it.unitPrice || 0);
        const disc = new Decimal(it.discountPerUnit || it.discount || 0);
        const qty = it.quantity || 1;
        const rate = new Decimal(it.taxRate || 18);

        const netUnit = price.minus(disc);
        const taxable = netUnit.times(qty);
        const tax = taxable.times(rate).dividedBy(100);
        const halfTax = tax.dividedBy(2);
        const lineTot = taxable.plus(tax);

        taxSub = taxSub.plus(taxable);
        cgst = cgst.plus(halfTax);
        sgst = sgst.plus(halfTax);

        return {
          ...it,
          slNo: idx + 1,
          netUnitPrice: netUnit.toFixed(2),
          taxableValue: taxable.toFixed(2),
          cgstRate: rate.dividedBy(2).toFixed(1),
          cgstAmt: halfTax.toFixed(2),
          sgstRate: rate.dividedBy(2).toFixed(1),
          sgstAmt: halfTax.toFixed(2),
          lineTotal: lineTot.toFixed(2),
        };
      });

      return {
        itemsComputed: items,
        taxableTotal: taxSub.toFixed(2),
        cgstTotal: cgst.toFixed(2),
        sgstTotal: sgst.toFixed(2),
        totalTaxAmount: cgst.plus(sgst).toFixed(2),
      };
    }, [order.items]);

  const grandTotal = new Decimal(order.grandTotal || 0).toFixed(2);
  const advancePaid = new Decimal(order.advancePaid || 0).toFixed(2);
  const balanceDue = new Decimal(order.balanceDue || 0).toFixed(2);

  return (
    <div
      id="a4-invoice"
      data-testid="print-engine-a4-invoice"
      className="hidden print:block w-full max-w-[210mm] mx-auto p-8 font-sans text-xs text-black bg-white leading-normal"
    >
      {/* ── HEADER BLOCK ── */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight">{storeName}</h1>
          <p className="text-xs text-black/80 mt-1">{storeAddress}</p>
          <p className="text-xs text-black/80">Phone: {storePhone}</p>
          <p className="text-xs font-bold mt-1">GSTIN: {storeGstin}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-black uppercase tracking-wider text-black">
            TAX INVOICE
          </div>
          <div className="text-xs font-mono mt-1 font-bold">
            Invoice No: {order.invoiceNumber}
          </div>
          <div className="text-xs text-black/80 mt-0.5">Date: {orderDate}</div>
          <div className="text-xs text-black/80">Promised Delivery: {deliveryDate}</div>
        </div>
      </div>

      {/* ── BILL TO SECTION ── */}
      <div className="grid grid-cols-2 gap-4 my-4 p-3 border border-black rounded-sm">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-black/60">
            Billed To (Customer Details)
          </div>
          <div className="text-sm font-bold text-black mt-0.5">{order.customer.name}</div>
          <div className="text-xs text-black/80 font-mono">Mobile: {order.customer.phone}</div>
          {order.customer.address && (
            <div className="text-xs text-black/80 mt-0.5">{order.customer.address}</div>
          )}
          {order.customer.gstin && (
            <div className="text-xs font-bold mt-1">Customer GSTIN: {order.customer.gstin}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-black/60">
            Payment & Settlement Status
          </div>
          <div className="text-xs font-mono font-bold mt-1">
            Payment Mode: {order.paymentMode || 'CASH'}
          </div>
          {order.paymentReference && (
            <div className="text-xs font-mono text-black/80">Ref: {order.paymentReference}</div>
          )}
          <div className="text-xs mt-1">
            Balance Due:{' '}
            <span className="font-bold font-mono text-sm">
              ₹{Number(balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* ── LINE ITEMS TABLE ── */}
      <table className="w-full border-collapse border border-black my-4 text-[10px]">
        <thead>
          <tr className="bg-black/5 border-b border-black text-center font-bold">
            <th className="border border-black py-1.5 px-2 w-8">#</th>
            <th className="border border-black py-1.5 px-2 text-left">Description of Goods</th>
            <th className="border border-black py-1.5 px-2 w-16">HSN</th>
            <th className="border border-black py-1.5 px-2 w-12">Qty</th>
            <th className="border border-black py-1.5 px-2 text-right w-20">Unit Rate</th>
            <th className="border border-black py-1.5 px-2 text-right w-20">Taxable</th>
            <th className="border border-black py-1.5 px-2 text-right w-14">CGST</th>
            <th className="border border-black py-1.5 px-2 text-right w-14">SGST</th>
            <th className="border border-black py-1.5 px-2 text-right w-24">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          {itemsComputed.map((item) => (
            <tr key={item.slNo} className="border-b border-black/40">
              <td className="border border-black py-1.5 px-2 text-center align-top">
                {item.slNo}
              </td>
              <td className="border border-black py-1.5 px-2 text-left align-top">
                <div className="font-bold text-xs">{item.description}</div>
                {item.patientName && (
                  <div className="text-[9px] text-black/70 italic">
                    Recipient: {item.patientName}
                  </div>
                )}
                {item.lensType && (
                  <div className="text-[9px] text-black/70">
                    Lens: {item.lensType} {item.lensMaterial ? `(${item.lensMaterial})` : ''}
                  </div>
                )}
                {item.fittingNote && (
                  <div className="text-[9px] text-black/70 italic">
                    Note: {item.fittingNote}
                  </div>
                )}
              </td>
              <td className="border border-black py-1.5 px-2 text-center align-top font-mono">
                {item.hsnCode || '9004'}
              </td>
              <td className="border border-black py-1.5 px-2 text-center align-top font-mono">
                {item.quantity}
              </td>
              <td className="border border-black py-1.5 px-2 text-right align-top font-mono">
                ₹{item.netUnitPrice}
              </td>
              <td className="border border-black py-1.5 px-2 text-right align-top font-mono font-semibold">
                ₹{item.taxableValue}
              </td>
              <td className="border border-black py-1.5 px-2 text-right align-top font-mono">
                <div className="text-[8px] text-black/60">{item.cgstRate}%</div>
                <div>₹{item.cgstAmt}</div>
              </td>
              <td className="border border-black py-1.5 px-2 text-right align-top font-mono">
                <div className="text-[8px] text-black/60">{item.sgstRate}%</div>
                <div>₹{item.sgstAmt}</div>
              </td>
              <td className="border border-black py-1.5 px-2 text-right align-top font-mono font-bold">
                ₹{item.lineTotal}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── FINANCIAL TOTALS RECAP ── */}
      <div className="grid grid-cols-2 gap-6 my-4">
        {/* Terms & Conditions */}
        <div className="text-[9px] text-black/80 space-y-1 p-3 border border-black/30 rounded-sm">
          <div className="font-bold uppercase text-black">Terms & Conditions:</div>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>Goods once sold will not be exchanged or refunded.</li>
            <li>Custom edged lenses cannot be cancelled once processed in the laboratory.</li>
            <li>Warranty covers manufacturer defects on frames for 1 year from invoice date.</li>
            <li>Balance amount must be settled in full upon delivery.</li>
          </ol>
        </div>

        {/* Totals Table */}
        <div className="border border-black text-xs">
          <div className="flex justify-between p-1.5 border-b border-black">
            <span>Taxable Amount:</span>
            <span className="font-mono font-semibold">₹{taxableTotal}</span>
          </div>
          <div className="flex justify-between p-1.5 border-b border-black text-[11px]">
            <span>Central Tax (CGST):</span>
            <span className="font-mono">₹{cgstTotal}</span>
          </div>
          <div className="flex justify-between p-1.5 border-b border-black text-[11px]">
            <span>State Tax (SGST):</span>
            <span className="font-mono">₹{sgstTotal}</span>
          </div>
          <div className="flex justify-between p-2 border-b-2 border-black font-bold text-sm bg-black/5">
            <span>Grand Total:</span>
            <span className="font-mono">
              ₹{Number(grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between p-1.5 border-b border-black text-xs">
            <span>Advance Received:</span>
            <span className="font-mono font-semibold">₹{advancePaid}</span>
          </div>
          <div className="flex justify-between p-2 font-black text-sm">
            <span>Balance Due:</span>
            <span className="font-mono">
              ₹{Number(balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* ── SIGNATURE BLOCK ── */}
      <div className="grid grid-cols-2 gap-4 mt-12 pt-4 border-t border-black/30">
        <div className="text-left text-xs">
          <p className="font-bold">Customer Signature</p>
          <p className="text-[10px] text-black/60 mt-1">
            I accept the delivery of glasses in good condition and with correct vision.
          </p>
        </div>
        <div className="text-right text-xs">
          <p className="font-bold">For {storeName}</p>
          <div className="h-12" />
          <p className="text-[10px] uppercase tracking-wider font-semibold border-t border-black inline-block pt-1">
            Authorized Signatory
          </p>
        </div>
      </div>
    </div>
  );
}
