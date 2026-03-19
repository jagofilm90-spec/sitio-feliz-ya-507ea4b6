

## Plan: Full-height table for Productos

### Problem
The table uses `max-h-[calc(100vh-340px)]` which leaves empty space below. Layout's `<main>` uses `p-6` padding and doesn't constrain height properly for flex-grow children.

### Changes

**File 1: `src/components/Layout.tsx`** (line 492)

Change the main content area to allow children to fill full height:
```
// Before:
<main className="flex-1 p-6 overflow-auto">{children}</main>

// After:
<main className="flex-1 overflow-auto">{children}</main>
```
Remove `p-6` from Layout's main — pages that need padding already have their own. This allows Productos to control its own full-height layout.

**File 2: `src/pages/Productos.tsx`**

1. **Line 655** — Change outer wrapper from `space-y-4 sm:space-y-6` to a flex column that fills available height:
```tsx
<div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden p-4 sm:p-6 pb-0 sm:pb-0">
```

2. **Lines 1317-1455** — Make the Tabs section grow to fill remaining space. Change `<Tabs>` wrapper to flex-grow:
```tsx
<Tabs value={tabActivo} ... className="flex-1 flex flex-col min-h-0 overflow-hidden">
```

3. **Line 1323** — Make `TabsContent` fill remaining space:
```tsx
<TabsContent value={tabActivo} className="mt-2 flex-1 min-h-0 overflow-hidden">
```

4. **Lines 1344-1452** — Replace the fixed-height table container:
```tsx
// Before:
<div className="border rounded-lg overflow-hidden">
  <div className="overflow-y-auto max-h-[calc(100vh-340px)]">

// After:
<div className="border rounded-lg overflow-hidden h-full flex flex-col">
  <div className="overflow-y-auto flex-1">
```

5. **Search/filters section** (lines 1261-1315) — Add `flex-shrink-0` to prevent compression.

6. **Tabs list** (line 1318-1321) — Add `flex-shrink-0`.

### Result
- Header, filters, tabs = fixed height (`flex-shrink-0`)
- Table container = fills ALL remaining vertical space (`flex-1 min-h-0`)
- Table body scrolls vertically within that space
- Sticky header stays visible
- No empty space below the table
- No horizontal scroll
- Other pages unaffected (they add their own padding)

### Files
| File | Change |
|------|--------|
| `src/components/Layout.tsx` | Remove `p-6` from main |
| `src/pages/Productos.tsx` | Flex-col full-height layout with growing table |

