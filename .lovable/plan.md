

## Plan: Replace spinner with skeleton layout during role loading

**File**: `src/pages/Dashboard.tsx`

**Changes**:

1. Add `Skeleton` import from `@/components/ui/skeleton` and `Card` from `@/components/ui/card`.

2. Replace the `rolesLoading` block (lines 49-54) with a skeleton layout wrapped in `<Layout>`:

```tsx
if (rolesLoading) {
  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Header skeleton */}
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        {/* KPI cards skeleton - 4 cards matching real grid */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-16" />
            </Card>
          ))}
        </div>
        {/* Large chart skeleton */}
        <Skeleton className="h-[300px] w-full rounded-lg" />
        {/* Two side-by-side cards */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Skeleton className="h-[200px] w-full rounded-lg" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
      </div>
    </Layout>
  );
}
```

3. Add `Card` to imports and `Skeleton` import. Remove `Loader2` if no longer used (it's still used in the almacen/chofer redirect block, so keep it).

