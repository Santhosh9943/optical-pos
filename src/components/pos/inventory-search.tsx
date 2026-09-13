'use client';

import { useState, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Search, Package, Loader2, X, Plus, AlertTriangle, CheckCircle } from 'lucide-react';

export interface InventoryItem {
  id: string;
  sku: string;
  barcode: string | null;
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
}

export function InventorySearch({ onAdd }: InventorySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
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
      const res = await fetch(
        `/api/inventory/search?q=${encodeURIComponent(trimmed)}`
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
  }, 150);

  const handleSelectItem = (item: InventoryItem) => {
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
        <div className="pointer-events-none absolute left-3 flex items-center text-slate-400">
          <Search className="h-4 w-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Scan barcode or search SKU, brand, model... [F3]"
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-xs font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        />
        <div className="absolute right-2.5 flex items-center space-x-1">
          {isSearching && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
          )}
          {query && !isSearching && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
              }}
              className="rounded p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Dropdown Results */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
          {results.length > 0 ? (
            <div className="p-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex justify-between items-center">
                <span>Matching Inventory ({results.length})</span>
                <span className="text-slate-400 font-normal">Click or Enter to add to cart</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {results.map((item) => {
                  const isLowStock = item.stockQuantity <= item.lowStockThreshold;
                  const isOutOfStock = item.stockQuantity <= 0;

                  return (
                    <li
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className="group flex cursor-pointer items-center justify-between p-2.5 rounded-md transition hover:bg-blue-50"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-blue-700">
                            {item.sku}
                          </span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                            {categoryLabel(item.category)}
                          </span>
                          <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-mono text-amber-700 border border-amber-200">
                            GST {item.taxRate}%
                          </span>
                        </div>

                        <div className="mt-0.5 truncate text-xs font-semibold text-slate-900">
                          {item.brand ? `${item.brand} ` : ''}
                          {item.model ? `${item.model} — ` : ''}
                          <span className="font-normal text-slate-600">
                            {item.description}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center space-x-3 text-[11px] text-slate-500">
                          <span className="flex items-center">
                            {isOutOfStock ? (
                              <span className="flex items-center text-red-600 font-semibold">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Out of stock (0)
                              </span>
                            ) : isLowStock ? (
                              <span className="flex items-center text-amber-600 font-semibold">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Low stock ({item.stockQuantity})
                              </span>
                            ) : (
                              <span className="flex items-center text-emerald-700 font-medium">
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
                          <div className="font-mono text-sm font-bold text-slate-900">
                            ₹{Number(item.sellingPrice).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                          {item.mrp && Number(item.mrp) > Number(item.sellingPrice) && (
                            <div className="text-[10px] text-slate-400 line-through font-mono">
                              MRP ₹{item.mrp}
                            </div>
                          )}
                        </div>
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition">
                          <Plus className="h-4 w-4" />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : query.trim() && !isSearching ? (
            <div className="p-4 text-center">
              <Package className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-1 text-xs font-medium text-slate-600">
                No inventory item found matching &quot;{query}&quot;
              </p>
              <p className="text-[11px] text-slate-400">
                Check SKU or try searching by brand name
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
