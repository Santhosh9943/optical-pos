'use client';

import React, { useMemo } from 'react';
import type { PrintOrderData } from '@/components/pos/print-layouts';

interface WorkshopLabSlipProps {
  order: PrintOrderData;
}

function formatDiopter(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '—';
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return '—';
  const sign = num > 0 ? '+' : num < 0 ? '−' : '';
  return `${sign}${Math.abs(num).toFixed(2)}`;
}

export function WorkshopLabSlip({ order }: WorkshopLabSlipProps) {
  const storeName = order.storeName || 'Santhosh Optical Center';

  const orderDate = useMemo(() => {
    const d = order.createdAt ? new Date(order.createdAt) : new Date();
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [order.createdAt]);

  const deliveryDate = useMemo(() => {
    if (!order.promisedDeliveryDate) return 'URGENT / SAME DAY';
    const d = new Date(order.promisedDeliveryDate);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [order.promisedDeliveryDate]);

  // Aggregate clinical prescriptions
  const allRx = useMemo(() => {
    if (order.prescriptions && order.prescriptions.length > 0) {
      return order.prescriptions;
    }
    if (order.prescription) {
      return [order.prescription];
    }
    return [];
  }, [order.prescriptions, order.prescription]);

  return (
    <div
      id="lab-slip"
      data-testid="print-engine-workshop-slip"
      className="hidden print:block w-full max-w-[210mm] mx-auto p-8 font-sans text-xs text-black bg-white leading-normal"
    >
      {/* ── HEADER TICKET ── */}
      <div className="flex justify-between items-start border-b-4 border-black pb-4">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-black/60">
            OPTICAL LABORATORY FABRICATION TICKET
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-0.5">{storeName}</h1>
          <div className="text-xs font-mono font-bold mt-1">
            Order Date: {orderDate}
          </div>
        </div>

        {/* Job Ticket & Delivery Milestone */}
        <div className="text-right">
          <div className="border-2 border-black p-2.5 rounded-sm bg-black/5 inline-block text-center min-w-[160px]">
            <div className="text-[9px] font-bold uppercase tracking-wider text-black/60">
              JOB TICKET NUMBER
            </div>
            <div className="text-xl font-mono font-black tracking-tight mt-0.5">
              {order.invoiceNumber}
            </div>
          </div>
          <div className="mt-2 text-xs font-bold text-red-700">
            DUE DATE: <span className="underline">{deliveryDate}</span>
          </div>
        </div>
      </div>

      {/* ── PATIENT & CHASSIS CONTEXT (ZERO FINANCIAL DATA) ── */}
      <div className="grid grid-cols-2 gap-4 my-4 p-3 border border-black rounded-sm">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-black/60 block">
            Customer / Wearer Details
          </span>
          <div className="text-sm font-bold text-black mt-0.5">{order.customer.name}</div>
          <div className="text-xs font-mono text-black/80">Phone: {order.customer.phone}</div>
          {order.customer.age && (
            <div className="text-xs text-black/80">
              Age: {order.customer.age} | Gender: {order.customer.gender || '—'}
            </div>
          )}
        </div>

        {/* Barcode / QR Simulation */}
        <div className="flex flex-col items-end justify-center">
          <div className="border-2 border-dashed border-black px-4 py-2 text-center font-mono font-bold tracking-widest text-sm bg-black/5">
            ||| | ||||| | ||| |||| |
          </div>
          <div className="text-[9px] font-mono mt-0.5 text-black/60">
            *{order.invoiceNumber}*
          </div>
        </div>
      </div>

      {/* ── CLINICAL REFRACTION MATRICES (OD / OS) ── */}
      <div className="my-5 space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider border-b-2 border-black pb-1">
          Clinical Refraction Specifications (Glazing Powers)
        </h2>

        {allRx.length === 0 ? (
          <div className="p-4 border border-dashed border-black text-center text-xs text-black/70">
            No dioptric prescription recorded (Plano or Over-the-counter dispense)
          </div>
        ) : (
          allRx.map((rx, idx) => (
            <div key={idx} className="border border-black p-3 space-y-2 rounded-sm">
              <div className="flex justify-between items-center text-xs font-bold border-b border-black/30 pb-1">
                <span>
                  Wearer: {rx.patientName || order.customer.name} ({rx.relationType || 'Primary'})
                </span>
                {rx.binocularPd && (
                  <span className="font-mono text-xs">Binocular PD: {rx.binocularPd} mm</span>
                )}
              </div>

              <table className="w-full border-collapse border border-black text-xs text-center">
                <thead>
                  <tr className="bg-black/10 font-bold border-b border-black">
                    <th className="border border-black py-1 px-2 text-left w-16">Eye</th>
                    <th className="border border-black py-1 px-2">Sphere (SPH)</th>
                    <th className="border border-black py-1 px-2">Cylinder (CYL)</th>
                    <th className="border border-black py-1 px-2">Axis (°)</th>
                    <th className="border border-black py-1 px-2">Addition (ADD)</th>
                    <th className="border border-black py-1 px-2">Mono PD</th>
                  </tr>
                </thead>
                <tbody>
                  {/* OD (Right Eye) */}
                  <tr className="border-b border-black font-mono">
                    <td className="border border-black py-1 px-2 font-bold font-sans text-left bg-black/5">
                      OD (Right)
                    </td>
                    <td className="border border-black py-1 px-2 font-bold">
                      {formatDiopter(rx.odSphere)}
                    </td>
                    <td className="border border-black py-1 px-2">
                      {formatDiopter(rx.odCylinder)}
                    </td>
                    <td className="border border-black py-1 px-2 font-bold">
                      {rx.odAxis ? `${rx.odAxis}°` : '—'}
                    </td>
                    <td className="border border-black py-1 px-2">
                      {formatDiopter(rx.odAdd)}
                    </td>
                    <td className="border border-black py-1 px-2">
                      {rx.odPd ? `${rx.odPd} mm` : '—'}
                    </td>
                  </tr>
                  {/* OS (Left Eye) */}
                  <tr className="font-mono">
                    <td className="border border-black py-1 px-2 font-bold font-sans text-left bg-black/5">
                      OS (Left)
                    </td>
                    <td className="border border-black py-1 px-2 font-bold">
                      {formatDiopter(rx.osSphere)}
                    </td>
                    <td className="border border-black py-1 px-2">
                      {formatDiopter(rx.osCylinder)}
                    </td>
                    <td className="border border-black py-1 px-2 font-bold">
                      {rx.osAxis ? `${rx.osAxis}°` : '—'}
                    </td>
                    <td className="border border-black py-1 px-2">
                      {formatDiopter(rx.osAdd)}
                    </td>
                    <td className="border border-black py-1 px-2">
                      {rx.osPd ? `${rx.osPd} mm` : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {rx.notes && (
                <div className="text-[10px] text-black/80 italic pt-1">
                  Special Notes: {rx.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── FRAME & LENS DISPENSING INSTRUCTIONS (NO FINANCIAL DATA) ── */}
      <div className="my-5">
        <h2 className="text-xs font-black uppercase tracking-wider border-b-2 border-black pb-1 mb-2">
          Fabrication & Edging Work Order
        </h2>

        <table className="w-full border-collapse border border-black text-xs text-left">
          <thead>
            <tr className="bg-black/5 font-bold border-b border-black">
              <th className="border border-black py-1.5 px-2 w-10 text-center">#</th>
              <th className="border border-black py-1.5 px-2">Item / Specification</th>
              <th className="border border-black py-1.5 px-2 w-20 text-center">Type</th>
              <th className="border border-black py-1.5 px-2 w-16 text-center">Qty</th>
              <th className="border border-black py-1.5 px-2">Fitting Instructions</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, idx) => (
              <tr key={idx} className="border-b border-black">
                <td className="border border-black py-1.5 px-2 text-center align-top font-mono">
                  {idx + 1}
                </td>
                <td className="border border-black py-1.5 px-2 align-top">
                  <div className="font-bold">{item.description}</div>
                  {item.sku && (
                    <div className="text-[9px] font-mono text-black/70">SKU: {item.sku}</div>
                  )}
                  {item.isCustomerOwnFrame && (
                    <div className="text-[9px] font-bold text-amber-800">
                      [CUSTOMER&apos;S OWN FRAME — GLAZING ONLY]
                    </div>
                  )}
                </td>
                <td className="border border-black py-1.5 px-2 text-center align-top font-mono text-[10px]">
                  {item.lensType || item.category || 'FRAME'}
                </td>
                <td className="border border-black py-1.5 px-2 text-center align-top font-mono font-bold">
                  {item.quantity}
                </td>
                <td className="border border-black py-1.5 px-2 align-top text-[10px]">
                  {item.lensMaterial && <div>Material: {item.lensMaterial}</div>}
                  {item.coating && <div>Coating: {item.coating}</div>}
                  {item.fittingNote && <div className="italic">Note: {item.fittingNote}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── TECHNICIAN SIGN-OFF ── */}
      <div className="grid grid-cols-3 gap-4 mt-12 pt-4 border-t-2 border-black text-center text-xs">
        <div>
          <div className="h-10" />
          <div className="border-t border-black pt-1 font-bold">Lens Cutter / Edger</div>
        </div>
        <div>
          <div className="h-10" />
          <div className="border-t border-black pt-1 font-bold">Quality Inspector (QC)</div>
        </div>
        <div>
          <div className="h-10" />
          <div className="border-t border-black pt-1 font-bold">Counter Delivery Sign</div>
        </div>
      </div>
    </div>
  );
}
