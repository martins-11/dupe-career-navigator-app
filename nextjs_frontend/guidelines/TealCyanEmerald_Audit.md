# Teal/Cyan/Emerald Audit (Next.js Frontend)

Goal: remove remaining **teal/cyan/emerald** usage across the frontend theme and UI and use only **purple/dark purple/white/black/grey** equivalents, **without changing layout/structure** and keeping **`/login` visuals unchanged**.

## Status (as of latest pass)
✅ **Completed** — there are **no remaining teal/cyan/emerald Tailwind classes**, **no teal-ish hardcoded hex/RGBA values**, and **no teal/green-named CSS tokens** in the actual frontend source (`src/**`).

The only remaining occurrences of the strings “teal/cyan/emerald” are in this documentation file itself (for historical tracking).

Notes:
- Searches exclude `node_modules`, `.next`, and other build outputs.
- `/login` is intentionally isolated (it uses local hard-coded colors/gradients) and has not been altered.

---

## 1) Tailwind emerald utilities (previously REAL color usage) — RESOLVED

### A) `TargetRoleDetailsPanel` (Mindmap)
**File:** `src/app/components/mindmap/TargetRoleDetailsPanel.tsx`

**Previously:** used `border-emerald-*`, `bg-emerald-*`, `text-emerald-*`.

**Now:** replaced with theme-safe purple/neutral tokens (e.g., `border-primary/20`, `bg-primary/10`, `text-primary`) while preserving layout/structure.

---

## 2) Hard-coded teal-ish RGBA values (previously REAL color usage) — RESOLVED

### A) Selected-node stroke in Mindmap canvas
**File:** `src/app/components/mindmap/MindmapCanvas.tsx`

**Previously:**
```ts
const stroke = isSelected ? 'rgba(13,148,136,0.9)' : 'rgba(0,0,0,0)';
```

**Now:** uses the theme primary RGB:
```ts
const stroke = isSelected ? 'rgba(var(--cn-primary-rgb), 0.9)' : 'rgba(0,0,0,0)';
```

### B) Spinner border color in Mindmap empty/loading state
**File:** `src/app/mindmap/MindmapClient.tsx`

**Previously:**
- `borderColor: 'rgba(31,138,138,0.2)'` (teal-ish)

**Now:** uses theme primary RGB:
- `borderColor: 'rgba(var(--cn-primary-rgb), 0.20)'`

---

## 3) Teal-named CSS variables (previously purple-valued but teal-named) — RESOLVED

### A) Theme token definitions
**File:** `src/styles/theme.css`

**Previously present names included:**
- `--zip-teal`, `--zip-teal-hover`
- `--ring-teal`
- `--mindmap-teal-900`, `--mindmap-teal-700`, `--mindmap-teal-600`

**Now:** renamed to purple/neutral-safe names:
- `--zip-accent`, `--zip-accent-hover`
- `--ring-accent`
- `--mindmap-node-pill-surface`
- `--mindmap-accent-700`, `--mindmap-accent-600`

### B) Call sites updated (previous references removed)
**Previously referenced in:**
- `src/app/components/explore/empty-state.tsx`
- `src/app/components/mindmap/MindmapCanvas.tsx`
- `src/app/mindmap/MindmapClient.tsx`

**Now:** call sites use `--primary` or the new mindmap accent tokens.

---

## 4) “Green” semantic naming for mindmap CTA (previously purple-valued) — RESOLVED

**File:** `src/styles/theme.css`

**Previously:**
- `--mindmap-cta-green`, `--mindmap-cta-green-hover`

**Now:**
- `--mindmap-cta-primary`, `--mindmap-cta-primary-hover`

Call sites updated accordingly.

---

## 5) Verification notes
- No `teal-*`, `cyan-*`, `emerald-*` Tailwind utility usage remains in `src/**`.
- No direct hex hits in `src/**` for common Tailwind teal/cyan/emerald hexes:
  - `#14b8a6` (teal-500)
  - `#06b6d4` (cyan-500)
  - `#10b981` (emerald-500)

---

## 6) Noise to ignore
Some occurrences of the strings “teal” or “cyan” may exist in:
- documentation (like this file),
- bundled build output,
- vendor libs or type definitions

Those are not frontend theme/UI code and should not be modified.
