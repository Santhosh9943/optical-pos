'use client';

import React, { useState, useMemo, useTransition } from 'react';
import {
  ClipboardList,
  Clock,
  Wrench,
  CheckCircle2,
  PackageCheck,
  Search,
  Filter,
  Kanban,
  List,
  Printer,
  Calendar,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  User,
  Phone,
  Glasses,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  updateOrderStatus,
  type LabOrderSummary,
} from '@/actions/lab-actions';
import type { OrderStatus } from '@/db/schema';
import { WorkshopSlipModal } from './workshop-slip-modal';

interface LabOrdersViewProps {
  initialOrders: LabOrderSummary[];
}

type TabKey = 'ALL' | 'ORDERED' | 'IN_FITTING' | 'READY_FOR_COLLECTION' | 'DELIVERED_AND_CLOSED';

export function LabOrdersView({ initialOrders }: LabOrdersViewProps) {
  const [orders, setOrders] = useState<LabOrderSummary[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<LabOrderSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  // Status mapping to 4 workflow columns
  const orderColumns = useMemo(() => {
    return {
      actionRequired: orders.filter((o) => o.orderStatus === 'ORDERED'),
      atLabFitting: orders.filter(
        (o) => o.orderStatus === 'SENT_TO_LAB' || o.orderStatus === 'IN_FITTING'
      ),
      readyPickup: orders.filter((o) => o.orderStatus === 'READY_FOR_COLLECTION'),
      completed: orders.filter((o) => o.orderStatus === 'DELIVERED_AND_CLOSED'),
    };
  }, [orders]);

  // Filtered orders for table/tabbed view
  const filteredOrders = useMemo(() => {
    let list = orders;

    if (activeTab === 'ORDERED') {
      list = orderColumns.actionRequired;
    } else if (activeTab === 'IN_FITTING') {
      list = orderColumns.atLabFitting;
    } else if (activeTab === 'READY_FOR_COLLECTION') {
      list = orderColumns.readyPickup;
    } else if (activeTab === 'DELIVERED_AND_CLOSED') {
      list = orderColumns.completed;
    }

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase().trim();
    return list.filter((order) => {
      const matchInv = order.invoiceNumber.toLowerCase().includes(query);
      const matchName = order.customerName.toLowerCase().includes(query);
      const matchPhone = order.customerPhone.toLowerCase().includes(query);
      const matchItem = order.items.some(
        (i) =>
          i.description.toLowerCase().includes(query) ||
          (i.sku && i.sku.toLowerCase().includes(query))
      );
      return matchInv || matchName || matchPhone || matchItem;
    });
  }, [orders, activeTab, orderColumns, searchQuery]);

  const handleStatusChange = async (invoiceId: string, newStatus: OrderStatus) => {
    const prevOrders = [...orders];
    // Optimistic UI update
    setOrders((current) =>
      current.map((ord) =>
        ord.id === invoiceId ? { ...ord, orderStatus: newStatus } : ord
      )
    );

    startTransition(async () => {
      try {
        const result = await updateOrderStatus(invoiceId, newStatus);
        if (result.success) {
          const statusLabels: Record<OrderStatus, string> = {
            DRAFT: 'Draft',
            ORDERED: 'Action Required',
            SENT_TO_LAB: 'Sent to Lab',
            IN_FITTING: 'In Fitting',
            READY_FOR_COLLECTION: 'Ready for Collection',
            DELIVERED_AND_CLOSED: 'Delivered & Closed',
            CANCELLED_REFUNDED: 'Cancelled / Refunded',
          };
          toast.success(`Order updated to: ${statusLabels[newStatus]}`, {
            description: `Invoice ${prevOrders.find((o) => o.id === invoiceId)?.invoiceNumber || ''}`,
          });
        }
      } catch (err) {
        setOrders(prevOrders);
        toast.error('Failed to update order status. Please try again.');
      }
    });
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'ORDERED':
        return (
          <span
            data-testid="order-status-badge"
            className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
          >
            <Clock className="h-3 w-3" />
            <span>Action Required</span>
          </span>
        );
      case 'SENT_TO_LAB':
        return (
          <span
            data-testid="order-status-badge"
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
          >
            <Wrench className="h-3 w-3" />
            <span>Sent to Lab</span>
          </span>
        );
      case 'IN_FITTING':
        return (
          <span
            data-testid="order-status-badge"
            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
          >
            <Glasses className="h-3 w-3" />
            <span>In Fitting</span>
          </span>
        );
      case 'READY_FOR_COLLECTION':
        return (
          <span
            data-testid="order-status-badge"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Ready for Pickup</span>
          </span>
        );
      case 'DELIVERED_AND_CLOSED':
        return (
          <span
            data-testid="order-status-badge"
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
          >
            <PackageCheck className="h-3 w-3" />
            <span>Completed</span>
          </span>
        );
      default:
        return (
          <span
            data-testid="order-status-badge"
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
          >
            {status}
          </span>
        );
    }
  };

  const formatPromisedDate = (dateStr: string | null) => {
    if (!dateStr) return { label: 'No Date Promised', isOverdue: false, isToday: false };
    const date = new Date(dateStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const isOverdue = date.getTime() < now.getTime() && !isToday;
    const formatted = date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });

    return {
      label: isToday ? `Today (${formatted})` : formatted,
      isOverdue,
      isToday,
    };
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 p-4 md:p-6 font-sans">
      {/* ── Page Top Header & Metrics Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Lab Order & Workshop Management
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track fabrication, surfacing, lens fitting, and customer pickup in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher & Stats Badge */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 shadow-2xs">
            <button
              type="button"
              data-testid="view-toggle-kanban"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              data-testid="view-toggle-table"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Table List</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Navigation Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 pb-2">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search by invoice #, customer name, phone, or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        {/* Status Tabs for Tabbed Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            data-testid="tab-all"
            onClick={() => setActiveTab('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            All Orders ({orders.length})
          </button>

          <button
            type="button"
            data-testid="tab-ordered"
            onClick={() => setActiveTab('ORDERED')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'ORDERED'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            Action Required ({orderColumns.actionRequired.length})
          </button>

          <button
            type="button"
            data-testid="tab-in-fitting"
            onClick={() => setActiveTab('IN_FITTING')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'IN_FITTING'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
            }`}
          >
            In Fitting ({orderColumns.atLabFitting.length})
          </button>

          <button
            type="button"
            data-testid="tab-ready"
            onClick={() => setActiveTab('READY_FOR_COLLECTION')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'READY_FOR_COLLECTION'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            Ready for Pickup ({orderColumns.readyPickup.length})
          </button>

          <button
            type="button"
            data-testid="tab-completed"
            onClick={() => setActiveTab('DELIVERED_AND_CLOSED')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'DELIVERED_AND_CLOSED'
                ? 'bg-slate-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Completed ({orderColumns.completed.length})
          </button>
        </div>
      </div>

      {/* ── Main Content Area (Kanban or Table) ── */}
      <div className="flex-1 overflow-hidden mt-2">
        {viewMode === 'kanban' ? (
          /* ── Kanban Board View (4 Columns) ── */
          <div className="grid h-full grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto pb-4">
            {/* Column 1: Action Required (ORDERED) */}
            <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/40 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h2 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    1. Action Required
                  </h2>
                </div>
                <span className="rounded-full bg-amber-200/80 dark:bg-amber-900/80 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-200">
                  {orderColumns.actionRequired.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {orderColumns.actionRequired.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    No orders awaiting action
                  </div>
                ) : (
                  orderColumns.actionRequired.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      onViewSlip={setSelectedOrderForSlip}
                      formatPromisedDate={formatPromisedDate}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 2: At Lab / In Fitting (SENT_TO_LAB, IN_FITTING) */}
            <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/70 dark:bg-indigo-950/40 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  <h2 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    2. At Lab / In Fitting
                  </h2>
                </div>
                <span className="rounded-full bg-indigo-200/80 dark:bg-indigo-900/80 px-2 py-0.5 text-[10px] font-bold text-indigo-900 dark:text-indigo-200">
                  {orderColumns.atLabFitting.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {orderColumns.atLabFitting.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    No orders currently in workshop
                  </div>
                ) : (
                  orderColumns.atLabFitting.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      onViewSlip={setSelectedOrderForSlip}
                      formatPromisedDate={formatPromisedDate}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Ready for Pickup (READY_FOR_COLLECTION) */}
            <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/40 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <h2 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    3. Ready for Pickup
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-200/80 dark:bg-emerald-900/80 px-2 py-0.5 text-[10px] font-bold text-emerald-900 dark:text-emerald-200">
                  {orderColumns.readyPickup.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {orderColumns.readyPickup.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    No orders ready for pickup
                  </div>
                ) : (
                  orderColumns.readyPickup.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      onViewSlip={setSelectedOrderForSlip}
                      formatPromisedDate={formatPromisedDate}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 4: Completed (DELIVERED_AND_CLOSED) */}
            <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/40 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    4. Completed (Last 50)
                  </h2>
                </div>
                <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  {orderColumns.completed.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {orderColumns.completed.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    No completed orders
                  </div>
                ) : (
                  orderColumns.completed.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      onViewSlip={setSelectedOrderForSlip}
                      formatPromisedDate={formatPromisedDate}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── Tabbed Table List View ── */
          <div className="h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 sticky top-0 z-10">
                    <th className="py-3 px-4">Invoice / Job #</th>
                    <th className="py-3 px-4">Customer (Payer)</th>
                    <th className="py-3 px-4">Items / Prescription</th>
                    <th className="py-3 px-4">Promised Delivery</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-slate-400 dark:text-slate-500"
                      >
                        No orders match the selected criteria
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const promised = formatPromisedDate(order.promisedDeliveryDate);
                      return (
                        <tr
                          key={order.id}
                          data-testid="order-row"
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition"
                        >
                          {/* Invoice # */}
                          <td className="py-3 px-4 align-top">
                            <div className="font-mono font-bold text-blue-700 dark:text-blue-400">
                              {order.invoiceNumber}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(order.createdAt).toLocaleDateString('en-IN')}
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="py-3 px-4 align-top">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {order.customerName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />
                              <span>{order.customerPhone}</span>
                            </div>
                          </td>

                          {/* Items / Specs */}
                          <td className="py-3 px-4 align-top">
                            <div className="space-y-1">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="text-slate-800 dark:text-slate-200">
                                  <span className="font-semibold">{item.description}</span>
                                  {item.lensType && (
                                    <span className="ml-1 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1 py-0.2 rounded font-mono">
                                      {item.lensType}
                                    </span>
                                  )}
                                  {item.isCustomerOwnFrame && (
                                    <span className="ml-1 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1 py-0.2 rounded">
                                      Own Frame
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Promised Delivery */}
                          <td className="py-3 px-4 align-top">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span
                                className={`font-medium ${
                                  promised.isOverdue
                                    ? 'text-red-600 dark:text-red-400 font-bold'
                                    : promised.isToday
                                    ? 'text-amber-600 dark:text-amber-400 font-bold'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {promised.label}
                              </span>
                            </div>
                            {promised.isOverdue && (
                              <span className="inline-block text-[9px] uppercase tracking-wider font-bold text-red-600 dark:text-red-400 mt-0.5">
                                Overdue
                              </span>
                            )}
                          </td>

                          {/* Status Badge & Dropdown */}
                          <td className="py-3 px-4 text-center align-top">
                            <div className="flex flex-col items-center gap-1.5">
                              {getStatusBadge(order.orderStatus)}

                              <select
                                aria-label="Order Status"
                                data-testid="select-order-status"
                                value={order.orderStatus}
                                onChange={(e) =>
                                  handleStatusChange(order.id, e.target.value as OrderStatus)
                                }
                                className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                              >
                                <option value="ORDERED">Action Required</option>
                                <option value="SENT_TO_LAB">Sent to Lab</option>
                                <option value="IN_FITTING">In Fitting</option>
                                <option value="READY_FOR_COLLECTION">Ready for Pickup</option>
                                <option value="DELIVERED_AND_CLOSED">Completed</option>
                              </select>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right align-top">
                            <div className="flex items-center justify-end gap-1.5">
                              {order.orderStatus !== 'READY_FOR_COLLECTION' &&
                                order.orderStatus !== 'DELIVERED_AND_CLOSED' && (
                                  <button
                                    type="button"
                                    data-testid="btn-mark-ready"
                                    onClick={() =>
                                      handleStatusChange(order.id, 'READY_FOR_COLLECTION')
                                    }
                                    className="rounded bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-[11px] font-bold transition cursor-pointer"
                                  >
                                    Mark Ready
                                  </button>
                                )}

                              <button
                                type="button"
                                data-testid="btn-view-lab-slip"
                                onClick={() => setSelectedOrderForSlip(order)}
                                className="flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-2.5 py-1 text-[11px] font-bold transition cursor-pointer"
                              >
                                <Printer className="h-3 w-3" />
                                <span>Lab Slip</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Workshop Slip Preview & Print Modal ── */}
      <WorkshopSlipModal
        isOpen={!!selectedOrderForSlip}
        onClose={() => setSelectedOrderForSlip(null)}
        order={selectedOrderForSlip?.printOrderData || null}
      />
    </div>
  );
}

interface OrderCardProps {
  order: LabOrderSummary;
  onStatusChange: (id: string, status: OrderStatus) => void;
  onViewSlip: (order: LabOrderSummary) => void;
  formatPromisedDate: (dateStr: string | null) => {
    label: string;
    isOverdue: boolean;
    isToday: boolean;
  };
}

function OrderCard({
  order,
  onStatusChange,
  onViewSlip,
  formatPromisedDate,
}: OrderCardProps) {
  const promised = formatPromisedDate(order.promisedDeliveryDate);

  return (
    <div
      data-testid="order-card"
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-3 shadow-2xs hover:border-blue-400 dark:hover:border-blue-600 transition flex flex-col justify-between gap-2.5"
    >
      {/* Top row: Invoice # and Promised Date */}
      <div>
        <div className="flex items-start justify-between gap-1">
          <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">
            {order.invoiceNumber}
          </span>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
              promised.isOverdue
                ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900'
                : promised.isToday
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {promised.label}
          </span>
        </div>

        {/* Customer / Wearer */}
        <div className="mt-1">
          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
            <User className="h-3 w-3 text-slate-400" />
            <span>{order.customerName}</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 pl-4">
            {order.customerPhone}
          </div>
        </div>

        {/* Items Summary */}
        <div className="mt-2 text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-1.5">
          {order.items.map((item, idx) => (
            <div key={idx} className="line-clamp-1">
              • {item.description}
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
        {/* View Lab Slip Button */}
        <button
          type="button"
          data-testid="btn-view-lab-slip"
          onClick={() => onViewSlip(order)}
          className="flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
        >
          <Printer className="h-3 w-3 text-indigo-500" />
          <span>Slip</span>
        </button>

        {/* Progress Quick Button & Select */}
        <div className="flex items-center gap-1">
          {order.orderStatus === 'ORDERED' && (
            <button
              type="button"
              data-testid="btn-status-sent-lab"
              onClick={() => onStatusChange(order.id, 'IN_FITTING')}
              className="flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 px-2 py-1 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
            >
              <span>Fit</span>
              <ArrowRight className="h-2.5 w-2.5" />
            </button>
          )}

          {order.orderStatus !== 'READY_FOR_COLLECTION' &&
            order.orderStatus !== 'DELIVERED_AND_CLOSED' && (
              <button
                type="button"
                data-testid="btn-mark-ready"
                onClick={() => onStatusChange(order.id, 'READY_FOR_COLLECTION')}
                className="flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 px-2 py-1 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
              >
                <span>Ready</span>
                <Check className="h-2.5 w-2.5" />
              </button>
            )}

          {order.orderStatus === 'READY_FOR_COLLECTION' && (
            <button
              type="button"
              data-testid="btn-mark-delivered"
              onClick={() => onStatusChange(order.id, 'DELIVERED_AND_CLOSED')}
              className="flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 px-2 py-1 text-[10px] font-bold border border-blue-200 dark:border-blue-800 transition cursor-pointer"
            >
              <span>Deliver</span>
              <PackageCheck className="h-2.5 w-2.5" />
            </button>
          )}

          {/* Quick Dropdown Selector */}
          <select
            aria-label="Change Order Status"
            data-testid="select-order-status"
            value={order.orderStatus}
            onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
            className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-1 text-[10px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="ORDERED">Ordered</option>
            <option value="SENT_TO_LAB">At Lab</option>
            <option value="IN_FITTING">In Fitting</option>
            <option value="READY_FOR_COLLECTION">Ready</option>
            <option value="DELIVERED_AND_CLOSED">Completed</option>
          </select>
        </div>
      </div>
    </div>
  );
}
