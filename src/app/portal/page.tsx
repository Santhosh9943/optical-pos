'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Glasses,
  Receipt,
  Eye,
  Calendar,
  Clock,
  Phone,
  Store,
  FileText,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  getCustomerPortalDataAction,
  type CustomerPortalData,
} from '@/actions/customer-portal-actions';

export default function CustomerPortalPage() {
  const [data, setData] = useState<CustomerPortalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getCustomerPortalDataAction();
        setData(res);
      } catch (e) {
        console.error('Failed to load customer portal data:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse" data-testid="customer-portal-loading">
        <div className="h-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  const customer = data?.customer;
  const orders = data?.orders || [];
  const prescriptions = data?.prescriptions || [];

  return (
    <div className="flex flex-col gap-6" data-testid="customer-dashboard-view">
      {/* Patient Welcome Hero */}
      <div className="rounded-2xl border border-blue-100 dark:border-blue-900/60 bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-blue-200">
                Patient Account
              </span>
              <span className="rounded-full bg-blue-500/30 px-2 py-0.5 text-[10px] font-semibold text-white">
                Verified
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1">
              Welcome back, {customer?.fullName || 'Patient'}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 mt-1 flex items-center gap-2">
              <Store className="h-3.5 w-3.5" />
              <span>{data?.practiceName || 'Optix Vision Practice'}</span>
              <span>•</span>
              <Phone className="h-3.5 w-3.5" />
              <span>{customer?.phone}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
            <ShieldCheck className="h-6 w-6 text-emerald-300 shrink-0" />
            <div className="text-xs">
              <div className="font-semibold text-white">HIPAA & Digital Health</div>
              <div className="text-blue-200 text-[10px]">Secure Clinical Portal</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Spectacle & Optical Orders */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex items-center gap-2">
              <Glasses className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-bold text-foreground">Your Spectacle Orders</h2>
            </div>
            <span className="text-xs font-mono font-semibold text-muted-foreground">
              {orders.length} total
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 flex-1">
            {orders.length > 0 ? (
              orders.map((order) => (
                <div key={order.id} className="p-4 flex flex-col gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-foreground">
                      #{order.invoiceNumber}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        order.orderStatus === 'DELIVERED_AND_CLOSED'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : order.orderStatus === 'READY_FOR_COLLECTION'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {order.orderStatus.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="font-semibold text-foreground">
                      ₹{order.grandTotal}
                    </span>
                  </div>

                  {Number(order.balanceDue) > 0 && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                      Balance Due at Collection: ₹{order.balanceDue}
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Store className="h-3 w-3" />
                      {order.branchName}
                    </span>
                    <Link
                      href={`/receipt/${order.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>Digital Tax Invoice</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No orders on file yet. Visit our branch to pair custom prescription eyewear.
              </div>
            )}
          </div>
        </div>

        {/* Optical Prescriptions History */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-foreground">Refraction & Rx History</h2>
            </div>
            <span className="text-xs font-mono font-semibold text-muted-foreground">
              {prescriptions.length} cards
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 flex-1">
            {prescriptions.length > 0 ? (
              prescriptions.map((rx) => (
                <div key={rx.id} className="p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      Exam Date:{' '}
                      {new Date(rx.prescribedAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                      Valid Clinical Rx
                    </span>
                  </div>

                  {/* OD / OS Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-muted-foreground">
                          <th className="py-1 text-left font-sans">Eye</th>
                          <th className="py-1">SPH</th>
                          <th className="py-1">CYL</th>
                          <th className="py-1">AXIS</th>
                          <th className="py-1">ADD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                        <tr>
                          <td className="py-1 text-left font-sans font-bold text-blue-600">OD (Right)</td>
                          <td className="py-1 font-semibold">{rx.odSphere || '0.00'}</td>
                          <td className="py-1">{rx.odCylinder || '0.00'}</td>
                          <td className="py-1">{rx.odAxis ? `${rx.odAxis}°` : '-'}</td>
                          <td className="py-1">{rx.odAdd || '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-left font-sans font-bold text-emerald-600">OS (Left)</td>
                          <td className="py-1 font-semibold">{rx.osSphere || '0.00'}</td>
                          <td className="py-1">{rx.osCylinder || '0.00'}</td>
                          <td className="py-1">{rx.osAxis ? `${rx.osAxis}°` : '-'}</td>
                          <td className="py-1">{rx.osAdd || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No clinical refraction records found. Refraction history will appear here once finalized by your optometrist.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
