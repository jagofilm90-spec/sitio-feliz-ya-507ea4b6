

# Plan: Corregir Error "Invalid time value" en PDFs de OC

## Diagnóstico

Los generadores de PDF de Orden de Pago y Cierre de OC fallan con el error `RangeError: Invalid time value` cuando `fecha_creacion` viene en formato ISO completo (timestamp de PostgreSQL).

**Código problemático:**
```typescript
// Línea 128 en ordenPagoPdfGenerator.ts
// Línea 122 en cierreOCPdfGenerator.ts
const fechaFormateada = format(new Date(ordenCompra.fecha_creacion + "T12:00:00"), ...);
```

**Escenario que causa el crash:**
- La BD devuelve: `"2026-01-15T18:30:00.000Z"`
- El código genera: `"2026-01-15T18:30:00.000ZT12:00:00"` (INVÁLIDO)

## Solución

Crear una función helper que normalice cualquier formato de fecha antes de crear el objeto Date.

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/utils/ordenPagoPdfGenerator.ts` | Agregar helper y usarlo en línea 128 |
| `src/utils/cierreOCPdfGenerator.ts` | Agregar helper y usarlo en línea 122 |

### Implementación Técnica

**Nueva función helper (agregar en ambos archivos):**

```typescript
/**
 * Normaliza una fecha que puede venir como:
 * - "2026-01-15" (solo fecha)
 * - "2026-01-15T18:30:00.000Z" (timestamp ISO)
 * - null/undefined
 * Retorna un Date válido o la fecha actual como fallback
 */
const parseFechaSafe = (fecha: string | null | undefined): Date => {
  if (!fecha) return new Date();
  
  try {
    // Si es solo fecha (YYYY-MM-DD), agregar hora del mediodía para evitar problemas de timezone
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return new Date(fecha + "T12:00:00");
    }
    // Si ya es timestamp completo, usarlo directamente
    const parsed = new Date(fecha);
    if (isNaN(parsed.getTime())) {
      return new Date(); // Fallback si aún es inválida
    }
    return parsed;
  } catch {
    return new Date();
  }
};
```

**Cambio en ordenPagoPdfGenerator.ts línea 128:**
```typescript
// ANTES
const fechaFormateada = format(new Date(ordenCompra.fecha_creacion + "T12:00:00"), "dd/MM/yyyy", { locale: es });

// DESPUÉS
const fechaFormateada = format(parseFechaSafe(ordenCompra.fecha_creacion), "dd/MM/yyyy", { locale: es });
```

**Cambio en cierreOCPdfGenerator.ts línea 122:**
```typescript
// ANTES
const fechaFormateada = format(new Date(ordenCompra.fecha_creacion + "T12:00:00"), "dd/MM/yyyy", { locale: es });

// DESPUÉS
const fechaFormateada = format(parseFechaSafe(ordenCompra.fecha_creacion), "dd/MM/yyyy", { locale: es });
```

## Resumen de PDFs de OC

Una vez aplicada esta corrección, todos los generadores de PDF del módulo de Compras funcionarán correctamente:

| PDF | Archivo | Estado |
|-----|---------|--------|
| Orden de Pago | `ordenPagoPdfGenerator.ts` | Por corregir |
| Cierre de OC | `cierreOCPdfGenerator.ts` | Por corregir |
| Comprobante de Recepción | `recepcionPdfGenerator.ts` | Funciona correctamente |
| Reporte Recepciones del Día | `reporteRecepcionesDiaPdfGenerator.ts` | Funciona correctamente |

## Prueba Recomendada

Después de aplicar el fix:
1. Ir a Compras > Órdenes de Compra
2. Seleccionar una OC completada/recibida
3. Abrir "Procesar Pago"
4. Hacer clic en "Descargar Orden de Pago"
5. Verificar que el PDF se genera sin errores

