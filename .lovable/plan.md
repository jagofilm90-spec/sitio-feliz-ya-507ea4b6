
# Plan: Corregir Sincronización del Dashboard de Entregas en OrdenAccionesDialog

## Problema Identificado

El dashboard "Progreso de Entregas" muestra **"3 Sin Fecha"** cuando en realidad las 3 entregas YA tienen fecha programada en la base de datos:

| Entrega | fecha_programada | status |
|---------|-----------------|--------|
| 1 | 2026-02-04 | programada |
| 2 | 2026-02-06 | programada |
| 3 | 2026-02-10 | programada |

### Causa Raíz

**Líneas 167-180 en `OrdenAccionesDialog.tsx`:**

```javascript
// El query NO incluye fecha_programada
.select("id, status, llegada_registrada_en, recepcion_finalizada_en")

// La lógica asume incorrectamente que "programada" = "sin fecha"
const pendientes = entregas.filter(e => 
  e.status === "programada" || e.status === "pendiente_fecha"
).length;
```

El problema es que:
1. El query no trae el campo `fecha_programada`
2. El filtro usa `status === "programada"` para contar "Sin Fecha", pero las entregas con `status: programada` SÍ tienen fecha

## Solución Propuesta

### Cambio 1: Agregar `fecha_programada` al SELECT (línea 169)

```javascript
.select("id, status, fecha_programada, llegada_registrada_en, recepcion_finalizada_en")
```

### Cambio 2: Corregir la lógica de categorización (líneas 178-186)

```javascript
const entregas = data || [];

// SIN FECHA: No tienen fecha_programada asignada o status pendiente_fecha
const sinFecha = entregas.filter(e => 
  !e.fecha_programada || e.status === "pendiente_fecha"
).length;

// PROGRAMADAS: Tienen fecha y están listas para recepción
const programadas = entregas.filter(e => 
  e.fecha_programada && 
  e.status === "programada" &&
  !e.llegada_registrada_en
).length;

// EN DESCARGA: Llegaron pero no han finalizado recepción
const enProceso = entregas.filter(e => 
  e.llegada_registrada_en && 
  !e.recepcion_finalizada_en && 
  e.status !== "rechazada" && 
  e.status !== "recibida"
).length;

// RECIBIDAS: Completamente procesadas
const completadas = entregas.filter(e => e.status === "recibida").length;

return { 
  total: entregas.length, 
  sinFecha,      // ← Renombrar "pendientes" a "sinFecha" para claridad
  programadas,   // ← Nuevo campo explícito
  enProceso, 
  completadas 
};
```

### Cambio 3: Actualizar el rendering del dashboard (líneas 1710-1716)

```javascript
// Sin Fecha
<p className="text-xl font-bold...">{entregasResumen.sinFecha}</p>

// Programadas
<p className="text-xl font-bold...">{entregasResumen.programadas}</p>
```

## Resultado Esperado

Después del fix, el dashboard mostrará:

| Contador | Valor Actual (Bug) | Valor Correcto |
|----------|-------------------|----------------|
| Sin Fecha | 3 | 0 |
| Programadas | 0 | 3 |
| En Descarga | 0 | 0 |
| Recibidas | 0 | 0 |

## Archivos a Modificar

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `src/components/compras/OrdenAccionesDialog.tsx` | 169 | Agregar `fecha_programada` al SELECT |
| `src/components/compras/OrdenAccionesDialog.tsx` | 178-188 | Corregir lógica de filtros con campos renombrados |
| `src/components/compras/OrdenAccionesDialog.tsx` | 1711, 1715 | Usar nuevos campos `sinFecha` y `programadas` |

## Diagrama de Flujo de Estados

```text
Entrega Creada
     │
     ▼
┌─────────────────┐
│ pendiente_fecha │  ←── "Sin Fecha"
│  (sin fecha)    │
└────────┬────────┘
         │ Asignar fecha
         ▼
┌─────────────────┐
│   programada    │  ←── "Programadas"  
│  (con fecha)    │
└────────┬────────┘
         │ Registrar llegada
         ▼
┌─────────────────┐
│ llegada_regist. │  ←── "En Descarga"
│   (en proceso)  │
└────────┬────────┘
         │ Finalizar recepción
         ▼
┌─────────────────┐
│    recibida     │  ←── "Recibidas"
└─────────────────┘
```
