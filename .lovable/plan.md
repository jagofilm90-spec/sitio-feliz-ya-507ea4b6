

# Plan: Remocion instantanea de solicitudes al aprobar/rechazar

## El problema

Cuando rechazas o apruebas una solicitud, la tarjeta NO desaparece de la lista. El contador sigue en 10. Esto pasa porque:

1. La remocion depende del evento realtime que regresa del servidor, pero el closure del useEffect no incluye `onlyPending` en sus dependencias
2. No hay remocion local inmediata -- el panel espera a que el servidor notifique el cambio via realtime

## La solucion: Remocion optimista + fix de dependencias

En lugar de esperar al realtime, quitamos la tarjeta DE INMEDIATO cuando el admin da click en aprobar/rechazar/contraoferta.

### Cambio 1: `src/hooks/useSolicitudesDescuento.ts`

**a)** Agregar `onlyPending` al array de dependencias del useEffect de realtime (linea 218):

```typescript
// Antes:
}, [enableRealtime]);

// Despues:
}, [enableRealtime, onlyPending]);
```

**b)** Agregar una funcion `removeSolicitud` que elimine localmente un item por ID:

```typescript
const removeSolicitud = useCallback((id: string) => {
  setSolicitudes(prev => prev.filter(s => s.id !== id));
  setPendingCount(prev => Math.max(0, prev - 1));
}, []);
```

**c)** Exponer `removeSolicitud` en el return del hook.

### Cambio 2: `src/components/admin/SolicitudesDescuentoPanel.tsx`

Usar `removeSolicitud` despues de cada accion exitosa para quitar la tarjeta al instante:

**En handleAprobar** (despues de `responderSolicitud` exitoso):
```typescript
removeSolicitud(solicitud.id); // Quitar de la lista inmediatamente
```

**En handleRechazar** (despues de `responderSolicitud` exitoso):
```typescript
removeSolicitud(rechazarDialog.id); // Quitar de la lista inmediatamente
```

**En handleContraoferta** (despues de `responderSolicitud` exitoso):
```typescript
removeSolicitud(contraofertaDialog.id); // Quitar de la lista inmediatamente
```

### Resultado esperado

- Al dar "Rechazar" y confirmar: la tarjeta desaparece AL INSTANTE y el contador baja
- Al dar "Aprobar": la tarjeta desaparece AL INSTANTE y el contador baja
- Al dar "Otro precio" y confirmar: la tarjeta desaparece AL INSTANTE
- El realtime sigue funcionando como respaldo (si alguien mas aprueba/rechaza desde otro dispositivo)
- Aplica igual en mobile y desktop (mismo hook, mismo componente)

### Archivos a modificar
- `src/hooks/useSolicitudesDescuento.ts` -- agregar `removeSolicitud` y fix de dependencias
- `src/components/admin/SolicitudesDescuentoPanel.tsx` -- llamar `removeSolicitud` despues de cada accion

