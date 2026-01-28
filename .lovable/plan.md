

# Plan: Limitar Visibilidad de Recepciones a 24 Horas

## Problema Actual

El almacenista ve TODAS las entregas futuras programadas en la pestaña de Recepción. Si hoy es miércoles 28, puede ver entregas del viernes 30, sábado, etc.

## Lógica Solicitada

- **Por la mañana** (antes de 14:00): Solo ver entregas programadas para **HOY**
- **Por la tarde** (después de 14:00): Ver entregas de **HOY + MAÑANA**

Esto permite que el almacenista:
1. Se enfoque en lo que llega hoy
2. A partir de la tarde, pueda preparar lo del día siguiente

---

## Cambio a Implementar

### Archivo
`src/components/almacen/AlmacenRecepcionTab.tsx`

### Ubicación
Líneas ~126-161 (función `loadEntregas`)

### Lógica de Filtro

```typescript
// Calcular fecha límite de visibilidad
const ahora = new Date();
const horaActual = ahora.getHours();

// Si es antes de las 14:00, solo mostrar entregas de hoy
// Si es después de las 14:00, mostrar hoy + mañana
const fechaLimite = new Date();
if (horaActual >= 14) {
  // Por la tarde: incluir mañana
  fechaLimite.setDate(fechaLimite.getDate() + 1);
}
// Poner al final del día límite (23:59:59)
fechaLimite.setHours(23, 59, 59, 999);

const fechaLimiteISO = fechaLimite.toISOString();
```

### Query Modificada

Agregar filtro `.lte()` a la consulta:

```typescript
const { data, error } = await supabase
  .from("ordenes_compra_entregas")
  .select(`...`)
  .in("status", ["programada", "en_transito", "en_descarga"])
  .neq("orden_compra.status", "pendiente_pago")
  // NUEVO: Limitar a entregas dentro de la ventana de visibilidad
  .lte("fecha_programada", fechaLimiteISO)
  .order("fecha_programada", { ascending: true });
```

---

## Ejemplos de Comportamiento

| Día/Hora Actual | Entregas Visibles |
|-----------------|-------------------|
| Miércoles 10:00 AM | Solo entregas del miércoles |
| Miércoles 3:00 PM | Miércoles + Jueves |
| Jueves 9:00 AM | Solo entregas del jueves |
| Jueves 2:30 PM | Jueves + Viernes |

---

## Consideraciones Adicionales

### Entregas sin fecha programada
Las entregas con `fecha_programada = null` se seguirán mostrando (para entregas no programadas que lleguen de improviso).

Ajuste en query:

```typescript
// Mostrar: entregas dentro del límite O sin fecha programada
.or(`fecha_programada.lte.${fechaLimiteISO},fecha_programada.is.null`)
```

### Entregas "en_transito" o "en_descarga"
Estas siempre deben mostrarse sin importar la fecha (ya están en proceso).

Ajuste final:

```typescript
// Filtrar por fecha SOLO las programadas, no las que ya están en proceso
// Se hace como filtro post-query para mantener simplicidad
```

### Indicador Visual (opcional)
Agregar un badge o texto que indique "Próximas 24h" o "Preparar para mañana" para dar contexto al almacenista.

---

## Sección Técnica

### Código Final Propuesto

```typescript
const loadEntregas = async () => {
  setLoading(true);
  try {
    // Calcular ventana de visibilidad
    const ahora = new Date();
    const horaActual = ahora.getHours();
    
    const fechaLimite = new Date();
    // Después de las 14:00, incluir día siguiente
    if (horaActual >= 14) {
      fechaLimite.setDate(fechaLimite.getDate() + 1);
    }
    fechaLimite.setHours(23, 59, 59, 999);
    const fechaLimiteISO = fechaLimite.toISOString();

    const { data, error } = await supabase
      .from("ordenes_compra_entregas")
      .select(`
        id, numero_entrega, cantidad_bultos, fecha_programada,
        fecha_entrega_real, status, notas, llegada_registrada_en,
        nombre_chofer_proveedor, placas_vehiculo, numero_sello_llegada,
        llegada_registrada_por, trabajando_por, trabajando_desde,
        origen_faltante, productos_faltantes,
        orden_compra:ordenes_compra!inner(
          id, folio, status, proveedor_id, proveedor_nombre_manual,
          proveedor:proveedores(id, nombre)
        )
      `)
      .in("status", ["programada", "en_transito", "en_descarga"])
      .neq("orden_compra.status", "pendiente_pago")
      .order("fecha_programada", { ascending: true });

    if (error) throw error;

    // Filtrar entregas por ventana de visibilidad
    // - Las que están en_transito o en_descarga siempre se muestran
    // - Las programadas solo si caen dentro de la ventana
    const entregasFiltradas = (data || []).filter(entrega => {
      // Siempre mostrar entregas en proceso
      if (entrega.status === "en_transito" || entrega.status === "en_descarga") {
        return true;
      }
      
      // Sin fecha programada - mostrar (llegada no programada)
      if (!entrega.fecha_programada) {
        return true;
      }
      
      // Verificar si está dentro de la ventana
      const fechaEntrega = new Date(entrega.fecha_programada);
      return fechaEntrega <= fechaLimite;
    });

    // Continuar con entregasFiltradas en lugar de data...
  }
};
```

### Por qué filtrar en el cliente vs en la query

La condición "mostrar entregas en proceso sin importar fecha" es compleja de expresar en una sola query SQL con `.or()`. Filtrar post-query es más legible y mantenible, y el volumen de datos es bajo (típicamente <50 entregas activas).

---

## Resultado Esperado

1. **Por la mañana**: Almacenista solo ve lo que llega hoy
2. **Por la tarde**: Ve hoy + mañana para prepararse
3. **Entregas en proceso**: Siempre visibles (ya llegaron o están descargando)
4. **Visibilidad limpia**: No hay "ruido" de entregas de la próxima semana

