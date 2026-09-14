'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import Decimal from 'decimal.js';
import {
  Package,
  PlusCircle,
  AlertTriangle,
  Boxes,
  TrendingUp,
  RefreshCw,
  Loader2,
  Trash2,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getInventoryList,
  deleteInventoryItem,
  type InventoryRow,
} from '@/actions/inventory-actions';
import { InventoryTable } from '@/components/admin/inventory-table';
import { AddInventoryForm } from '@/components/admin/add-inventory-form';
import { EditInventoryModal } from '@/components/admin/edit-inventory-modal';
import { useTenantStore } from '@/store/tenant-store';

export interface InventoryViewProps {
  onNavigateToPos?: () => void;
}

export function InventoryView({ onNavigateToPos }: InventoryViewProps) {
  const selectedBranchIds = useTenantStore((s) => s.selectedBranchIds);
  const branches = useTenantStore((s) => s.branches);

  const [items, setItems] = useState<InventoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryRow | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchItems = async (branchIds?: string[]) => {
    try {
      setIsLoading(true);
      const activeIds = branchIds ?? selectedBranchIds;
      const result = await getInventoryList(activeIds);
      if (result.success && result.items) {
        setItems(result.items);
      } else {
        toast.error('Failed to load inventory', {
          description: result.error || 'Could not fetch catalog.',
        });
      }
    } catch (err) {
      console.error('[InventoryView] fetch error:', err);
      toast.error('Connection error', {
        description: 'Failed to connect to inventory service.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(selectedBranchIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchIds]);

  const handleRefresh = () => {
    startTransition(async () => {
      await fetchItems(selectedBranchIds);
      toast.info('Inventory refreshed', { duration: 2000 });
    });
  };

  const handleItemAdded = (newItem: InventoryRow) => {
    setItems((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)]);
  };

  const handleItemUpdated = (updated: InventoryRow) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      setIsDeleting(true);
      const res = await deleteInventoryItem(deletingItem.id);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.id !== deletingItem.id));
        toast.success('Item Removed', {
          description: `${deletingItem.sku} has been removed from the active catalog.`,
        });
        setDeletingItem(null);
      } else {
        toast.error('Failed to delete item', {
          description: res.error || 'Please try again.',
        });
      }
    } catch (err) {
      console.error('[InventoryView] delete error:', err);
      toast.error('Error deleting inventory item');
    } finally {
      setIsDeleting(false);
    }
  };

  // Inventory KPI statistics computed safely via Decimal
  const stats = useMemo(() => {
    let totalStockUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValue = new Decimal(0);

    for (const item of items) {
      const qty = item.stockQuantity || 0;
      totalStockUnits += qty;

      if (qty <= 0) {
        outOfStockCount++;
      } else if (qty <= (item.lowStockThreshold ?? 5)) {
        lowStockCount++;
      }

      const price = new Decimal(item.sellingPrice || '0');
      totalValue = totalValue.plus(price.times(qty));
    }

    return {
      totalSkus: items.length,
      totalStockUnits,
      lowStockCount,
      outOfStockCount,
      totalValuation: totalValue.toFixed(2),
    };
  }, [items]);

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-6 gap-6">
      {/* ── Page Header & Action Controls ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Inventory Management
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-300">
            Manage stock levels, optical frames, sunglasses, lenses, and retail pricing
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              data-testid="inventory-scope-badge"
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
            >
              <Building2 className="h-3 w-3" />
              {selectedBranchIds.includes('all')
                ? `All Branches (${branches.length > 0 ? `${branches.length} Stores` : 'Consolidated'})`
                : selectedBranchIds.length === 1
                  ? branches.find((b) => b.id === selectedBranchIds[0])?.name || 'Single Store'
                  : `${selectedBranchIds.length} Stores Selected`}
            </span>
          </div>
        </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading || isPending}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
              title="Refresh inventory data"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading || isPending ? 'animate-spin text-blue-600' : ''}`}
              />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              data-testid="btn-add-product"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add New Item</span>
            </button>
          </div>
        </div>

        {/* ── KPI Summary Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total SKUs */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-300">
                Total Products
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {stats.totalSkus}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-300">SKUs</span>
            </div>
          </div>

          {/* Total Stock Units */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-300">
                Units in Stock
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Boxes className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {stats.totalStockUnits}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-300">units</span>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-300">
                Low Stock Alerts
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  stats.lowStockCount > 0 || stats.outOfStockCount > 0
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold font-mono ${
                  stats.lowStockCount > 0 || stats.outOfStockCount > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {stats.lowStockCount + stats.outOfStockCount}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-300">
                ({stats.outOfStockCount} empty)
              </span>
            </div>
          </div>

          {/* Total Valuation */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-300">
                Inventory Retail Value
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1 font-mono">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-300">₹</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {Number(stats.totalValuation).toLocaleString('en-IN', {
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* ── Table Section ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Inventory Catalog
            </h2>
            {isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Loading catalog...</span>
              </div>
            )}
          </div>

          {isLoading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Loading inventory items...
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                Connecting to PostgreSQL database
              </p>
            </div>
          ) : (
            <InventoryTable
              items={items}
              onEditItem={(item) => setEditingItem(item)}
              onDeleteItem={(item) => setDeletingItem(item)}
            />
          )}
        </section>

      {/* ── Add Inventory Item Modal ── */}
      <AddInventoryForm
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleItemAdded}
      />

      {/* ── Edit Inventory Item Modal ── */}
      <EditInventoryModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onItemUpdated={handleItemUpdated}
      />

      {/* ── Delete Confirmation Dialog ── */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity"
            onClick={() => !isDeleting && setDeletingItem(null)}
            aria-hidden="true"
          />

          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-inventory-dialog-title"
            className="relative z-50 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 font-sans space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3
                  id="delete-inventory-dialog-title"
                  className="text-base font-bold text-slate-900 dark:text-slate-100"
                >
                  Remove Inventory Item?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {deletingItem.sku} • {deletingItem.brand || ''} {deletingItem.model || ''}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove this item? If it has been previously billed on customer invoices, it will be safely archived without breaking historical records. If it has never been billed, it will be deleted permanently.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-inventory"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryView;
