

## Plan: Wrap `loadEstadisticas` in try/catch

**Single file edit**: `src/pages/PortalCliente.tsx` (lines 106-164)

Wrap the entire body of `loadEstadisticas` in a `try/catch`. On catch, leave `estadisticas` at defaults (already initialized in state) and show a warning toast: "No se pudieron cargar todas las estadísticas".

```tsx
const loadEstadisticas = async (clienteId: string) => {
  try {
    // ... all existing code unchanged ...
  } catch (error) {
    console.error("Error loading estadísticas:", error);
    toast({
      title: "Advertencia",
      description: "No se pudieron cargar todas las estadísticas",
    });
  }
};
```

No other changes needed — the state already initializes with safe defaults (0s and nulls).

