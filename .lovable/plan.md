

# Plan: Toggle de Historial en Adeudos + Fusionar Devoluciones/Faltantes

## Resumen

Dos mejoras para simplificar la navegación del módulo de Compras:

1. **Toggle en Adeudos** - Agregar un switch para ver OCs pendientes vs pagadas (historial)
2. **Fusionar Devoluciones/Faltantes** - Combinar ambas pestañas en una sola con filtro interno

## Resultado Visual

```text
ANTES (8 pestañas):
┌─────────┬────┬─────┬──────────────┬──────────┬──────────┬─────────┬──────────┐
│ Provs   │ OC │ Cal │ Devoluciones │ Historial│ Faltantes│ Adeudos │ Analytics│
└─────────┴────┴─────┴──────────────┴──────────┴──────────┴─────────┴──────────┘

DESPUÉS (7 pestañas):
┌─────────┬────┬─────┬───────────────────────┬──────────┬─────────┬──────────┐
│ Provs   │ OC │ Cal │ Devoluciones/Faltantes│ Historial│ Adeudos │ Analytics│
└─────────┴────┴─────┴───────────────────────┴──────────┴─────────┴──────────┘
```

## Parte 1: Toggle en Adeudos para ver Pagadas

### Cambio en `src/components/compras/AdeudosProveedoresTab.tsx`

**Agregar estado para toggle:**
```typescript
const [mostrarPagadas, setMostrarPagadas] = useState(false);
```

**Modificar query para incluir OCs pagadas cuando toggle esté activo:**
```typescript
// Cambiar de:
.in("status_pago", ["pendiente", "parcial"])

// A:
.in("status_pago", mostrarPagadas 
  ? ["pagado"] 
  : ["pendiente", "parcial"])
```

**Agregar Switch en el header:**
```typescript
<div className="flex items-center gap-2">
  <Switch 
    checked={mostrarPagadas} 
    onCheckedChange={setMostrarPagadas} 
  />
  <Label className="text-sm">
    {mostrarPagadas ? "Historial pagadas" : "Pendientes"}
  </Label>
</div>
```

**Ajustar UI cuando muestra pagadas:**
- Cambiar título a "Historial de Pagos a Proveedores"
- Ocultar botón "Pagar" (ya están pagadas)
- Mostrar badge verde "Pagado" en lugar de rojo

## Parte 2: Fusionar Devoluciones y Faltantes

### Crear nuevo componente combinado

**Nuevo archivo: `src/components/compras/DevolucionesFaltantesTab.tsx`**

Combinar ambos componentes con un ToggleGroup interno:

```typescript
export const DevolucionesFaltantesTab = () => {
  const [vista, setVista] = useState<"devoluciones" | "faltantes">("devoluciones");
  
  return (
    <div className="space-y-4">
      {/* Toggle interno */}
      <ToggleGroup type="single" value={vista} onValueChange={setVista}>
        <ToggleGroupItem value="devoluciones">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Devoluciones {devCount > 0 && <Badge>{devCount}</Badge>}
        </ToggleGroupItem>
        <ToggleGroupItem value="faltantes">
          <PackageX className="h-4 w-4 mr-2" />
          Faltantes {faltCount > 0 && <Badge>{faltCount}</Badge>}
        </ToggleGroupItem>
      </ToggleGroup>
      
      {/* Contenido condicional */}
      {vista === "devoluciones" ? (
        <DevolucionesPendientesTab />
      ) : (
        <FaltantesPendientesTab />
      )}
    </div>
  );
};
```

### Actualizar `src/pages/Compras.tsx`

**Cambios:**
1. Eliminar pestañas separadas de "Devoluciones" y "Faltantes"
2. Agregar nueva pestaña "Devoluciones / Faltantes" 
3. Combinar los contadores de badges

```typescript
// Nueva pestaña combinada
<TabsTrigger value="devoluciones-faltantes">
  <AlertTriangle className="h-4 w-4" />
  <span className="hidden sm:inline">Devoluciones / Faltantes</span>
  <span className="sm:hidden">Dev/Falt</span>
  {(devolucionesPendientesCount + faltantesPendientesCount) > 0 && (
    <Badge variant="destructive">
      {devolucionesPendientesCount + faltantesPendientesCount}
    </Badge>
  )}
</TabsTrigger>

<TabsContent value="devoluciones-faltantes">
  <DevolucionesFaltantesTab />
</TabsContent>
```

## Archivos a Modificar/Crear

| Archivo | Acción | Cambios |
|---------|--------|---------|
| `src/components/compras/AdeudosProveedoresTab.tsx` | Modificar | Agregar toggle pagadas/pendientes |
| `src/components/compras/DevolucionesFaltantesTab.tsx` | **Crear** | Nuevo componente que combina ambos |
| `src/pages/Compras.tsx` | Modificar | Fusionar pestañas, actualizar imports |
| `src/components/secretaria/SecretariaComprasTab.tsx` | Modificar | Agregar pestaña combinada (si aplica) |

## Detalles Técnicos

### Toggle de Adeudos

El switch cambiará el filtro del query:
- **OFF (default)**: `status_pago IN ('pendiente', 'parcial')` - Adeudos actuales
- **ON**: `status_pago = 'pagado'` - Historial de pagadas

La query key incluirá el toggle para refetch correcto:
```typescript
queryKey: ["ordenes-con-adeudo", mostrarPagadas],
```

### Pestaña Combinada

El ToggleGroup interno permite cambiar entre vistas sin recargar la página:
- Los componentes originales `DevolucionesPendientesTab` y `FaltantesPendientesTab` se mantienen intactos
- Solo se renderizan condicionalmente según la selección
- Los contadores de badges se suman en la pestaña principal pero se muestran separados en el toggle interno

## Beneficios

- **1 pestaña menos** - De 8 a 7 pestañas principales
- **Historial de pagos accesible** - Sin buscar en OCs generales  
- **Contexto relacionado junto** - Devoluciones y faltantes están conceptualmente relacionados
- **UI más limpia** - Menos scroll horizontal en tablets

