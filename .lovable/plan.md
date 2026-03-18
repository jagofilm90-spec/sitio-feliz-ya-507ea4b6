

## Plan: Wrap 18 routes with ProtectedRoute

In `src/App.tsx`, wrap each of the specified 18 routes with `<ProtectedRoute>` using the same pattern already used for `/dashboard` and `/secretaria`. Each route gets its `allowedRoles` array and `redirectTo="/auth"`.

**Single file change:** `src/App.tsx`

Replace each bare `<Route path="/X" element={<Component />} />` with:
```tsx
<Route path="/X" element={
  <ProtectedRoute allowedRoles={[...roles]} redirectTo="/auth">
    <Component />
  </ProtectedRoute>
} />
```

Routes and their roles:
1. `/productos` → `['admin', 'secretaria', 'vendedor', 'contadora']`
2. `/clientes` → `['admin', 'secretaria', 'vendedor']`
3. `/pedidos` → `['admin', 'secretaria', 'vendedor']`
4. `/inventario` → `['admin', 'secretaria', 'gerente_almacen', 'almacen']`
5. `/facturas` → `['admin', 'secretaria', 'contadora']`
6. `/compras` → `['admin', 'secretaria', 'contadora']`
7. `/empleados` → `['admin']`
8. `/usuarios` → `['admin']`
9. `/rentabilidad` → `['admin', 'contadora']`
10. `/rutas` → `['admin', 'secretaria']`
11. `/precios` → `['admin', 'secretaria', 'vendedor']`
12. `/chat` → `['admin', 'secretaria', 'vendedor', 'contadora']`
13. `/fumigaciones` → `['admin', 'gerente_almacen']`
14. `/respaldos` → `['admin']`
15. `/permisos` → `['admin']`
16. `/almacen-tablet` → `['admin', 'almacen', 'gerente_almacen']`
17. `/chofer` → `['admin', 'chofer']`
18. `/vendedor` → `['admin', 'vendedor']`

No new imports needed — `ProtectedRoute` is already imported.

