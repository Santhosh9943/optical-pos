'use client';

import { useState, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import {
  Search,
  Package,
  Plus,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle,
  Glasses,
  Eye,
  Info,
  Layers,
  Sparkles,
  MapPin,
} from 'lucide-react';

export interface InventoryItem {
  id: string;
  sku: string;
  barcode: string | null;
  branchId?: string | null;
  branchName?: string | null;
  category:
    | 'FRAME'
    | 'SUNGLASS'
    | 'OPHTHALMIC_LENS'
    | 'CONTACT_LENS'
    | 'ACCESSORY'
    | 'SERVICE';
  brand: string | null;
  model: string | null;
  description: string | null;
  sellingPrice: string;
  mrp: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  taxRate: string;
  hsnCode: string | null;
  lensType: string | null;
  coating: string | null;
  lensMaterial: string | null;
}

interface InventorySearchProps {
  onAdd: (item: InventoryItem) => void;
  onSelectFrame?: (item: InventoryItem) => void;
  branchId?: string | null;
}

export function InventorySearch({ onAdd, onSelectFrame, branchId }: InventorySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = useDebouncedCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    try {
      const branchParam =
        branchId && branchId !== 'all'
          ? `&branchId=${encodeURIComponent(branchId)}`
          : '';
      const res = await fetch(
        `/api/inventory/search?q=${encodeURIComponent(trimmed)}${branchParam}`
      );
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.items || []);
      setIsOpen(true);
    } catch (err) {
      console.error('[inventory-search] Search failed:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  const handleSelectItem = (item: InventoryItem) => {
    if (item.category === 'FRAME' && onSelectFrame) {
      onSelectFrame(item);
    } else {
      onAdd(item);
    }
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleDirectAdd = (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation();
    onAdd(item);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const categoryLabel = (cat: InventoryItem['category']) => {
    switch (cat) {
      case 'FRAME':
        return 'Frame';
      case 'SUNGLASS':
        return 'Sunglass';
      case 'OPHTHALMIC_LENS':
        return 'Lens';
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

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3 flex items-center text-slate-500 dark:text-slate-300">
          <Search className="h-4 w-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          data-testid="inventory-search-input"
          aria-label="Search inventory items"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Scan barcode or search SKU, brand, model... [F3]"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-9 text-xs font-medium text-slate-900 dark:text-slate-100 shadow-sm transition placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        />
        <div className="absolute right-2.5 flex items-center space-x-1">
          {isSearching && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-blue-400" />
          )}
          {query && !isSearching && (
            <button
              type="button"
              aria-label="Clear inventory search"
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
              }}
              className="rounded p-0.5 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-96 w-full overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
          {results.length > 0 ? (
            <div className="p-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 flex justify-between items-center">
                <span>Matching Items ({results.length})</span>
                <span className="text-slate-500 dark:text-slate-300 font-normal">
                  Press Esc to close
                </span>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {results.map((item) => {
                  const isLowStock = item.stockQuantity <= item.lowStockThreshold;
                  const isOutOfStock = item.stockQuantity <= 0;
                  const isFrame = item.category === 'FRAME';

                  return (
                    <li
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className="group flex cursor-pointer items-center justify-between p-2.5 rounded-md transition hover:bg-blue-50 dark:hover:bg-slate-800/70"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">
                            {item.sku}
                          </span>
                          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            {categoryLabel(item.category)}
                          </span>
                          {item.branchName && (
                            <span
                              data-testid="search-item-branch-badge"
                              className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[10px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[100px]">{item.branchName}</span>
                            </span>
                          )}
                          <span className="rounded bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.2 text-[10px] font-mono text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            GST {item.taxRate}%
                          </span>
                          {isFrame && (
                            <span className="rounded bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.2 text-[9px] font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              Opens Pair Wizard
                            </span>
                          )}
                        </div>

                        <div className="mt-0.5 truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {item.brand ? `${item.brand} ` : ''}
                          {item.model ? `${item.model} — ` : ''}
                          <span className="font-normal text-slate-600 dark:text-slate-300">
                            {item.description}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center space-x-3 text-[11px] text-slate-600 dark:text-slate-300">
                          <span className="flex items-center">
                            {isOutOfStock ? (
                              <span className="flex items-center text-red-600 dark:text-red-400 font-semibold">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Out of stock (0)
                              </span>
                            ) : isLowStock ? (
                              <span className="flex items-center text-amber-600 dark:text-amber-400 font-semibold">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Low stock ({item.stockQuantity})
                              </span>
                            ) : (
                              <span className="flex items-center text-emerald-700 dark:text-emerald-400 font-medium">
                                <CheckCircle className="mr-1 h-3 w-3 text-emerald-500" />
                                In stock: {item.stockQuantity}
                              </span>
                            )}
                          </span>
                          {item.hsnCode && (
                            <span>HSN: {item.hsnCode}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex items-center space-x-2">
                        <div>
                          <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                            ₹{Number(item.sellingPrice).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                          {item.mrp && Number(item.mrp) > Number(item.sellingPrice) && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-300 line-through font-mono">
                              MRP ₹{item.mrp}
                            </div>
                          )}
                        </div>

                        {/* Quick detail view button */}
                        <button
                          type="button"
                          aria-label="View product details"
                          title="View product details"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailItem(item);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Add action */}
                        {isFrame ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              title="Direct add frame only"
                              onClick={(e) => handleDirectAdd(e, item)}
                              className="px-2 py-1 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              + Frame Only
                            </button>
                            <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 text-white shadow-2xs group-hover:bg-blue-700 transition">
                              <Glasses className="h-4 w-4" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 group-hover:bg-blue-600 group-hover:text-white transition">
                            <Plus className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : query.trim().length >= 2 && !isSearching ? (
            <div className="p-4 text-center">
              <Package className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600" />
              <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                No items matching &quot;{query}&quot;
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-300">
                Check SKU or try searching by category/brand.
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Quick Item Detail View Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setDetailItem(null)}
          />
          <div className="relative z-50 w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4 text-xs font-sans text-slate-900 dark:text-slate-100">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                  {detailItem.sku}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {detailItem.brand} {detailItem.model}
                </h4>
                <span className="inline-block rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
                  {categoryLabel(detailItem.category)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-300">
              {detailItem.description || 'No description provided.'}
            </p>

            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block">Selling Price</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  ₹{detailItem.sellingPrice}
                </span>
              </div>
              {detailItem.mrp && (
                <div>
                  <span className="text-[10px] text-slate-400 block">MRP</span>
                  <span className="font-mono text-slate-500 line-through">
                    ₹{detailItem.mrp}
                  </span>
                </div>
              )}
              <div>
                <span className="text-[10px] text-slate-400 block">Stock Level</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {detailItem.stockQuantity} units
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Tax Rate / HSN</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {detailItem.taxRate}% · {detailItem.hsnCode || '—'}
                </span>
              </div>
            </div>

            {/* Optical specifications if available */}
            {(detailItem.lensType || detailItem.coating || detailItem.lensMaterial) && (
              <div className="rounded-lg bg-blue-50/60 dark:bg-blue-950/40 p-2.5 text-[11px] space-y-1 border border-blue-200 dark:border-blue-900 text-blue-950 dark:text-blue-200">
                <div className="font-bold">Optical Specifications:</div>
                {detailItem.lensType && <div>Type: {detailItem.lensType}</div>}
                {detailItem.coating && <div>Coating: {detailItem.coating}</div>}
                {detailItem.lensMaterial && <div>Material: {detailItem.lensMaterial}</div>}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const it = detailItem;
                  setDetailItem(null);
                  handleSelectItem(it);
                }}
                className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
