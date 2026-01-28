
# Plan: Corregir Flujo de Pago Anticipado - Bloquear Visibilidad y Notificaciones

## Problema Identificado

El codigo actual tiene 4 huecos que permiten que las OCs con pago anticipado:
1. Envien emails al proveedor antes de pagar
2. Aparezcan en el calendario de Almacen antes de pagar
3. Sean visibles en la pantalla de Recepcion antes de pagar

Esto contradice el flujo de negocio donde el proveedor NO debe saber las fechas hasta que se confirme el pago.

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `ProgramarEntregasDialog.tsx` | Suprimir envio de email si status = pendiente_pago |
| `CalendarioEntregasTab.tsx` | Filtrar entregas de OCs en pendiente_pago |
| `AlmacenRecepcionTab.tsx` | Filtrar entregas de OCs en pendiente_pago |
| `OrdenAccionesDialog.tsx` | Mostrar alerta de bloqueo para OCs pendiente_pago |

---

## Correccion 1: ProgramarEntregasDialog

### Ubicacion
`src/components/compras/ProgramarEntregasDialog.tsx` linea ~95

### Cambio
Agregar validacion antes de enviar email:

```typescript
// Send email to supplier ONLY if not pending payment
if (orden?.proveedores?.email && orden?.status !== 'pendiente_pago') {
  // ... logica de envio de email existente ...
} else if (orden?.status === 'pendiente_pago') {
  toast({
    title: "Fechas guardadas (sin notificacion)",
    description: "La OC tiene pago anticipado pendiente. El proveedor sera notificado cuando se registre el pago.",
  });
}
```

---

## Correccion 2: CalendarioEntregasTab

### Ubicacion
`src/components/compras/CalendarioEntregasTab.tsx` linea ~75

### Cambio
Agregar filtro en la query para excluir OCs en pendiente_pago:

```typescript
const { data, error } = await supabase
  .from("ordenes_compra_entregas")
  .select(`
    *,
    productos_faltantes,
    ordenes_compra!inner (
      id, folio, total, subtotal, impuestos, status,
      proveedor_id, proveedor_nombre_manual, proveedor_email_manual,
      tipo_pago, status_pago, entregas_multiples,
      ...
    )
  `)
  // NUEVO: Excluir entregas de OCs pendientes de pago
  .neq("ordenes_compra.status", "pendiente_pago")
  .order("fecha_programada");
```

---

## Correccion 3: AlmacenRecepcionTab

### Ubicacion
`src/components/almacen/AlmacenRecepcionTab.tsx` linea ~129

### Cambio
La query actual no trae el status de la OC padre. Modificar para:
1. Incluir status de OC en el select
2. Filtrar en el cliente o agregar filtro en query

```typescript
const { data, error } = await supabase
  .from("ordenes_compra_entregas")
  .select(`
    ...campos existentes...,
    orden_compra:ordenes_compra!inner(
      id,
      folio,
      status,  // NUEVO: traer status
      proveedor_id,
      proveedor_nombre_manual,
      proveedor:proveedores(id, nombre)
    )
  `)
  .in("status", ["programada", "en_transito", "en_descarga"])
  // NUEVO: Excluir entregas de OCs pendientes de pago
  .neq("orden_compra.status", "pendiente_pago")
  .order("fecha_programada", { ascending: true });
```

---

## Correccion 4: OrdenAccionesDialog - Banner de Alerta

### Ubicacion
`src/components/compras/OrdenAccionesDialog.tsx`

### Cambio
Agregar banner visual cuando la OC esta en pendiente_pago:

```tsx
{orden?.status === 'pendiente_pago' && (
  <Alert className="border-amber-300 bg-amber-50 mb-4">
    <DollarSign className="h-4 w-4 text-amber-600" />
    <AlertDescription className="text-amber-800">
      <strong>Pago Anticipado Pendiente</strong>
      <br />
      Las entregas estan bloqueadas para el almacen y el proveedor
      no recibira notificaciones hasta que se registre el pago.
    </AlertDescription>
  </Alert>
)}
```

---

## Flujo Corregido

```text
PAGO ANTICIPADO (CORREGIDO):

1. Crear OC → status = 'pendiente_pago'
   ├── Entregas se crean internamente
   ├── NO aparecen en Calendario Almacen
   └── NO aparecen en Recepcion Almacen

2. Secretaria programa fechas (opcional, para planear)
   ├── Fechas se guardan en BD
   ├── NO se envia email al proveedor
   └── Toast indica "guardado sin notificacion"

3. Registrar pago → status cambia a 'autorizada'
   ├── Entregas AHORA aparecen en Calendario
   ├── Entregas AHORA aparecen en Recepcion
   └── Se puede enviar notificacion al proveedor

4. Reprogramar/agregar fechas
   └── AHORA SI se envia email al proveedor
```

---

## Seccion Tecnica: Queries Modificadas

### CalendarioEntregasTab - Query con Filtro

```typescript
queryFn: async () => {
  const { data, error } = await supabase
    .from("ordenes_compra_entregas")
    .select(`
      *,
      productos_faltantes,
      ordenes_compra!inner (
        id, folio, total, subtotal, impuestos, status,
        proveedor_id, proveedor_nombre_manual, proveedor_email_manual,
        tipo_pago, status_pago, entregas_multiples,
        fecha_entrega_programada, creado_por, autorizado_por, notas,
        proveedores (id, nombre, email, rfc),
        ordenes_compra_detalles (
          id, cantidad_ordenada, cantidad_recibida,
          precio_unitario_compra, subtotal,
          productos (id, codigo, nombre)
        )
      )
    `)
    .neq("ordenes_compra.status", "pendiente_pago")  // FILTRO CLAVE
    .order("fecha_programada");

  if (error) throw error;
  return data;
}
```

### AlmacenRecepcionTab - Query con Status de OC

```typescript
const { data, error } = await supabase
  .from("ordenes_compra_entregas")
  .select(`
    id, numero_entrega, cantidad_bultos, fecha_programada,
    fecha_entrega_real, status, notas, llegada_registrada_en,
    nombre_chofer_proveedor, placas_vehiculo, numero_sello_llegada,
    llegada_registrada_por, trabajando_por, trabajando_desde,
    origen_faltante, productos_faltantes,
    orden_compra:ordenes_compra!inner(
      id, folio, status,
      proveedor_id, proveedor_nombre_manual,
      proveedor:proveedores(id, nombre)
    )
  `)
  .in("status", ["programada", "en_transito", "en_descarga"])
  .neq("orden_compra.status", "pendiente_pago")  // FILTRO CLAVE
  .order("fecha_programada", { ascending: true });
```

---

## Orden de Implementacion

1. Modificar `ProgramarEntregasDialog.tsx` - suprimir email
2. Modificar `CalendarioEntregasTab.tsx` - agregar filtro query
3. Modificar `AlmacenRecepcionTab.tsx` - agregar filtro query
4. Modificar `OrdenAccionesDialog.tsx` - agregar banner alerta
5. Probar flujo completo:
   - Crear OC anticipado
   - Verificar que calendario NO muestra
   - Programar fecha - verificar NO llega email
   - Pagar OC
   - Verificar que ahora SI aparece en calendario
   - Programar otra fecha - verificar SI llega email

---

## Resultado Esperado

Despues de aplicar estas correcciones:

| Accion | Antes (Bug) | Despues (Corregido) |
|--------|-------------|---------------------|
| Crear OC anticipado + programar fecha | Email enviado, visible en calendario | Sin email, oculto de calendario |
| Registrar pago | Sin cambio visible | Entregas aparecen en calendario |
| Programar fecha despues de pagar | Email enviado | Email enviado (correcto) |
