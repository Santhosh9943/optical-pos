'use client';

import React from 'react';
import { X, Printer, ClipboardList, Download } from 'lucide-react';
import { WorkshopSlip, type PrintOrderData } from '@/components/pos/print-layouts';

interface WorkshopSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PrintOrderData | null;
}

export function WorkshopSlipModal({
  isOpen,
  onClose,
  order,
}: WorkshopSlipModalProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    const className = 'print-mode-workshop';
    document.body.classList.add(className);

    const styleEl = document.createElement('style');
    styleEl.id = 'print-page-style';
    styleEl.innerHTML = '@page { size: A4; margin: 12mm; }';
    document.head.appendChild(styleEl);

    const handleAfterPrint = () => {
      document.body.classList.remove(className);
      const s = document.getElementById('print-page-style');
      if (s) s.remove();
      window.removeEventListener('afterprint', handleAfterPrint);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div
      data-testid="lab-slip-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="flex flex-col w-full max-w-3xl max-h-[90vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/60 no-print">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Optical Workshop Lab Slip
              </h3>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-300">
                Invoice #{order.invoiceNumber} · Patient: {order.customer.name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              data-testid="btn-print-lab-slip"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              data-testid="btn-close-lab-slip"
              onClick={onClose}
              aria-label="Close lab slip modal"
              className="rounded-lg p-1.5 text-slate-400 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950/50">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 max-w-2xl mx-auto">
            <div className="text-black">
              {/* Header with Job Ticket */}
              <div className="border-b-2 border-black pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xl font-black font-mono tracking-tight text-black">
                      JOB #{order.invoiceNumber}
                    </div>
                    <div className="text-xs uppercase tracking-wider font-semibold text-slate-700">
                      OPTICAL WORKSHOP FABRICATION ORDER
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div>
                      <span className="font-bold">Promised:</span>{' '}
                      {order.promisedDeliveryDate
                        ? new Date(order.promisedDeliveryDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </div>
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
                <div className="font-bold text-xs uppercase tracking-wide border-b border-black pb-1">
                  1. Frame Chassis Specification
                </div>
                <div className="mt-2 text-xs space-y-1.5">
                  {order.items.filter((i) => i.category === 'FRAME' || i.category === 'SUNGLASS' || (!i.category && (i.brand || i.model))).length > 0 ? (
                    order.items
                      .filter((i) => i.category === 'FRAME' || i.category === 'SUNGLASS' || (!i.category && (i.brand || i.model)))
                      .map((f, idx) => (
                        <div key={idx} className="p-2 border border-slate-300 rounded bg-slate-50/50">
                          <div className="font-bold text-sm">
                            {f.brand ? `${f.brand} ` : ''}{f.model ? `${f.model} — ` : ''}{f.description}
                          </div>
                          <div className="text-slate-600 text-[11px] mt-0.5 font-mono">
                            SKU: {f.sku || '—'} · Qty: {f.quantity}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="p-2 border border-dashed border-slate-300 rounded text-slate-600 text-xs">
                      Customer&apos;s Own Frame (Fitting Only)
                    </div>
                  )}
                </div>
              </div>

              {/* Refraction Matrix */}
              <div className="mt-4 space-y-3">
                <div className="font-bold text-xs uppercase tracking-wide border-b border-black pb-1">
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
                      <div className="text-xs text-slate-500 italic p-2 border border-dashed border-slate-300 rounded">
                        No prescription attached to this fabrication ticket.
                      </div>
                    );
                  }

                  return rxList.map((rx, idx) => (
                    <div key={idx} className="space-y-1 border border-slate-200 rounded p-2.5 bg-slate-50/30">
                      {rx.patientName && (
                        <div className="text-xs font-bold text-slate-800 flex items-center justify-between pb-1 border-b border-slate-200">
                          <span>Patient: {rx.patientName}</span>
                          {rx.relationType && (
                            <span className="text-[10px] font-normal text-slate-500">
                              Relation: {rx.relationType}
                            </span>
                          )}
                        </div>
                      )}
                      <table className="w-full text-center border-collapse border border-black text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-b border-black font-bold text-[11px]">
                            <th className="border-r border-black py-1 px-1.5 w-14">Eye</th>
                            <th className="border-r border-black py-1 px-1.5">SPH</th>
                            <th className="border-r border-black py-1 px-1.5">CYL</th>
                            <th className="border-r border-black py-1 px-1.5">AXIS</th>
                            <th className="border-r border-black py-1 px-1.5">ADD</th>
                            <th className="py-1 px-1.5">PD (mm)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black font-mono">
                          <tr>
                            <td className="border-r border-black py-1 font-sans font-bold bg-slate-50">OD (Right)</td>
                            <td className="border-r border-black py-1">{rx.odSphere ?? '0.00'}</td>
                            <td className="border-r border-black py-1">{rx.odCylinder ?? '0.00'}</td>
                            <td className="border-r border-black py-1">{rx.odAxis ? `${rx.odAxis}°` : '—'}</td>
                            <td className="border-r border-black py-1">{rx.odAdd ? `+${rx.odAdd}` : '—'}</td>
                            <td className="py-1">{rx.odPd ? `${rx.odPd}` : (rx.binocularPd ? `${rx.binocularPd}` : '—')}</td>
                          </tr>
                          <tr>
                            <td className="border-r border-black py-1 font-sans font-bold bg-slate-50">OS (Left)</td>
                            <td className="border-r border-black py-1">{rx.osSphere ?? '0.00'}</td>
                            <td className="border-r border-black py-1">{rx.osCylinder ?? '0.00'}</td>
                            <td className="border-r border-black py-1">{rx.osAxis ? `${rx.osAxis}°` : '—'}</td>
                            <td className="border-r border-black py-1">{rx.osAdd ? `+${rx.osAdd}` : '—'}</td>
                            <td className="py-1">{rx.osPd ? `${rx.osPd}` : (rx.binocularPd ? `${rx.binocularPd}` : '—')}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ));
                })()}
              </div>

              {/* Lens Specification */}
              <div className="mt-4">
                <div className="font-bold text-xs uppercase tracking-wide border-b border-black pb-1">
                  3. Ophthalmic Lens Finishing & Surfacing
                </div>
                <div className="mt-2 text-xs space-y-1">
                  {order.items.filter((i) => i.category === 'LENS' || i.category === 'OPHTHALMIC_LENS' || i.lensType).length > 0 ? (
                    order.items
                      .filter((i) => i.category === 'LENS' || i.category === 'OPHTHALMIC_LENS' || i.lensType)
                      .map((l, idx) => (
                        <div key={idx} className="p-2 border border-slate-300 rounded bg-slate-50/50">
                          <div className="font-bold">{l.description}</div>
                          <div className="text-slate-600 text-[11px] mt-0.5">
                            Type: <span className="font-semibold">{l.lensType || 'Standard'}</span> · Material: <span className="font-semibold">{l.lensMaterial || 'CR-39'}</span> · Coating: <span className="font-semibold">{l.coating || 'None'}</span>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="p-2 border border-slate-200 rounded text-slate-500 italic text-xs">
                      No custom surfaced lenses on this order.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden strictly formatted print container for @media print */}
        <WorkshopSlip order={order} />
      </div>
    </div>
  );
}
