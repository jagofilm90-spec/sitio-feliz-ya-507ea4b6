
# Plan: Actualizar KPIs y UI según el Toggle de Pagadas

## Problema Actual

Cuando activas el switch "Pagadas", las tarjetas KPI siguen mostrando:
- "Total Adeudado" (debería ser "Total Pagado")
- "OCs Pendientes" (debería ser "OCs Pagadas")  
- "Proveedores con Adeudo" (debería ser "Proveedores Pagados")

También el gráfico de pie y los mensajes vacíos siguen usando terminología de "adeudos".

## Solución

Cambiar dinámicamente las etiquetas, íconos y colores de las tarjetas KPI según el estado del toggle `mostrarPagadas`.

## Cambios a Realizar

### Archivo: `src/components/compras/AdeudosProveedoresTab.tsx`

**1. Actualizar cálculo de KPIs (líneas 213-234):**

Agregar cálculo de "total pagado" cuando `mostrarPagadas` está activo:

```typescript
const kpis = useMemo(() => {
  if (mostrarPagadas) {
    // Historial de pagadas
    const totalPagado = adeudosPorProveedor.reduce(
      (sum, p) => sum + p.ordenes.reduce((s, o) => s + (o.monto_pagado || 0), 0),
      0
    );
    const totalOCsPagadas = adeudosPorProveedor.reduce(
      (sum, p) => sum + p.ordenes.length,
      0
    );
    const proveedoresPagados = adeudosPorProveedor.length;

    return {
      total: totalPagado,
      totalOCs: totalOCsPagadas,
      proveedores: proveedoresPagados,
      ocsAnticipadas: 0,
    };
  } else {
    // Adeudos pendientes (actual)
    const totalAdeudado = adeudosPorProveedor.reduce(
      (sum, p) => sum + p.totalAdeudo,
      0
    );
    // ... resto igual
  }
}, [adeudosPorProveedor, mostrarPagadas]);
```

**2. Actualizar las tarjetas KPI (líneas 368-414):**

Cambiar dinámicamente según `mostrarPagadas`:

```typescript
{/* KPI Cards */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">
        {mostrarPagadas ? "Total Pagado" : "Total Adeudado"}
      </CardTitle>
      <DollarSign className={`h-4 w-4 ${mostrarPagadas ? 'text-green-600' : 'text-muted-foreground'}`} />
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${mostrarPagadas ? 'text-green-600' : 'text-destructive'}`}>
        {formatCurrency(kpis.total)}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {mostrarPagadas 
          ? "Suma de todos los pagos realizados"
          : "Suma de todos los adeudos pendientes"}
      </p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">
        {mostrarPagadas ? "OCs Pagadas" : "OCs Pendientes"}
      </CardTitle>
      <FileText className={`h-4 w-4 ${mostrarPagadas ? 'text-green-600' : 'text-muted-foreground'}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{kpis.totalOCs}</div>
      {!mostrarPagadas && kpis.ocsAnticipadas > 0 && (
        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {kpis.ocsAnticipadas} con pago anticipado
        </p>
      )}
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">
        {mostrarPagadas ? "Proveedores Pagados" : "Proveedores con Adeudo"}
      </CardTitle>
      <Building2 className={`h-4 w-4 ${mostrarPagadas ? 'text-green-600' : 'text-muted-foreground'}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{kpis.proveedores}</div>
      <p className="text-xs text-muted-foreground mt-1">
        Proveedores únicos
      </p>
    </CardContent>
  </Card>
</div>
```

**3. Actualizar mensaje de lista vacía (líneas 472-481):**

```typescript
{adeudosPorProveedor.length === 0 ? (
  <Card>
    <CardContent className="py-12 text-center">
      {mostrarPagadas ? (
        <>
          <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">Sin historial de pagos</h3>
          <p className="text-sm text-muted-foreground">
            No hay órdenes de compra pagadas registradas
          </p>
        </>
      ) : (
        <>
          <TrendingDown className="h-12 w-12 mx-auto text-green-500 mb-3" />
          <h3 className="text-lg font-medium">Sin adeudos pendientes</h3>
          <p className="text-sm text-muted-foreground">
            No hay órdenes de compra con pagos pendientes
          </p>
        </>
      )}
    </CardContent>
  </Card>
) : (
  // ... lista de proveedores
)}
```

**4. Actualizar encabezado del proveedor (línea ~505):**

Cambiar "Adeudo:" por "Pagado:" cuando está en modo historial:

```typescript
<span className={`font-semibold ${mostrarPagadas ? 'text-green-600' : 'text-destructive'}`}>
  {mostrarPagadas ? 'Pagado: ' : 'Adeudo: '}
  {formatCurrency(mostrarPagadas 
    ? proveedor.ordenes.reduce((s, o) => s + (o.monto_pagado || 0), 0)
    : proveedor.totalAdeudo
  )}
</span>
```

## Resultado Visual

**Pendientes (toggle OFF):**
```text
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ Total Adeudado │  │ OCs Pendientes │  │ Provs con Adeudo│
│   $234,756.00  │  │      12        │  │       5         │
│   (rojo)       │  │                │  │                 │
└────────────────┘  └────────────────┘  └────────────────┘
```

**Pagadas (toggle ON):**
```text
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Total Pagado  │  │  OCs Pagadas   │  │ Provs Pagados  │
│   $567,890.00  │  │      45        │  │       8         │
│   (verde)      │  │                │  │                 │
└────────────────┘  └────────────────┘  └────────────────┘
```

## Beneficios

- **Contexto correcto** - Las métricas reflejan lo que estás viendo
- **Visual claro** - Colores verdes para pagado, rojos para adeudo
- **Experiencia coherente** - Todo cambia según el modo seleccionado
