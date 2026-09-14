'use client';

import React, { useState, useMemo, useTransition } from 'react';
import {
  ClipboardList,
  Clock,
  Wrench,
  CheckCircle2,
  PackageCheck,
  Search,
  Kanban,
  List,
  Printer,
  Calendar,
  ArrowRight,
  User,
  Phone,
  Glasses,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  updateOrderStatus,
  type LabOrderSummary,
} from '@/actions/lab-actions';
import type { OrderStatus } from '@/db/schema';
import { WorkshopSlipModal } from './workshop-slip-modal';
import { SettleBalanceModal, type SettleInvoiceData } from './settle-balance-modal';

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
  const [selectedOrderForSettlement, setSelectedOrderForSettlement] = useState<SettleInvoiceData | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSettleOrder = (order: LabOrderSummary) => {
    setSelectedOrderForSettlement({
      id: order.id,
      invoiceNumber: order.invoiceNumber,
      customerName: order.customerName,
      grandTotal: order.grandTotal,
      advancePaid: order.advancePaid,
      balanceDue: order.balanceDue,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
    });
  };

  const handleBalanceSettled = (result: {
    invoiceId: string;
    newBalance: string;
    isDelivered: boolean;
  }) => {
    if (result.isDelivered) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === result.invoiceId
            ? {
                ...o,
                balanceDue: '0.00',
                paymentStatus: 'PAID',
                orderStatus: 'DELIVERED_AND_CLOSED' as OrderStatus,
              }
            : o
        )
      );
    } else {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === result.invoiceId
            ? {
                ...o,
                balanceDue: result.newBalance,
                paymentStatus: 'PARTIAL',
              }
            : o
        )
      );
    }
  };

  // Filter all orders by search query so both Kanban and Table views reflect search results
  const searchedOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const query = searchQuery.toLowerCase().trim();
    return orders.filter((order) => {
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
  }, [orders, searchQuery]);

  // Status mapping to 4 workflow columns (reflects search query in Kanban columns)
  const orderColumns = useMemo(() => {
    return {
      actionRequired: searchedOrders.filter((o) => o.orderStatus === 'ORDERED'),
      atLabFitting: searchedOrders.filter(
        (o) => o.orderStatus === 'SENT_TO_LAB' || o.orderStatus === 'IN_FITTING'
      ),
      readyPickup: searchedOrders.filter((o) => o.orderStatus === 'READY_FOR_COLLECTION'),
      completed: searchedOrders.filter((o) => o.orderStatus === 'DELIVERED_AND_CLOSED'),
    };
  }, [searchedOrders]);

  // Filtered orders for table/tabbed view
  const filteredOrders = useMemo(() => {
    let list = searchedOrders;

    if (activeTab === 'ORDERED') {
      list = orderColumns.actionRequired;
    } else if (activeTab === 'IN_FITTING') {
      list = orderColumns.atLabFitting;
    } else if (activeTab === 'READY_FOR_COLLECTION') {
      list = orderColumns.readyPickup;
    } else if (activeTab === 'DELIVERED_AND_CLOSED') {
      list = orderColumns.completed;
    }

    return list;
  }, [searchedOrders, activeTab, orderColumns]);

  const handleStatusChange = async (invoiceId: string, newStatus: OrderStatus) => {
    const targetOrder = orders.find((o) => o.id === invoiceId);
    if (
      newStatus === 'DELIVERED_AND_CLOSED' &&
      targetOrder &&
      Number(targetOrder.balanceDue) > 0
    ) {
      handleSettleOrder(targetOrder);
      return;
    }

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
            className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30"
          >
            <Clock className="h-3 w-3" />
            <span>Action Required</span>
          </span>
        );
      case 'SENT_TO_LAB':
        return (
          <span
            data-testid="order-status-badge"
            className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/30"
          >
            <Wrench className="h-3 w-3" />
            <span>Sent to Lab</span>
          </span>
        );
      case 'IN_FITTING':
        return (
          <span
            data-testid="order-status-badge"
            className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
          >
            <Glasses className="h-3 w-3" />
            <span>In Fitting</span>
          </span>
        );
      case 'READY_FOR_COLLECTION':
        return (
          <span
            data-testid="order-status-badge"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Ready for Pickup</span>
          </span>
        );
      case 'DELIVERED_AND_CLOSED':
        return (
          <span
            data-testid="order-status-badge"
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground border border-border"
          >
            <PackageCheck className="h-3 w-3" />
            <span>Completed</span>
          </span>
        );
      default:
        return (
          <span
            data-testid="order-status-badge"
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
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
    <div className="flex flex-col h-full w-full p-4 md:p-6 gap-6">
      {/* ── Page Top Header & Metrics Bar ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                Lab Order & Workshop Management
              </h1>
              <p className="text-xs text-muted-foreground">
                Track fabrication, surfacing, lens fitting, and customer pickup in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* In Kanban View: Center-positioned Search Box */}
        {viewMode === 'kanban' && (
          <div className="relative flex-1 max-w-md w-full sm:mx-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              data-testid="input-lab-orders-search"
              aria-label="Search lab orders by invoice number, customer name, phone, or SKU"
              placeholder="Search by invoice #, customer name, phone, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-card pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex rounded-lg border border-border bg-muted/50 p-0.5 shadow-2xs">
            <button
              type="button"
              data-testid="view-toggle-kanban"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                viewMode === 'kanban'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              data-testid="view-toggle-table"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                viewMode === 'table'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Table List</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Table View Navigation Bar (Search + Status Filter Tabs) ── */}
      {viewMode === 'table' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0">
          {/* Search Input for Table */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              data-testid="input-lab-orders-search"
              aria-label="Search lab orders by invoice number, customer name, phone, or SKU"
              placeholder="Search by invoice #, customer name, phone, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-card pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs for Tabbed Navigation - Only visible in Table List */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              data-testid="tab-all"
              onClick={() => setActiveTab('ALL')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                activeTab === 'ALL'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground'
              }`}
            >
              All Orders ({searchedOrders.length})
            </button>

            <button
              type="button"
              data-testid="tab-ordered"
              onClick={() => setActiveTab('ORDERED')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 ${
                activeTab === 'ORDERED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-card text-amber-600 dark:text-amber-400 border border-border hover:bg-amber-500/10'
              }`}
            >
              Action Required ({orderColumns.actionRequired.length})
            </button>

            <button
              type="button"
              data-testid="tab-in-fitting"
              onClick={() => setActiveTab('IN_FITTING')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                activeTab === 'IN_FITTING'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-card text-indigo-600 dark:text-indigo-400 border border-border hover:bg-indigo-500/10'
              }`}
            >
              In Fitting ({orderColumns.atLabFitting.length})
            </button>

            <button
              type="button"
              data-testid="tab-ready"
              onClick={() => setActiveTab('READY_FOR_COLLECTION')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                activeTab === 'READY_FOR_COLLECTION'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-card text-emerald-600 dark:text-emerald-400 border border-border hover:bg-emerald-500/10'
              }`}
            >
              Ready for Pickup ({orderColumns.readyPickup.length})
            </button>

            <button
              type="button"
              data-testid="tab-completed"
              onClick={() => setActiveTab('DELIVERED_AND_CLOSED')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                activeTab === 'DELIVERED_AND_CLOSED'
                  ? 'bg-slate-600 text-white shadow-xs'
                  : 'bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground'
              }`}
            >
              Completed ({orderColumns.completed.length})
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content Area (Kanban or Table) ── */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'kanban' ? (
          /* ── Kanban Board View (4 Columns) ── */
          <div className="grid h-full grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto pb-4">
            {/* Column 1: Action Required (ORDERED) */}
            <div
              data-testid="kanban-column-action-required"
              className="flex flex-col rounded-xl border border-border bg-card shadow-2xs overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h2 className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    1. Action Required
                  </h2>
                </div>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                  {orderColumns.actionRequired.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/20">
                {orderColumns.actionRequired.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground p-3">
                    {searchQuery ? 'No matching orders' : 'No orders awaiting action'}
                  </div>
                ) : (
                  orderColumns.actionRequired.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      onSettleBalance={handleSettleOrder}
                      onViewSlip={setSelectedOrderForSlip}
                      formatPromisedDate={formatPromisedDate}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 2: At Lab / In Fitting (SENT_TO_LAB, IN_FITTING) */}
            <div
              data-testid="kanban-column-at-lab"
              className="flex flex-col rounded-xl border border-border bg-card shadow-2xs overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-indigo-500/20 bg-indigo-500/10 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  <h2 className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    2. At Lab / In Fitting
                  </h2>
                </div>
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:text-indigo-300">
                  {orderColumns.atLabFitting.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/20">
                {orderColumns.atLabFitting.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground p-3">
                    {searchQuery ? 'No matching orders' : 'No orders currently in workshop'}
                  </div>
                ) : (
                  orderColumns.atLabFitting.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      onSettleBalance={handleSettleOrder}
                      onViewSlip={setSelectedOrderForSlip}
                      formatPromisedDate={formatPromisedDate}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Ready for Pickup (READY_FOR_COLLECTION) */}
            <div
              data-testid="kanban-column-ready-pickup"
              className="flex flex-col rounded-xl border border-border bg-card shadow-2xs overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <h2 className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    3. Ready for Pickup
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                  {orderColumns.readyPickup.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/20">
                {orderColumns.readyPickup.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground p-3">
                    {searchQuery ? 'No matching orders' : 'No orders ready for pickup'}
                  </div>
                ) : (
                  orderColumns.readyPickup.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      onSettleBalance={handleSettleOrder}
                      onViewSlip={setSelectedOrderForSlip}
                      formatPromisedDate={formatPromisedDate}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 4: Completed (DELIVERED_AND_CLOSED) */}
            <div
              data-testid="kanban-column-completed"
              className="flex flex-col rounded-xl border border-border bg-card shadow-2xs overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                  <h2 className="text-xs font-bold text-foreground">
                    4. Completed (Last 50)
                  </h2>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {orderColumns.completed.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/20">
                {orderColumns.completed.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground p-3">
                    {searchQuery ? 'No matching orders' : 'No completed orders'}
                  </div>
                ) : (
                  orderColumns.completed.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      onSettleBalance={handleSettleOrder}
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
          <div className="h-full rounded-xl border border-border bg-card text-card-foreground shadow-2xs overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-border">
                  <tr className="border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4 sticky top-0 z-10 bg-slate-100 dark:bg-slate-900">Invoice / Job #</th>
                    <th className="py-3 px-4 sticky top-0 z-10 bg-slate-100 dark:bg-slate-900">Customer (Payer)</th>
                    <th className="py-3 px-4 sticky top-0 z-10 bg-slate-100 dark:bg-slate-900">Items / Prescription</th>
                    <th className="py-3 px-4 sticky top-0 z-10 bg-slate-100 dark:bg-slate-900">Promised Delivery</th>
                    <th className="py-3 px-4 text-center sticky top-0 z-10 bg-slate-100 dark:bg-slate-900">Status</th>
                    <th className="py-3 px-4 text-right sticky top-0 z-10 bg-slate-100 dark:bg-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-muted-foreground"
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
                          className="hover:bg-muted/40 transition"
                        >
                          {/* Invoice # */}
                          <td className="py-3 px-4 align-top">
                            <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              {order.invoiceNumber}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(order.createdAt).toLocaleDateString('en-IN')}
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="py-3 px-4 align-top">
                            <div className="font-bold text-foreground">
                              {order.customerName}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />
                              <span>{order.customerPhone}</span>
                            </div>
                          </td>

                          {/* Items / Specs */}
                          <td className="py-3 px-4 align-top">
                            <div className="space-y-1">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="text-foreground">
                                  <span className="font-semibold">{item.description}</span>
                                  {item.lensType && (
                                    <span className="ml-1 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1 py-0.2 rounded font-mono border border-indigo-500/20">
                                      {item.lensType}
                                    </span>
                                  )}
                                  {item.isCustomerOwnFrame && (
                                    <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
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
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span
                                className={`font-medium ${
                                  promised.isOverdue
                                    ? 'text-red-600 dark:text-red-400 font-bold'
                                    : promised.isToday
                                    ? 'text-amber-600 dark:text-amber-400 font-bold'
                                    : 'text-foreground'
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
                                className="rounded border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
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
                                    className="rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
                                  >
                                    Mark Ready
                                  </button>
                                )}

                              {order.orderStatus === 'READY_FOR_COLLECTION' && (
                                Number(order.balanceDue) > 0 ? (
                                  <button
                                    type="button"
                                    data-testid="btn-collect-balance"
                                    onClick={() => handleSettleOrder(order)}
                                    className="rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
                                  >
                                    Collect Balance
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    data-testid="btn-mark-delivered"
                                    onClick={() =>
                                      handleStatusChange(order.id, 'DELIVERED_AND_CLOSED')
                                    }
                                    className="rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-2.5 py-1 text-[11px] font-bold transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                                  >
                                    Mark Delivered
                                  </button>
                                )
                              )}

                              <button
                                type="button"
                                data-testid="btn-view-lab-slip"
                                onClick={() => setSelectedOrderForSlip(order)}
                                className="flex items-center gap-1 rounded bg-muted hover:bg-muted/80 text-foreground border border-border px-2.5 py-1 text-[11px] font-bold transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
                              >
                                <Printer className="h-3 w-3 text-indigo-500" />
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

      {/* ── Balance Settlement & Order Delivery Modal ── */}
      <SettleBalanceModal
        isOpen={!!selectedOrderForSettlement}
        onClose={() => setSelectedOrderForSettlement(null)}
        invoice={selectedOrderForSettlement}
        onSuccess={handleBalanceSettled}
      />
    </div>
  );
}

interface OrderCardProps {
  order: LabOrderSummary;
  onStatusChange: (id: string, status: OrderStatus) => void;
  onSettleBalance: (order: LabOrderSummary) => void;
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
  onSettleBalance,
  onViewSlip,
  formatPromisedDate,
}: OrderCardProps) {
  const promised = formatPromisedDate(order.promisedDeliveryDate);

  return (
    <div
      data-testid="order-card"
      className="rounded-lg border border-border bg-card text-card-foreground p-3 shadow-xs hover:border-blue-500/50 dark:hover:border-blue-400/50 transition flex flex-col justify-between gap-2.5"
    >
      {/* Top row: Invoice # and Promised Date */}
      <div>
        <div className="flex items-start justify-between gap-1">
          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
            {order.invoiceNumber}
          </span>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
              promised.isOverdue
                ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                : promised.isToday
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                : 'bg-muted text-muted-foreground border border-border'
            }`}
          >
            {promised.label}
          </span>
        </div>

        {/* Customer / Wearer */}
        <div className="mt-1">
          <div className="text-xs font-bold text-foreground flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            <span>{order.customerName}</span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground pl-4">
            {order.customerPhone}
          </div>
        </div>

        {/* Items Summary */}
        <div className="mt-2 text-[11px] text-muted-foreground space-y-0.5 border-t border-border pt-1.5">
          {order.items.map((item, idx) => (
            <div key={idx} className="line-clamp-1 text-foreground/90">
              • {item.description}
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-border flex items-center justify-between gap-1.5">
        {/* View Lab Slip Button */}
        <button
          type="button"
          data-testid="btn-view-lab-slip"
          onClick={() => onViewSlip(order)}
          className="flex items-center gap-1 rounded border border-border bg-background text-foreground hover:bg-muted px-2 py-1 text-[10px] font-bold transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
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
              className="flex items-center gap-1 rounded bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 px-2 py-1 text-[10px] font-bold border border-indigo-500/30 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                className="flex items-center gap-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 px-2 py-1 text-[10px] font-bold border border-emerald-500/30 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <span>Ready</span>
                <Check className="h-2.5 w-2.5" />
              </button>
            )}

          {order.orderStatus === 'READY_FOR_COLLECTION' && (
            Number(order.balanceDue) > 0 ? (
              <button
                type="button"
                data-testid="btn-collect-balance"
                onClick={() => onSettleBalance(order)}
                className="flex items-center gap-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 px-2 py-1 text-[10px] font-bold border border-amber-500/30 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span>Collect Balance</span>
                <PackageCheck className="h-2.5 w-2.5" />
              </button>
            ) : (
              <button
                type="button"
                data-testid="btn-mark-delivered"
                onClick={() => onStatusChange(order.id, 'DELIVERED_AND_CLOSED')}
                className="flex items-center gap-1 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 px-2 py-1 text-[10px] font-bold border border-blue-500/30 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span>Mark Delivered</span>
                <PackageCheck className="h-2.5 w-2.5" />
              </button>
            )
          )}

          {/* Quick Dropdown Selector */}
          <select
            aria-label="Change Order Status"
            data-testid="select-order-status"
            value={order.orderStatus}
            onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
            className="rounded border border-border bg-background px-1.5 py-1 text-[10px] font-semibold text-foreground focus:outline-hidden cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
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
