
# Plan: Entregas Escalonadas con Notificaciones y Pagos Anticipados

## Resumen Ejecutivo

Implementar un flujo mejorado para ordenes de compra que contemple:
1. **Entregas escalonadas** - Programar entregas individualmente (1 de 5 trailers, luego 3 mas, etc.)
2. **Notificaciones completas** - Informar al proveedor de entregas programadas Y pendientes
3. **Dashboard de progreso** - Visibilidad clara del estado de entregas
4. **Pagos anticipados** - Flujo para OCs con pago previo a la entrega

---

## Funcionalidades Actuales vs. Requeridas

| Funcionalidad | Estado Actual | Mejora Requerida |
|---------------|---------------|------------------|
| Crear entregas multiples | Basico | Sin cambios |
| Programar fechas parciales | Funciona | Mejorar notificacion |
| Notificar entregas programadas | Solo lista fechas | Incluir resumen completo |
| Mostrar pendientes al proveedor | No existe | Agregar "Quedan X entregas sin programar" |
| Dashboard de progreso interno | Basico | Panel visual con contadores |
| Pago anticipado | Campo existe | Agregar flujo de validacion |
| Bloquear entregas sin pago | No existe | Implementar |

---

## Flujo Propuesto

```text
                         CREACION DE OC
                              |
                              v
    +--------------------------------------------------+
    |  Paso 1: Seleccionar Proveedor y Tipo de Pago    |
    |  [Pago Anticipado] vs [Pago Contra Entrega]      |
    +--------------------------------------------------+
                              |
                              v
    +--------------------------------------------------+
    |  Paso 2: Agregar Productos (5 trailers ejemplo)  |
    +--------------------------------------------------+
                              |
                              v
    +--------------------------------------------------+
    |  Paso 3: Programar Entregas                      |
    |                                                  |
    |  Trailer 1: [Fecha: 15/Feb]                      |
    |  Trailer 2: [Sin fecha - pendiente]              |
    |  Trailer 3: [Sin fecha - pendiente]              |
    |  Trailer 4: [Sin fecha - pendiente]              |
    |  Trailer 5: [Sin fecha - pendiente]              |
    +--------------------------------------------------+
                              |
                              v
    +--------------------------------------------------+
    |  Paso 4: Resumen y Envio                         |
    |                                                  |
    |  SI PAGO ANTICIPADO:                             |
    |    - Mostrar alerta "Requiere pago antes de      |
    |      programar entregas"                         |
    |    - Crear OC en status "pendiente_pago"         |
    |                                                  |
    |  SI PAGO CONTRA ENTREGA:                         |
    |    - Enviar email al proveedor con:              |
    |      * Trailer 1: 15/Feb (Programada)            |
    |      * Trailers 2-5: Pendientes                  |
    +--------------------------------------------------+
```

---

## Mejora 1: Notificacion Mejorada de Entregas Programadas

### Email al Proveedor (nuevo formato)

```html
Estimado [Proveedor],

Le informamos las fechas programadas para la orden OC-202601-0005:

ENTREGAS PROGRAMADAS:
- Trailer 1: 15 de febrero 2026 (1,200 bultos)
- Trailer 2: 18 de febrero 2026 (1,200 bultos)
- Trailer 3: 20 de febrero 2026 (1,200 bultos)

ENTREGAS PENDIENTES DE PROGRAMAR:
- Trailer 4: 1,200 bultos (fecha por confirmar)
- Trailer 5: 1,200 bultos (fecha por confirmar)

RESUMEN:
- Total entregas: 5
- Programadas: 3
- Pendientes: 2
- Total bultos: 6,000

Le notificaremos cuando se asignen las fechas restantes.
```

### Archivo a Modificar

`src/components/compras/ProgramarEntregasDialog.tsx`

Agregar seccion de "Entregas Pendientes" al email:
- Incluir lista de entregas sin fecha
- Agregar contador resumen
- Mantener coherencia con formato actual

---

## Mejora 2: Nueva Edge Function para Notificaciones Completas

### Crear: `supabase/functions/notificar-entregas-programadas/index.ts`

```typescript
interface RequestBody {
  tipo: 'nuevas_fechas' | 'recordatorio_pendientes';
  orden_id: string;
  orden_folio: string;
  proveedor_email: string;
  proveedor_nombre: string;
  entregas_programadas: {
    numero: number;
    bultos: number;
    fecha: string;
  }[];
  entregas_pendientes: {
    numero: number;
    bultos: number;
  }[];
  total_bultos: number;
}
```

Esta funcion:
1. Genera email HTML con formato profesional
2. Incluye seccion verde de "Programadas"
3. Incluye seccion amarilla de "Pendientes"
4. Agrega resumen con contadores
5. Registra en `correos_enviados`

---

## Mejora 3: Panel de Progreso en Detalle de OC

### Archivo a Modificar

`src/components/compras/OrdenAccionesDialog.tsx`

Agregar componente visual de progreso:

```tsx
// Nuevo componente dentro del dialog
<div className="grid grid-cols-4 gap-3 mb-4">
  <div className="bg-amber-50 p-3 rounded-lg text-center">
    <p className="text-2xl font-bold text-amber-600">{pendientes}</p>
    <p className="text-xs text-amber-700">Pendientes</p>
  </div>
  <div className="bg-blue-50 p-3 rounded-lg text-center">
    <p className="text-2xl font-bold text-blue-600">{programadas}</p>
    <p className="text-xs text-blue-700">Programadas</p>
  </div>
  <div className="bg-orange-50 p-3 rounded-lg text-center">
    <p className="text-2xl font-bold text-orange-600">{enProceso}</p>
    <p className="text-xs text-orange-700">En Descarga</p>
  </div>
  <div className="bg-green-50 p-3 rounded-lg text-center">
    <p className="text-2xl font-bold text-green-600">{recibidas}</p>
    <p className="text-xs text-green-700">Recibidas</p>
  </div>
</div>
```

---

## Mejora 4: Flujo de Pago Anticipado

### Logica de Negocio

1. **Al crear OC con `tipo_pago = 'anticipado'`**:
   - OC se crea con `status = 'pendiente_pago'`
   - NO se envian entregas al calendario de almacen
   - Email al proveedor indica "Pedido recibido, pendiente de pago"

2. **Al registrar pago**:
   - OC cambia a `status = 'pagada'`
   - Se habilita boton "Programar Entregas"
   - Se pueden asignar fechas a las entregas

3. **Al programar primera entrega**:
   - OC cambia a `status = 'enviada'`
   - Entregas aparecen en calendario de almacen
   - Email al proveedor con fechas programadas

### Archivos a Modificar

**`src/components/compras/CrearOrdenCompraWizard.tsx`**
- En paso de resumen, mostrar alerta si es pago anticipado
- Cambiar status inicial a `pendiente_pago` si aplica

**`src/components/compras/ProcesarPagoOCDialog.tsx`**
- Agregar logica para desbloquear programacion de entregas

**`src/components/compras/OrdenAccionesDialog.tsx`**
- Mostrar banner "Pendiente de pago" si aplica
- Deshabilitar "Programar Entregas" hasta pago

---

## Mejora 5: Tabla de OC con Columna de Progreso Entregas

### Archivo a Modificar

`src/components/compras/OrdenesCompraTab.tsx`

Agregar columna visual:

```tsx
<TableCell>
  <div className="flex items-center gap-2">
    <div className="text-xs">
      {recibidas}/{total}
    </div>
    <Progress 
      value={(recibidas/total)*100} 
      className="w-16 h-2"
    />
  </div>
</TableCell>
```

---

## Esquema de Base de Datos

### Campo nuevo sugerido (opcional)

```sql
-- Agregar status_pago 'parcial' ya existente
-- status_pago: 'pendiente', 'pagado', 'parcial'

-- Ya existe tipo_pago: 'anticipado', 'contra_entrega'

-- Agregar flag para bloquear entregas sin pago
ALTER TABLE ordenes_compra
ADD COLUMN IF NOT EXISTS entregas_bloqueadas BOOLEAN DEFAULT false;
```

---

## Archivos a Crear/Modificar

| Archivo | Accion | Descripcion |
|---------|--------|-------------|
| `supabase/functions/notificar-entregas-programadas/index.ts` | Crear | Nueva edge function para emails completos |
| `src/components/compras/ProgramarEntregasDialog.tsx` | Modificar | Mejorar email y agregar pendientes |
| `src/components/compras/OrdenAccionesDialog.tsx` | Modificar | Agregar panel de progreso visual |
| `src/components/compras/OrdenesCompraTab.tsx` | Modificar | Agregar columna de progreso |
| `src/components/compras/CrearOrdenCompraWizard.tsx` | Modificar | Logica de pago anticipado |
| `supabase/config.toml` | Modificar | Registrar nueva edge function |

---

## Seccion Tecnica: Codigo Clave

### ProgramarEntregasDialog - Email Mejorado

```typescript
// Construir HTML con pendientes
const entregasNuevas = fechasParaActualizar.map(([entregaId, fecha]) => {
  const entrega = entregas.find((e: any) => e.id === entregaId);
  return {
    numero: entrega?.numero_entrega,
    bultos: entrega?.cantidad_bultos,
    fecha: formatFechaLocal(fecha)
  };
});

const entregasSinFecha = entregas.filter((e: any) => 
  !e.fecha_programada && !fechasActualizadas[e.id]
);

const htmlBody = `
  <h2>Fechas de entrega actualizadas - ${orden.folio}</h2>
  
  <h3 style="color: green;">✅ Entregas Programadas</h3>
  <ul>
    ${entregasNuevas.map(e => 
      `<li>Trailer ${e.numero}: ${e.bultos} bultos - ${e.fecha}</li>`
    ).join("")}
  </ul>
  
  ${entregasSinFecha.length > 0 ? `
    <h3 style="color: orange;">⏳ Entregas Pendientes de Programar</h3>
    <ul>
      ${entregasSinFecha.map((e: any) => 
        `<li>Trailer ${e.numero_entrega}: ${e.cantidad_bultos} bultos</li>`
      ).join("")}
    </ul>
    <p><em>Le notificaremos cuando se asignen las fechas.</em></p>
  ` : ''}
  
  <p><strong>Resumen:</strong> ${entregas.length} entregas totales</p>
`;
```

### OrdenAccionesDialog - Panel de Progreso

```typescript
// Ya existe query entregasResumen, solo falta UI mejorada
{orden?.entregas_multiples && entregasResumen && (
  <div className="grid grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg">
    <div className="text-center">
      <div className="text-lg font-bold text-amber-600">
        {entregasResumen.pendientes}
      </div>
      <div className="text-xs text-muted-foreground">Sin fecha</div>
    </div>
    // ... otros contadores
  </div>
)}
```

---

## Resultado Esperado

1. **Proveedor recibe emails claros** con entregas programadas Y pendientes
2. **Almacen ve dashboard** con contadores de estado por OC
3. **Secretaria puede programar escalonado** (1 trailer hoy, 3 la proxima semana)
4. **Pago anticipado bloquea entregas** hasta confirmar deposito
5. **Historial completo** de notificaciones por cada OC

---

## Orden de Implementacion

1. Modificar `ProgramarEntregasDialog.tsx` (email mejorado)
2. Modificar `OrdenAccionesDialog.tsx` (panel progreso)
3. Crear edge function `notificar-entregas-programadas`
4. Modificar `CrearOrdenCompraWizard.tsx` (flujo pago anticipado)
5. Modificar `OrdenesCompraTab.tsx` (columna progreso)
6. Pruebas de integracion completas
