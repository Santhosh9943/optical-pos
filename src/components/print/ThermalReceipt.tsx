'use client';

import React, { useMemo } from 'react';
import Decimal from 'decimal.js';
import type { PrintOrderData } from '@/components/pos/print-layouts';

interface ThermalReceiptProps {
  order: PrintOrderData;
}

export function ThermalReceipt({ order }: ThermalReceiptProps) {
  const storeName = order.storeName || 'Santhosh Optical Center';
  const storeGstin = order.storeGstin ? `GSTIN: ${order.storeGstin}` : 'GSTIN: 29AABCS1429B1Z8';
  const storeAddress =
    order.storeAddress || '123 Optical Plaza, MG Road, Bengaluru - 560001';
  const storePhone = order.storePhone ? `Ph: ${order.storePhone}` : 'Ph: +91 98765 43210';

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

  // Tax calculations using decimal.js
  const { subtotal, totalTax, itemsComputed } = useMemo(() => {
    let sub = new Decimal(0);
    let tax = new Decimal(0);

    const items = (order.items || []).map((it) => {
      const price = new Decimal(it.unitPrice || 0);
      const disc = new Decimal(it.discountPerUnit || it.discount || 0);
      const qty = it.quantity || 1;
      const rate = new Decimal(it.taxRate || 18);

      const netUnitPrice = price.minus(disc);
      const netTaxable = netUnitPrice.times(qty);
      const lineTax = netTaxable.times(rate).dividedBy(100);
      const lineTotal = netTaxable.plus(lineTax);

      sub = sub.plus(netTaxable);
      tax = tax.plus(lineTax);

      return {
        ...it,
        unitNet: netUnitPrice.toFixed(2),
        total: lineTotal.toFixed(2),
      };
    });

    return {
      subtotal: sub.toFixed(2),
      totalTax: tax.toFixed(2),
      itemsComputed: items,
    };
  }, [order.items]);

  const grandTotal = new Decimal(order.grandTotal || 0).toFixed(2);
  const advancePaid = new Decimal(order.advancePaid || 0).toFixed(2);
  const balanceDue = new Decimal(order.balanceDue || 0).toFixed(2);

  return (
    <div
      id="thermal-receipt"
      data-testid="print-engine-thermal-receipt"
      className="hidden print:block w-[72mm] max-w-[72mm] font-mono text-[10px] leading-tight text-black bg-white p-2"
    >
      {/* ── STORE HEADER ── */}
      <div className="text-center pb-2 border-b border-dashed border-black">
        <div className="font-bold text-xs uppercase tracking-wider">{storeName}</div>
        <div className="text-[9px] mt-0.5">{storeAddress}</div>
        <div className="text-[9px]">{storePhone}</div>
        <div className="font-bold text-[9px] mt-0.5">{storeGstin}</div>
        <div className="text-[9px] uppercase font-bold mt-1 tracking-widest">
          *** TAX INVOICE ***
        </div>
      </div>

      {/* ── INVOICE & CUSTOMER INFO ── */}
      <div className="py-1.5 text-[9px] border-b border-dashed border-black space-y-0.5">
        <div className="flex justify-between">
          <span>Inv: <span className="font-bold">{order.invoiceNumber}</span></span>
          <span>{orderDate} {orderTime}</span>
        </div>
        <div className="flex justify-between">
          <span>Cust: <span className="font-bold">{order.customer.name}</span></span>
          <span>{order.customer.phone}</span>
        </div>
        {order.customer.gstin && (
          <div>Cust GSTIN: {order.customer.gstin}</div>
        )}
      </div>

      {/* ── ITEMIZED LINE ITEMS ── */}
      <table className="w-full text-left my-1 text-[9px] border-collapse">
        <thead>
          <tr className="border-b border-black">
            <th className="py-0.5 text-left">Item</th>
            <th className="py-0.5 text-center">Qty</th>
            <th className="py-0.5 text-right">Price</th>
            <th className="py-0.5 text-right">Amt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dotted divide-black/40">
          {itemsComputed.map((item, idx) => (
            <tr key={idx}>
              <td className="py-0.5 pr-1 align-top">
                <div className="font-bold line-clamp-2">{item.description}</div>
                {item.patientName && (
                  <div className="text-[8px] italic">For: {item.patientName}</div>
                )}
                {item.hsnCode && (
                  <div className="text-[8px]">HSN: {item.hsnCode} ({item.taxRate}%)</div>
                )}
              </td>
              <td className="py-0.5 text-center align-top">{item.quantity}</td>
              <td className="py-0.5 text-right align-top font-mono">₹{item.unitNet}</td>
              <td className="py-0.5 text-right align-top font-bold font-mono">₹{item.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── TOTALS & TAX BREAKDOWN ── */}
      <div className="pt-1 border-t border-dashed border-black space-y-0.5 text-[9px]">
        <div className="flex justify-between">
          <span>Taxable Subtotal:</span>
          <span className="font-mono">₹{subtotal}</span>
        </div>
        <div className="flex justify-between">
          <span>Total GST (CGST + SGST):</span>
          <span className="font-mono">₹{totalTax}</span>
        </div>
        <div className="flex justify-between text-[11px] font-bold border-t border-black pt-1 mt-1">
          <span>Grand Total:</span>
          <span className="font-mono">₹{grandTotal}</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span>Advance Paid ({order.paymentMode || 'CASH'}):</span>
          <span className="font-mono font-semibold">₹{advancePaid}</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold border-t border-dashed border-black pt-0.5">
          <span>Balance Due:</span>
          <span className="font-mono">₹{balanceDue}</span>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="mt-2 pt-2 border-t border-dashed border-black text-center text-[8px] space-y-0.5">
        <div>Goods once sold will not be exchanged or returned.</div>
        <div>Please bring this receipt when collecting glasses.</div>
        <div className="font-bold tracking-wider mt-1">THANK YOU FOR VISITING!</div>
      </div>
    </div>
  );
}
