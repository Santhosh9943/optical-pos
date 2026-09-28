'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Package,
  Glasses,
  Sun,
  Eye,
  Sliders,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getProductTypesAction,
  saveProductTypeAction,
  toggleProductTypeAction,
  deleteProductTypeAction,
  type ProductTypeItem,
  type WorkflowStep,
  type StepOption,
} from '@/actions/product-type-actions';

export function ProductTypesSettings() {
  const [types, setTypes] = useState<ProductTypeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [activeType, setActiveType] = useState<Partial<ProductTypeItem> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadProductTypes = async () => {
    setIsLoading(true);
    try {
      const res = await getProductTypesAction();
      if (res.success && res.data) {
        setTypes(res.data);
      } else {
        toast.error(res.error || 'Failed to load product types');
      }
    } catch {
      toast.error('Error connecting to server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProductTypes();
  }, []);

  const handleToggle = async (item: ProductTypeItem) => {
    const nextState = !item.isEnabled;
    setTypes((prev) =>
      prev.map((t) => (t.id === item.id ? { ...t, isEnabled: nextState } : t))
    );

    const res = await toggleProductTypeAction(item.id, nextState);
    if (!res.success) {
      toast.error(res.error || 'Failed to update status');
      // Revert
      setTypes((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, isEnabled: item.isEnabled } : t))
      );
    } else {
      toast.success(
        `${item.name} is now ${nextState ? 'enabled for POS counter' : 'hidden from POS counter'}`
      );
    }
  };

  const handleOpenEdit = (item?: ProductTypeItem) => {
    if (item) {
      setActiveType(JSON.parse(JSON.stringify(item)));
    } else {
      setActiveType({
        code: '',
        name: '',
        description: '',
        basePrice: '0.00',
        isEnabled: true,
        isSystemDefault: false,
        requiresFrame: false,
        requiresPrescription: false,
        displayOrder: types.length + 1,
        workflowSteps: [],
      });
    }
    setIsEditingModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete custom type "${name}"?`)) {
      return;
    }

    const res = await deleteProductTypeAction(id);
    if (res.success) {
      toast.success(`Deleted product type "${name}"`);
      loadProductTypes();
    } else {
      toast.error(res.error || 'Failed to delete');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeType?.code || !activeType?.name) {
      toast.error('Code and Name are required');
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveProductTypeAction({
        id: activeType.id,
        code: activeType.code,
        name: activeType.name,
        description: activeType.description || null,
        icon: activeType.icon || 'Package',
        basePrice: activeType.basePrice || '0.00',
        isEnabled: activeType.isEnabled ?? true,
        displayOrder: activeType.displayOrder || 0,
        requiresFrame: activeType.requiresFrame ?? false,
        requiresPrescription: activeType.requiresPrescription ?? false,
        workflowSteps: activeType.workflowSteps || [],
      });

      if (res.success) {
        toast.success(`Saved product type "${activeType.name}"!`);
        setIsEditingModalOpen(false);
        setActiveType(null);
        loadProductTypes();
      } else {
        toast.error(res.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to submit form');
    } finally {
      setIsSaving(false);
    }
  };

  // Step Builder Handlers
  const addStep = () => {
    if (!activeType) return;
    const newStep: WorkflowStep = {
      step_name: `Step ${(activeType.workflowSteps?.length || 0) + 1}`,
      input_type: 'single_select',
      options_array: [],
      isRequired: true,
    };
    setActiveType({
      ...activeType,
      workflowSteps: [...(activeType.workflowSteps || []), newStep],
    });
  };

  const removeStep = (index: number) => {
    if (!activeType) return;
    const nextSteps = [...(activeType.workflowSteps || [])];
    nextSteps.splice(index, 1);
    setActiveType({ ...activeType, workflowSteps: nextSteps });
  };

  const updateStep = (index: number, updates: Partial<WorkflowStep>) => {
    if (!activeType) return;
    const nextSteps = [...(activeType.workflowSteps || [])];
    nextSteps[index] = { ...nextSteps[index], ...updates };
    setActiveType({ ...activeType, workflowSteps: nextSteps });
  };

  const addOption = (stepIndex: number) => {
    if (!activeType) return;
    const step = activeType.workflowSteps?.[stepIndex];
    if (!step) return;
    const newOpt: StepOption = {
      label: `Option ${(step.options_array?.length || 0) + 1}`,
      value: `OPT_${(step.options_array?.length || 0) + 1}`,
      surcharge: 0,
    };
    const nextSteps = [...(activeType.workflowSteps || [])];
    nextSteps[stepIndex] = {
      ...step,
      options_array: [...(step.options_array || []), newOpt],
    };
    setActiveType({ ...activeType, workflowSteps: nextSteps });
  };

  const updateOption = (
    stepIndex: number,
    optionIndex: number,
    updates: Partial<StepOption>
  ) => {
    if (!activeType) return;
    const step = activeType.workflowSteps?.[stepIndex];
    if (!step) return;
    const nextOpts = [...step.options_array];
    nextOpts[optionIndex] = { ...nextOpts[optionIndex], ...updates };
    const nextSteps = [...(activeType.workflowSteps || [])];
    nextSteps[stepIndex] = { ...step, options_array: nextOpts };
    setActiveType({ ...activeType, workflowSteps: nextSteps });
  };

  const removeOption = (stepIndex: number, optionIndex: number) => {
    if (!activeType) return;
    const step = activeType.workflowSteps?.[stepIndex];
    if (!step) return;
    const nextOpts = [...step.options_array];
    nextOpts.splice(optionIndex, 1);
    const nextSteps = [...(activeType.workflowSteps || [])];
    nextSteps[stepIndex] = { ...step, options_array: nextOpts };
    setActiveType({ ...activeType, workflowSteps: nextSteps });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div
        data-testid="product-types-settings-card"
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-2xs"
      >
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-foreground">
              Dynamic Product Categorization &amp; POS Flow Builder
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Configure optical product types, enable/disable defaults, and construct sequential multi-step wizard workflows (e.g. Focus Type &rarr; Design &rarr; Index &rarr; Coatings) for sales counter billing.
          </p>
        </div>

        <button
          type="button"
          data-testid="btn-add-product-type"
          onClick={() => handleOpenEdit()}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition active:scale-95 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>+ Create Custom Type</span>
        </button>
      </div>

      {/* Product Types Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Loading configured product types...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map((t) => {
            return (
              <div
                key={t.id}
                className={`relative flex flex-col justify-between rounded-xl border p-4 shadow-2xs transition ${
                  t.isEnabled
                    ? 'border-border bg-card'
                    : 'border-dashed border-border/80 bg-muted/20 opacity-70'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-bold">
                        {t.code === 'LENS' ? (
                          <Layers className="h-4 w-4" />
                        ) : t.code === 'FRAME' ? (
                          <Glasses className="h-4 w-4" />
                        ) : t.code === 'SUNGLASS' ? (
                          <Sun className="h-4 w-4" />
                        ) : (
                          <Package className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-foreground">{t.name}</h3>
                          {t.isSystemDefault && (
                            <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase">
                              Default
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {t.code}
                        </span>
                      </div>
                    </div>

                    {/* Enable/Disable Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggle(t)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        t.isEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      title={t.isEnabled ? 'Enabled in POS' : 'Disabled (Hidden from POS)'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          t.isEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {t.description}
                    </p>
                  )}

                  {/* Flow details pill */}
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
                      Base: ₹{t.basePrice || '0.00'}
                    </span>
                    <span className="rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 font-medium text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {t.workflowSteps?.length || 0} Wizard Steps
                    </span>
                    {t.requiresFrame && (
                      <span className="rounded-md bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 font-medium text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        Frame Pairing
                      </span>
                    )}
                    {t.requiresPrescription && (
                      <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Prescription
                      </span>
                    )}
                  </div>

                  {/* Step previews */}
                  {t.workflowSteps && t.workflowSteps.length > 0 && (
                    <div className="mt-2.5 space-y-1">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                        Workflow Sequence:
                      </div>
                      <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                        {t.workflowSteps.map((s, idx) => (
                          <React.Fragment key={idx}>
                            <span className="font-medium text-foreground">
                              {s.step_name}
                            </span>
                            {idx < t.workflowSteps.length - 1 && (
                              <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/60" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Status: <b className={t.isEnabled ? 'text-emerald-600' : 'text-slate-400'}>
                      {t.isEnabled ? 'Active in POS' : 'Hidden'}
                    </b>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(t)}
                      className="rounded-lg border border-border bg-card hover:bg-muted p-1.5 text-xs text-foreground transition"
                      title="Edit Workflow Steps"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {!t.isSystemDefault && (
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id, t.name)}
                        className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/40 hover:bg-red-100 p-1.5 text-xs text-red-600 dark:text-red-400 transition"
                        title="Delete Custom Type"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit / Flow Builder Modal ── */}
      {isEditingModalOpen && activeType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-foreground">
                  {activeType.id ? `Edit Workflow: ${activeType.name}` : 'New Custom Product Type'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Type Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={activeType.code || ''}
                    disabled={activeType.isSystemDefault}
                    onChange={(e) =>
                      setActiveType({ ...activeType, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. PROGRESSIVE_LENS"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={activeType.name || ''}
                    onChange={(e) => setActiveType({ ...activeType, name: e.target.value })}
                    placeholder="e.g. Progressive Lenses"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Base Price (₹)
                  </label>
                  <input
                    type="text"
                    value={activeType.basePrice || '0.00'}
                    onChange={(e) => setActiveType({ ...activeType, basePrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Description / Billing Subtitle
                </label>
                <input
                  type="text"
                  value={activeType.description || ''}
                  onChange={(e) =>
                    setActiveType({ ...activeType, description: e.target.value })
                  }
                  placeholder="e.g. Spectacle lenses with sequential custom index and coatings"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              {/* Behavior Flags */}
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={activeType.isEnabled ?? true}
                    onChange={(e) =>
                      setActiveType({ ...activeType, isEnabled: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>Enabled in POS Billing</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={activeType.requiresFrame ?? false}
                    onChange={(e) =>
                      setActiveType({ ...activeType, requiresFrame: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>Suggests Frame Pairing (Show pair indication)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={activeType.requiresPrescription ?? false}
                    onChange={(e) =>
                      setActiveType({ ...activeType, requiresPrescription: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>Link Prescription Refraction Power</span>
                </label>
              </div>

              {/* ── Dynamic Steps Generator ── */}
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Sequential Configuration Wizard Steps</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Define the sequential steps the billing agent follows when selecting this product in POS.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addStep}
                    className="flex items-center gap-1 rounded-md bg-blue-600 hover:bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Step</span>
                  </button>
                </div>

                {(!activeType.workflowSteps || activeType.workflowSteps.length === 0) && (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No sequential wizard steps configured. Click &quot;Add Step&quot; to build a custom flow.
                  </div>
                )}

                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {activeType.workflowSteps?.map((step, sIdx) => {
                    return (
                      <div
                        key={sIdx}
                        className="rounded-lg border border-border bg-card p-3 shadow-2xs space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                              {sIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={step.step_name}
                              onChange={(e) =>
                                updateStep(sIdx, { step_name: e.target.value })
                              }
                              placeholder="Step Name (e.g. Focus Type, Coating)"
                              className="font-bold text-xs rounded border border-border bg-background px-2 py-1 text-foreground flex-1 focus:border-blue-600 focus:outline-hidden"
                            />
                            <select
                              value={step.input_type}
                              onChange={(e) =>
                                updateStep(sIdx, {
                                  input_type: e.target.value as any,
                                })
                              }
                              className="text-xs rounded border border-border bg-background px-2 py-1 text-foreground focus:border-blue-600 focus:outline-hidden cursor-pointer"
                            >
                              <option value="single_select">Single Select (Dropdown/Cards)</option>
                              <option value="multi_select">Multi-Select (Checkboxes)</option>
                              <option value="text">Manual Text Input</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeStep(sIdx)}
                            className="rounded p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                            title="Remove Step"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Options Array (if single_select or multi_select) */}
                        {step.input_type !== 'text' && (
                          <div className="pl-7 space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>Selectable Options ({step.options_array?.length || 0})</span>
                              <button
                                type="button"
                                onClick={() => addOption(sIdx)}
                                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-medium"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add Option</span>
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              {step.options_array?.map((opt, oIdx) => (
                                <div
                                  key={oIdx}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <input
                                    type="text"
                                    value={opt.label}
                                    onChange={(e) =>
                                      updateOption(sIdx, oIdx, { label: e.target.value })
                                    }
                                    placeholder="Option Label"
                                    className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-blue-600 focus:outline-hidden"
                                  />
                                  <input
                                    type="text"
                                    value={opt.value}
                                    onChange={(e) =>
                                      updateOption(sIdx, oIdx, { value: e.target.value })
                                    }
                                    placeholder="Value Code"
                                    className="w-28 font-mono rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-blue-600 focus:outline-hidden"
                                  />
                                  <div className="flex items-center gap-1 w-24">
                                    <span className="text-muted-foreground text-[11px]">+₹</span>
                                    <input
                                      type="number"
                                      value={opt.surcharge ?? 0}
                                      onChange={(e) =>
                                        updateOption(sIdx, oIdx, {
                                          surcharge: Number(e.target.value) || 0,
                                        })
                                      }
                                      placeholder="Surcharge"
                                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-blue-600 focus:outline-hidden font-mono"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeOption(sIdx, oIdx)}
                                    className="rounded p-1 text-muted-foreground hover:text-red-600 transition"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Product Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
