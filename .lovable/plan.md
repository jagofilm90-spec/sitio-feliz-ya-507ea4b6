

## Plan: Add product count text in Rentabilidad

**Single change** in `src/pages/Rentabilidad.tsx`: After the filter controls `<div>` (around line 195) and before the mobile/table view, add:

```tsx
<p className="text-sm text-muted-foreground mb-4">
  Mostrando{" "}
  <span className={searchTerm ? "text-primary font-medium" : ""}>
    {filteredProductos.length}
  </span>{" "}
  de {productos.length} productos
</p>
```

No other changes needed.

