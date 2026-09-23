# OptixOS Design System & UI Specifications

OptixOS utilizes a modern, high-density, accessible design system tailored specifically for fast-paced retail optical counters, clinical refraction suites, and multi-branch management.

---

## 1. Visual Aesthetics & Design Foundations

### 1.1 Design Philosophy
- **Rich Aesthetics & Premium Feel:** Dark-mode first aesthetics with subtle micro-animations, clear hierarchical grouping, and state-of-the-art optical workflow visualizations.
- **High Information Density:** Designed for high-speed cashier and optometrist throughput without unnecessary whitespace bloat.
- **Predictable Layout Delegation:** Shared `layout.tsx` manages top navigation and sidebars; child views use clean `flex-1 overflow-auto` containers.

### 1.2 Color Palette & Semantic Tokens
OptixOS uses CSS custom variables compatible with Tailwind CSS:

| Token | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `background` | `hsl(0, 0%, 100%)` | `hsl(222.2, 84%, 4.9%)` | App background |
| `foreground` | `hsl(222.2, 84%, 4.9%)` | `hsl(210, 40%, 98%)` | Primary high-contrast text |
| `card` | `hsl(0, 0%, 100%)` | `hsl(222.2, 84%, 4.9%)` | Cards, panels, modals |
| `muted` | `hsl(210, 40%, 96.1%)` | `hsl(217.2, 32.6%, 17.5%)`| Inactive tabs, disabled backgrounds |
| `muted-foreground`| `hsl(215.4, 16.3%, 46.9%)`| `hsl(215, 20.2%, 65.1%)` | Subtitles, labels, helpers |
| `border` | `hsl(214.3, 31.8%, 91.4%)`| `hsl(217.2, 32.6%, 17.5%)`| Structural dividers, borders |
| `primary` (Blue) | `#2563EB` (`blue-600`) | `#3B82F6` (`blue-500`) | CTAs, active highlights, links |
| `success` (Emerald)| `#059669` (`emerald-600`)| `#10B981` (`emerald-500`)| Completed orders, full payments |
| `warning` (Amber)| `#D97706` (`amber-600`) | `#F59E0B` (`amber-500`) | Balance due, low stock warnings |
| `destructive` (Red)| `#DC2626` (`red-600`) | `#EF4444` (`red-500`) | Delete actions, stock errors |

---

## 2. Spacing Architecture & Fluid Full-Width Layouts

### 2.1 Viewport Spacing Mandate
- **Page Root Wrapper:** Every top-level page root must use EXACTLY:
  ```html
  <div className="flex flex-col h-full w-full p-4 md:p-6 gap-6">
  ```
- **Forbidden Wrapper Classes:** NEVER use `container`, `max-w-7xl`, or `mx-auto` on operational dashboard views. The full width of the screen must be used for sales tables and clinical matrices. Constrained widths are strictly reserved for standalone auth screens or modal dialogs.
- **Card & Component Gaps:** Internal component grids and flex layouts must consistently use `gap-4` or `gap-6`.

### 2.2 Standard Page Header Block
Admin and management pages must share a uniform header structure:
```tsx
<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
  <div>
    <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
      <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      <span>Page Title</span>
    </h1>
    <p className="text-xs text-muted-foreground mt-0.5">
      Concise explanation of the page's capabilities and actions.
    </p>
  </div>
  <div className="flex items-center gap-2">
    {/* Primary Page Action Buttons */}
  </div>
</div>
```

---

## 3. Accessibility & WCAG AA Standards

1. **Color Contrast (4.5:1 Minimum):**
   - In dark mode, strictly avoid `opacity-*` classes on readable text.
   - Never use low-contrast grays like `dark:text-slate-500` for readable text; use `dark:text-slate-300` or `dark:text-zinc-300` minimum.
2. **WCAG 2.5.3 (Label in Name):**
   - If a button or link has visible text, its `aria-label` MUST match or start with the visible text. If the text is descriptive, omit the `aria-label` entirely.
3. **Semantic Interactive Elements:**
   - Always use `<button type="button">`, `<Link>`, or `<input>`. Never attach click handlers to unadorned `<div>` or `<span>` elements.
4. **Focus Rings:**
   - All interactive controls must specify visible focus outlines: `focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500`.

---

## 4. Optical POS Counter Viewport Modes

To prevent cramped viewports when multiple line items or spectacle pairs are billed, OptixOS provides 4 selectable view modes:

### 4.1 Adaptive Split View (Balanced Default)
- **Ratio:** 7-column Patient/Clinical pane : 5-column Cart/Checkout pane.
- **Use Case:** Standard single-pair sales counter workflow.
- **Controls:** Header layout selector with quick pills: `👁️ Rx`, `⚖️ Split`, `🛒 Cart [F4]`.

### 4.2 Adaptive Rx Focus Mode
- **Ratio:** 9–10 column expanded clinical refraction workspace : 2–3 column compact cart drawer.
- **Use Case:** Optometrists performing detailed refraction, visual acuity checks, and PD measurements.

### 4.3 Adaptive Billing Focus Mode
- **Top Bar:** Patient details collapsed into [`CompactPatientStrip`](file:///f:/hobby-projects/optical-pos/src/components/pos/compact-patient-strip.tsx) (single 44px horizontal strip).
- **Workspace Ratio:** 8-column wide Cart table : 4-column dedicated settlement ledger (`Payment & Settlement`).
- **Use Case:** High-volume billing with multiple frames, sunglasses, lenses, and accessories.
- **Hotkey:** Cashiers can toggle between Split View and Billing Focus using **`[F4]`**.

### 4.4 Dense Split View
- **Ratio:** 6-column Patient pane : 6-column Cart pane.
- **Cart Rows:** Ultra-compact 38px rows with patient badge and inline "Edit Details" inspector.
- **Settlement Bar:** Docked sticky bottom dock ([`DenseBottomBar`](file:///f:/hobby-projects/optical-pos/src/components/pos/dense-bottom-bar.tsx)) keeping cart metrics, advance paid input, payment mode buttons (`CASH`, `UPI`, `CARD`), balance due, and `[ Complete Order F10 ]` permanently visible.

---

## 5. Standard Component Specifications

### 5.1 Dual-Box Discount Input
- **Price Box (₹):** Numeric input showing discount in Indian Rupees.
- **Percent Box (%):** Automatically synchronizes percentage based on line subtotal.
- **Bidirectional Sync:** Editing the percentage automatically updates the Rupee box, and editing the Rupee box updates the percentage without rounding drift.

### 5.2 Status Badges
- **Order Status:**
  - `DRAFT`: Gray outline (`bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300`).
  - `ORDERED` / `SENT_TO_LAB`: Blue badge (`bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300`).
  - `IN_FITTING` / `READY_FOR_COLLECTION`: Amber badge (`bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300`).
  - `DELIVERED_AND_CLOSED`: Emerald badge (`bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300`).
  - `CANCELLED_REFUNDED`: Red badge (`bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300`).

### 5.3 Hardware Print Styles
- **Thermal 80mm Roll:** `@media print` with container width strictly locked to `72mm` and zero margins. Never use `page-break-inside: avoid` on line items (it causes premature cutting on receipt printers).
- **A4 Laser Invoice:** Clean two-column header with store credentials, patient billing info, HSN summary, and payment breakdown.
- **Workshop Lab Slip:** Strictly technical job ticket with patient name, frame chassis specs, and full OD/OS dioptric matrix. Financial elements are omitted from the React tree.
