
# Plan: Panel de Adeudos a Proveedores

## Objetivo
Crear una nueva pestaña en el modulo de Compras que permita visualizar de un vistazo todos los adeudos pendientes con proveedores, con capacidad de filtrado y resumen grafico.

## Estructura Visual Propuesta

```text
+-----------------------------------------------------------------------+
|  ADEUDOS A PROVEEDORES                                                |
+-----------------------------------------------------------------------+
|                                                                       |
|  [KPI Cards - Resumen Global]                                         |
|  +-----------------+  +-----------------+  +-----------------+        |
|  | Total Adeudado  |  | OCs Pendientes  |  | Proveedores     |        |
|  | $2,768,400.00   |  | 3               |  | 2               |        |
|  | -12% vs mes ant |  | 1 anticipado    |  | Con adeudo      |        |
|  +-----------------+  +-----------------+  +-----------------+        |
|                                                                       |
+-----------------------------------------------------------------------+
|                                                                       |
|  [Filtros]                                                            |
|  Proveedor: [Todos]  Status Pago: [Pendiente/Parcial]  Tipo: [Todos] |
|                                                                       |
+-----------------------------------------------------------------------+
|                                                                       |
|  [Resumen por Proveedor - Cards Colapsables]                         |
|  +-----------------------------------------------------------------+ |
|  | SAÑUDO SA DE CV                          Total: $134,400.00     | |
|  | 1 OC pendiente                           [Ver detalle v]        | |
|  +-----------------------------------------------------------------+ |
|  |  Folio       | Status OC   | Status Pago | Total     | Adeudo   | |
|  |  OC-2601-04  | enviada     | pendiente   | $134,400  | $134,400 | |
|  +-----------------------------------------------------------------+ |
|                                                                       |
|  +-----------------------------------------------------------------+ |
|  | PRUEBA JOSAN                             Total: $2,400,000.00   | |
|  | 1 OC pendiente (pago anticipado)         [Ver detalle v]        | |
|  +-----------------------------------------------------------------+ |
|                                                                       |
+-----------------------------------------------------------------------+
|                                                                       |
|  [Grafico - Distribucion de Adeudos]                                 |
|  Pie Chart: Adeudo por proveedor                                     |
|                                                                       |
+-----------------------------------------------------------------------+
```

## Archivos a Crear

| Archivo | Descripcion |
|---------|-------------|
| `src/components/compras/AdeudosProveedoresTab.tsx` | Componente principal del panel |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Compras.tsx` | Agregar nueva pestana "Adeudos" con icono y badge |
| `src/components/secretaria/SecretariaComprasTab.tsx` | Agregar pestana de Adeudos para Secretaria |

## Implementacion Tecnica

### 1. Nuevo Componente: AdeudosProveedoresTab.tsx

**Estructura del componente:**

```typescript
// Query principal para obtener OCs con adeudos pendientes
const { data: ordenesConAdeudo = [] } = useQuery({
  queryKey: ["ordenes-con-adeudo"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("ordenes_compra")
      .select(`
        id, folio, fecha_orden, total, total_ajustado, 
        monto_pagado, status, status_pago, tipo_pago,
        proveedor_id, proveedor_nombre_manual,
        proveedores (id, nombre, telefono, email)
      `)
      .in("status_pago", ["pendiente", "parcial"])
      .order("fecha_orden", { ascending: false });
    if (error) throw error;
    return data;
  },
});
```

**Datos calculados:**

```typescript
// Agrupar por proveedor
const adeudosPorProveedor = useMemo(() => {
  const map = new Map<string, {
    proveedorId: string | null;
    proveedorNombre: string;
    totalAdeudo: number;
    ordenes: OrdenConAdeudo[];
    tieneAnticipado: boolean;
  }>();
  
  ordenesConAdeudo.forEach(oc => {
    const nombre = oc.proveedores?.nombre || oc.proveedor_nombre_manual || "Sin proveedor";
    const adeudo = (oc.total_ajustado || oc.total) - (oc.monto_pagado || 0);
    
    if (!map.has(nombre)) {
      map.set(nombre, {
        proveedorId: oc.proveedor_id,
        proveedorNombre: nombre,
        totalAdeudo: 0,
        ordenes: [],
        tieneAnticipado: false,
      });
    }
    
    const entry = map.get(nombre)!;
    entry.totalAdeudo += adeudo;
    entry.ordenes.push({ ...oc, adeudo });
    if (oc.tipo_pago === 'anticipado') entry.tieneAnticipado = true;
  });
  
  return Array.from(map.values()).sort((a, b) => b.totalAdeudo - a.totalAdeudo);
}, [ordenesConAdeudo]);
```

### 2. Componentes Visuales

**KPI Cards (3 tarjetas):**
- **Total Adeudado**: Suma de todos los adeudos pendientes con formato moneda
- **OCs Pendientes**: Conteo de ordenes con pago pendiente/parcial
- **Proveedores con Adeudo**: Conteo de proveedores unicos

**Filtros:**
- Dropdown de proveedor (todos / especifico)
- Dropdown de status pago (pendiente / parcial / todos)
- Dropdown de tipo pago (contra_entrega / anticipado / todos)

**Cards por Proveedor (Collapsible):**
- Header con nombre proveedor y total adeudado
- Badge si tiene OC con pago anticipado
- Tabla interna con:
  - Folio (clickeable para abrir OC)
  - Fecha
  - Status OC
  - Status Pago (badge con color semantico)
  - Total
  - Pagado
  - **Adeudo** (calculado: total_ajustado - monto_pagado)
  - Boton "Procesar Pago"

**Grafico Pie:**
- Distribucion del adeudo total por proveedor
- Usando Recharts (ya instalado)
- Colores de la paleta existente

### 3. Modificacion de Compras.tsx

```typescript
// Nueva importacion
import AdeudosProveedoresTab from "@/components/compras/AdeudosProveedoresTab";

// Nuevo query para badge de adeudos
const { data: adeudosCount = 0 } = useQuery({
  queryKey: ["adeudos-pendientes-count"],
  queryFn: async () => {
    const { count, error } = await supabase
      .from("ordenes_compra")
      .select("*", { count: "exact", head: true })
      .in("status_pago", ["pendiente", "parcial"]);
    if (error) return 0;
    return count || 0;
  },
  refetchInterval: 60000,
});

// Nueva pestana (insertar entre "Faltantes" y "Analytics")
<TabsTrigger value="adeudos" className="flex items-center gap-2">
  <CreditCard className="h-4 w-4" />
  Adeudos
  {adeudosCount > 0 && (
    <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs font-bold bg-amber-500 text-white">
      {adeudosCount}
    </Badge>
  )}
</TabsTrigger>

<TabsContent value="adeudos">
  <AdeudosProveedoresTab />
</TabsContent>
```

### 4. Integracion con Procesar Pago

El boton "Procesar Pago" en cada fila abrira el `ProcesarPagoOCDialog` existente, pasando la orden seleccionada.

### 5. Indicadores Visuales de Status

| Status Pago | Color Badge | Descripcion |
|-------------|-------------|-------------|
| `pendiente` | Rojo/Destructive | Sin pagos registrados |
| `parcial` | Amarillo/Warning | Pago parcial realizado |
| `pagado` | Verde/Success | Completamente pagado |

| Tipo Pago | Indicador |
|-----------|-----------|
| `anticipado` | Badge especial "Anticipo requerido" |
| `contra_entrega` | Sin indicador especial |

## Flujo de Usuario

1. Usuario accede a Compras > Adeudos
2. Ve resumen global en KPIs
3. Filtra por proveedor/status si lo necesita
4. Expande card de proveedor para ver detalle de OCs
5. Click en "Procesar Pago" abre dialog existente
6. Registra pago con comprobante
7. Panel se actualiza automaticamente (React Query invalidation)

## Casos Edge Cubiertos

- OC sin proveedor catalogado (usa proveedor_nombre_manual)
- OC con pagos parciales (muestra monto restante)
- OC con devoluciones (usa total_ajustado)
- OC con pago anticipado pendiente (badge especial)

## Dependencias Existentes Reutilizadas

- `ProcesarPagoOCDialog` - Para registrar pagos
- `OrdenAccionesDialog` - Para ver detalle de OC
- Recharts - Para grafico pie
- Componentes UI de shadcn (Card, Badge, Collapsible, Table)

## Resultado Final

Panel completo que permite:
1. Ver de un vistazo cuanto se debe a cada proveedor
2. Identificar rapidamente OCs pendientes de pago
3. Distinguir entre pagos anticipados y contra entrega
4. Procesar pagos directamente desde el panel
5. Visualizar distribucion grafica de adeudos
