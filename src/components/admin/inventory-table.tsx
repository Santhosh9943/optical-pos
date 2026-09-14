'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Package,
  XCircle,
  Filter,
} from 'lucide-react';
import type { InventoryRow } from '@/actions/inventory-actions';

interface InventoryTableProps {
  items: InventoryRow[];
}

export function InventoryTable({ items }: InventoryTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case 'FRAME':
        return 'Frame';
      case 'SUNGLASS':
        return 'Sunglass';
      case 'OPHTHALMIC_LENS':
        return 'Ophthalmic Lens';
      case 'CONTACT_LENS':
        return 'Contact Lens';
      case 'ACCESSORY':
        return 'Accessory';
      case 'SERVICE':
        return 'Service';
      default:
        return cat;
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }

      // Low stock only filter
      if (filterLowStockOnly && item.stockQuantity > item.lowStockThreshold) {
        return false;
      }

      // Text search
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      const sku = (item.sku || '').toLowerCase();
      const brand = (item.brand || '').toLowerCase();
      const model = (item.model || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const combined = `${brand} ${model}`.toLowerCase();

      return (
        sku.includes(query) ||
        brand.includes(query) ||
        model.includes(query) ||
        desc.includes(query) ||
        combined.includes(query)
      );
    });
  }, [items, searchQuery, selectedCategory, filterLowStockOnly]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search inventory by SKU, brand, or model"
            placeholder="Search SKU, brand, model..."
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-1.5 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20"
          />
        </div>

        {/* Category & Status Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by inventory category"
              className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-1.5 px-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="ALL">All Categories</option>
              <option value="FRAME">Frames</option>
              <option value="SUNGLASS">Sunglasses</option>
              <option value="OPHTHALMIC_LENS">Lenses</option>
              <option value="CONTACT_LENS">Contact Lenses</option>
              <option value="ACCESSORY">Accessories</option>
              <option value="SERVICE">Services</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            aria-pressed={filterLowStockOnly}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium border transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
              filterLowStockOnly
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-semibold'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span>Low Stock</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Brand</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3 text-center">Stock Qty</th>
                <th className="py-2.5 px-3 text-right">Selling Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <Package className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="mt-2 font-medium text-slate-600 dark:text-slate-300">
                      No inventory items found
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-300">
                      {searchQuery || selectedCategory !== 'ALL' || filterLowStockOnly
                        ? 'Try clearing filters or adjusting your search term.'
                        : 'Click "Add New Item" to populate your inventory.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isOutOfStock = item.stockQuantity <= 0;
                  const isLowStock =
                    !isOutOfStock && item.stockQuantity <= item.lowStockThreshold;

                  // Row highlighting for low / out of stock
                  const rowClass = isOutOfStock
                    ? 'bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/70 dark:hover:bg-red-950/30 text-red-950 dark:text-red-200'
                    : isLowStock
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70 dark:hover:bg-amber-950/30 text-amber-950 dark:text-amber-200'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-slate-900 dark:text-slate-100';

                  return (
                    <tr key={item.id} className={`transition ${rowClass}`}>
                      {/* SKU */}
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                        {item.sku}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                          {categoryLabel(item.category)}
                        </span>
                      </td>

                      {/* Brand */}
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {item.brand || '—'}
                      </td>

                      {/* Model */}
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {item.model || item.description || '—'}
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-2.5 px-3 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/60 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                            <XCircle className="h-3 w-3" />
                            0 (Out of stock)
                          </span>
                        ) : isLowStock ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            title={`Threshold: ${item.lowStockThreshold}`}
                          >
                            <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                            {item.stockQuantity} (Low Stock)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            {item.stockQuantity}
                          </span>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₹
                        {Number(item.sellingPrice).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Count */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-4 py-2 text-xs text-slate-600 dark:text-slate-300">
          <span>
            Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">{filteredItems.length}</strong> of{' '}
            <strong className="font-semibold text-slate-800 dark:text-slate-200">{items.length}</strong> items
          </span>
          {filterLowStockOnly && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Filtered by: Low stock warning
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
