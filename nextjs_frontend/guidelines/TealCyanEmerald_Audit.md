# Teal/Cyan/Emerald Audit (Next.js Frontend)

Goal: remove remaining **teal/cyan/emerald** usage across the frontend theme and UI and use only **purple/dark purple/white/black/grey** equivalents, **without changing layout/structure**.

Notes:
- Searches exclude `node_modules` and `.next`.
- Some “teal” mentions are **variable names** that already resolve to **purple** (e.g., `--zip-teal: var(--cn-primary)`). If the requirement includes eliminating teal-named tokens, those must be renamed and call sites updated.

---

## 1) Actual Tailwind emerald utilities (REAL color usage)

### A) `TargetRoleDetailsPanel` (Mindmap)
**File:** `src/app/components/mindmap/TargetRoleDetailsPanel.tsx`

**Exact lines (from grep):**
- `src/app/components/mindmap/TargetRoleDetailsPanel.tsx:239`
  ```tsx
  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
  ```
- `src/app/components/mindmap/TargetRoleDetailsPanel.tsx:240`
  ```tsx
  <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
  ```

**Suggested replacements (purple/grey equivalents, no layout change):**
- Replace:
  - `border-emerald-100` → `border-primary/20` (or `border-border` if you want neutral)
  - `bg-emerald-50/40` → `bg-primary/10` (or `bg-secondary/40` for neutral grey)
  - `text-emerald-800` → `text-primary` (or `text-foreground` if you want neutral text)

Example:
```tsx
<div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
  <div className="text-[11px] font-bold text-primary uppercase tracking-wide">
```

This keeps spacing, sizes, typography, and structure identical.

---

## 2) Hard-coded teal-ish RGBA values (REAL color usage)

### A) Selected-node stroke in Mindmap canvas
**File:** `src/app/components/mindmap/MindmapCanvas.tsx`

**Exact line (from grep):**
- `src/app/components/mindmap/MindmapCanvas.tsx:701`
  ```ts
  const stroke = isSelected ? 'rgba(13,148,136,0.9)' : 'rgba(0,0,0,0)';
  ```

**Why this matters:** `rgba(13,148,136,0.9)` is a teal-ish value (close to Tailwind teal family).

**Suggested replacement:**
- `rgba(13,148,136,0.9)` → `rgba(var(--cn-primary-rgb), 0.9)`
  - preserves the same opacity behavior while switching to the app’s purple primary.

Example:
```ts
const stroke = isSelected ? 'rgba(var(--cn-primary-rgb), 0.9)' : 'rgba(0,0,0,0)';
```

### B) Spinner border color in Mindmap empty/loading state
**File:** `src/app/mindmap/MindmapClient.tsx`

**Exact line (from grep):**
- `src/app/mindmap/MindmapClient.tsx:583`
  ```tsx
  style={{ borderColor: 'rgba(31,138,138,0.2)', borderTopColor: 'var(--mindmap-teal-700)' }}
  ```

**Why this matters:**
- `rgba(31,138,138,0.2)` is teal-ish.
- `borderTopColor: var(--mindmap-teal-700)` currently resolves to purple via theme tokens (see section 3), so only the `borderColor` is an actual teal color problem.

**Suggested replacement:**
- `rgba(31,138,138,0.2)` → `rgba(var(--cn-primary-rgb), 0.20)` or `rgba(var(--cn-white-rgb), 0.18)` (greyish on dark)

Example:
```tsx
style={{
  borderColor: 'rgba(var(--cn-primary-rgb), 0.20)',
  borderTopColor: 'var(--mindmap-teal-700)',
}}
```

---

## 3) Teal-named CSS variables (may already be purple, but “teal usage” remains in naming)

### A) Theme token definitions
**File:** `src/styles/theme.css`

**Exact lines (from grep):**
- `src/styles/theme.css:103`
  ```css
  --zip-teal: var(--cn-primary);
  ```
- `src/styles/theme.css:104`
  ```css
  --zip-teal-hover: var(--primary-hover);
  ```
- `src/styles/theme.css:121`
  ```css
  --ring-teal: 0 0 0 3px rgba(var(--cn-primary-rgb), 0.35);
  ```
- `src/styles/theme.css:132`
  ```css
  --mindmap-teal-900: #24212F; /* node pills */
  ```
- `src/styles/theme.css:133`
  ```css
  --mindmap-teal-700: var(--cn-primary); /* circles + badges */
  ```
- `src/styles/theme.css:134`
  ```css
  --mindmap-teal-600: rgba(var(--cn-primary-rgb), 0.70); /* connector strokes */
  ```

**Important:** These variables already resolve to purple/neutral colors, but the *names* contain teal.  
If the requirement is strict (“remove teal usage across the theme”), rename them and update call sites.

**Suggested renames (semantic, purple-safe):**
- `--zip-teal` → `--zip-accent` (or remove and use `--primary` directly)
- `--zip-teal-hover` → `--zip-accent-hover` (or use `--primary-hover`)
- `--ring-teal` → `--ring-accent`
- `--mindmap-teal-900` → `--mindmap-surface-pill` (or `--mindmap-node-pill`)
- `--mindmap-teal-700` → `--mindmap-accent-700` (or `--mindmap-primary`)
- `--mindmap-teal-600` → `--mindmap-accent-600`

### B) Call sites that reference teal-named vars
These are the concrete places you must update if you rename/remove teal-named vars:

1) **Explore empty state button background**
- **File:** `src/app/components/explore/empty-state.tsx`
- **Exact line (from grep):** `src/app/components/explore/empty-state.tsx:34`
  ```tsx
  style={{ borderRadius: 12, background: 'var(--zip-teal)', color: 'var(--cn-white)' }}
  ```

  Suggested replacement (no layout change):
  - `background: 'var(--zip-teal)'` → `background: 'var(--primary)'`
  - OR if you rename: `var(--zip-accent)`.

2) **Mindmap connector stroke**
- **File:** `src/app/components/mindmap/MindmapCanvas.tsx`
- **Exact line (from grep):** `src/app/components/mindmap/MindmapCanvas.tsx:660`
  ```ts
  const stroke = isDimmed ? 'rgba(var(--cn-primary-rgb), 0.22)' : 'var(--mindmap-teal-600)';
  ```

3) **Mindmap circles fill**
- **File:** `src/app/components/mindmap/MindmapCanvas.tsx`
- **Exact lines (from grep):**
  - `src/app/components/mindmap/MindmapCanvas.tsx:724`
  - `src/app/components/mindmap/MindmapCanvas.tsx:763`
  ```tsx
  <circle r={r} fill="var(--mindmap-teal-700)" stroke={stroke} strokeWidth={strokeWidth} />
  ```

4) **Mindmap loading spinner top border**
- **File:** `src/app/mindmap/MindmapClient.tsx`
- **Exact line (from grep):** `src/app/mindmap/MindmapClient.tsx:583`
  ```tsx
  borderTopColor: 'var(--mindmap-teal-700)'
  ```

---

## 4) “Green” semantic naming (already purple-valued)
**File:** `src/styles/theme.css`

**Exact lines (from grep):**
- `src/styles/theme.css:137`
  ```css
  --mindmap-cta-green: var(--cn-primary);
  ```
- `src/styles/theme.css:138`
  ```css
  --mindmap-cta-green-hover: var(--primary-hover);
  ```

**Call sites:**
- `src/app/mindmap/MindmapClient.tsx:596`
- `src/app/mindmap/MindmapClient.tsx:661`

If the requirement includes removing green-named tokens, rename similarly:
- `--mindmap-cta-green` → `--mindmap-cta-primary`
- `--mindmap-cta-green-hover` → `--mindmap-cta-primary-hover`

---

## 5) Verified “no hits” (good)
No Tailwind class usage found in `src/**` for:
- `teal-*` utilities (e.g., `bg-teal-...`, `text-teal-...`)
- `cyan-*` utilities (e.g., `bg-cyan-...`, `text-cyan-...`)
No direct hex hits in `src/**` for common Tailwind teal/cyan/emerald hexes:
- `#14b8a6` (teal-500)
- `#06b6d4` (cyan-500)
- `#10b981` (emerald-500)

---

## 6) Noise to ignore
Some occurrences of the strings “teal” or “cyan” may exist in:
- bundled build output, vendor libs, type definitions, or color libraries
These are not frontend theme/UI code and should not be modified.

---

## Minimal change checklist (implementation guidance)
If you want “no teal usage” both visually and semantically:
1) Replace the emerald Tailwind classes in `TargetRoleDetailsPanel.tsx`.
2) Replace the two hard-coded teal-ish rgba colors in `MindmapCanvas.tsx` and `MindmapClient.tsx`.
3) Rename teal-named variables in `theme.css` and update their call sites (`empty-state.tsx`, `MindmapCanvas.tsx`, `MindmapClient.tsx`).
4) Optionally rename green-named CTA vars (`--mindmap-cta-green*`) since they represent purple now.

