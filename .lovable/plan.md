

# Plan: Corregir Estado Incorrecto de OC con Faltantes

## Problema Identificado

La OC `OC-202601-0002` (Envolvían) tiene status `COMPLETADA` pero tiene:
- 1 entrega recibida
- 1 entrega pendiente (de faltante programada para el siguiente día)
- Flag `origen_faltante = true` en la entrega pendiente

**Causa raíz**: El Edge Function `auto-reschedule-deliveries` (líneas 129-136) verifica si existe "alguna entrega recibida" y si es así, marca la OC como `completada` sin verificar si hay entregas pendientes de faltantes.

```text
┌──────────────────────────────────────────────────────────────────────┐
│  FLUJO ACTUAL (INCORRECTO)                                           │
├──────────────────────────────────────────────────────────────────────┤
│  1. Recepción con faltante                                           │
│     └─> OC marcada como "parcial" ✓                                  │
│  2. Se crea entrega de faltante para día siguiente ✓                 │
│  3. Edge Function auto-reschedule ejecuta (al día siguiente)         │
│     └─> Detecta que hay 1 entrega recibida                          │
│     └─> Ignora entregas pendientes de faltante                      │
│     └─> Marca OC como "completada" ✗                                 │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Solucion

### 1. Corregir Edge Function `auto-reschedule-deliveries`

Modificar la logica para verificar si hay entregas pendientes ANTES de marcar como completada.

**Archivo**: `supabase/functions/auto-reschedule-deliveries/index.ts`

**Cambio en lineas 119-137**:

**Antes**:
```typescript
// Verificar si la orden tiene una entrega ya recibida
const { data: entregaRecibida } = await supabase
  .from('ordenes_compra_entregas')
  .select('id')
  .eq('orden_compra_id', order.id)
  .eq('status', 'recibida')
  .limit(1)
  .maybeSingle()

// Si ya hay entrega recibida, actualizar status de la orden y NO reprogramar
if (entregaRecibida) {
  console.log(`Order ${order.folio} already has received delivery, marking as completed`)
  await supabase
    .from('ordenes_compra')
    .update({ status: 'completada' })
    .eq('id', order.id)
  continue
}
```

**Despues**:
```typescript
// Verificar si la orden tiene entregas pendientes (programadas)
const { data: entregasPendientes, count: countPendientes } = await supabase
  .from('ordenes_compra_entregas')
  .select('id', { count: 'exact', head: true })
  .eq('orden_compra_id', order.id)
  .in('status', ['programada', 'en_transito'])

// Si hay entregas pendientes, NO marcar como completada
// Solo reprogramar las que tienen fecha vencida
if (countPendientes && countPendientes > 0) {
  // Esta orden tiene entregas pendientes, verificar si necesita reprogramacion
  const { data: entregaVencida } = await supabase
    .from('ordenes_compra_entregas')
    .select('id')
    .eq('orden_compra_id', order.id)
    .eq('status', 'programada')
    .lt('fecha_programada', todayStr)
    .limit(1)
    .maybeSingle()

  if (entregaVencida) {
    // Reprogramar (mantener logica existente pero sin marcar como completada)
    // ... logica de reprogramacion
  }
  
  // Asegurar que el status sea 'parcial' si hay entregas recibidas Y pendientes
  const { data: entregaRecibida } = await supabase
    .from('ordenes_compra_entregas')
    .select('id')
    .eq('orden_compra_id', order.id)
    .eq('status', 'recibida')
    .limit(1)
    .maybeSingle()

  if (entregaRecibida) {
    await supabase
      .from('ordenes_compra')
      .update({ status: 'parcial' })
      .eq('id', order.id)
  }
  continue
}

// Solo si NO hay entregas pendientes y SI hay recibidas, marcar como completada
const { data: entregaRecibida } = await supabase
  .from('ordenes_compra_entregas')
  .select('id')
  .eq('orden_compra_id', order.id)
  .eq('status', 'recibida')
  .limit(1)
  .maybeSingle()

if (entregaRecibida) {
  console.log(`Order ${order.folio} has all deliveries received, marking as completed`)
  await supabase
    .from('ordenes_compra')
    .update({ status: 'completada' })
    .eq('id', order.id)
  continue
}
```

### 2. Corregir datos actuales en la base de datos

Ejecutar una correccion para las OC que fueron marcadas incorrectamente como `completada`:

```sql
-- Corregir OCs que tienen entregas pendientes pero estan marcadas como completadas
UPDATE ordenes_compra
SET status = 'parcial'
WHERE status = 'completada'
AND id IN (
  SELECT DISTINCT orden_compra_id 
  FROM ordenes_compra_entregas 
  WHERE status = 'programada'
);
```

### 3. Mejorar la logica de determinacion de estado

Agregar una funcion auxiliar que centralice la logica de estado de OC:

```typescript
async function determinarEstadoOC(supabase: any, ordenId: string): Promise<string> {
  // Contar entregas por status
  const { data: entregas } = await supabase
    .from('ordenes_compra_entregas')
    .select('status')
    .eq('orden_compra_id', ordenId)

  if (!entregas || entregas.length === 0) {
    return 'enviada' // Sin entregas registradas
  }

  const recibidas = entregas.filter(e => e.status === 'recibida').length
  const pendientes = entregas.filter(e => ['programada', 'en_transito'].includes(e.status)).length
  const total = entregas.length

  if (recibidas === total) {
    return 'completada' // Todas recibidas
  } else if (recibidas > 0 && pendientes > 0) {
    return 'parcial' // Algunas recibidas, algunas pendientes
  } else if (pendientes === total) {
    return 'confirmada' // Todas pendientes
  }
  
  return 'enviada' // Estado por defecto
}
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/auto-reschedule-deliveries/index.ts` | Corregir logica para verificar entregas pendientes antes de marcar como completada |

---

## Flujo Correcto Despues del Fix

```text
┌──────────────────────────────────────────────────────────────────────┐
│  FLUJO CORREGIDO                                                     │
├──────────────────────────────────────────────────────────────────────┤
│  1. Recepcion con faltante                                           │
│     └─> OC marcada como "parcial" ✓                                  │
│  2. Se crea entrega de faltante para dia siguiente ✓                 │
│  3. Edge Function auto-reschedule ejecuta (al dia siguiente)         │
│     └─> Detecta que hay entregas pendientes                          │
│     └─> Mantiene status "parcial" ✓                                  │
│     └─> Reprograma entregas vencidas si aplica                       │
│  4. Cuando se recibe la entrega de faltante                          │
│     └─> Verifica si hay mas entregas pendientes                      │
│     └─> Si no hay mas, marca como "completada" ✓                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

1. Las OC con faltantes mantendran el status `parcial` hasta que todas las entregas sean recibidas
2. Solo cuando no haya entregas pendientes, la OC pasara a `completada`
3. La OC `OC-202601-0002` (Envolviann) sera corregida a status `parcial`
4. El calendario de entregas mostrara correctamente las entregas pendientes de faltantes

