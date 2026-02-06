

# Plan: Auto-eliminar solicitudes resueltas y notificar al vendedor

## Que se va a corregir

### 1. Las solicitudes no desaparecen al aprobar/rechazar
Cuando apruebas o rechazas, la tarjeta se queda visible en la lista. Solo desaparece si recargas la pagina.

**Causa raiz**: El realtime handler en `useSolicitudesDescuento.ts` hace `prev.map(...)` (actualiza en sitio) pero nunca `prev.filter(...)` (eliminar). Como el panel solo muestra "pendientes", al cambiar a "aprobado"/"rechazado" la tarjeta deberia desaparecer.

**Solucion**: Cambiar el realtime handler para que cuando `onlyPending = true` y el nuevo status NO sea "pendiente", **elimine** el item del array en vez de actualizarlo.

### 2. La contraoferta no envia push al vendedor
Cuando usas "Otro precio" y envias una contraoferta, el vendedor NO recibe push notification en su celular. Solo recibe la notificacion web via realtime.

**Solucion**: Agregar la llamada a `send-push-notification` en `handleContraoferta`, igual que ya existe en `handleAprobar` y `handleRechazar`.

---

## Detalle Tecnico

### Archivo 1: `src/hooks/useSolicitudesDescuento.ts`

Lineas 169-176 -- Cambiar el handler de UPDATE en realtime:

```text
Antes:
  setSolicitudes(prev =>
    prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s)
  );

Despues:
  setSolicitudes(prev => {
    // Si solo mostramos pendientes y ya no es pendiente, eliminar
    if (onlyPending && payload.new.status !== "pendiente") {
      return prev.filter(s => s.id !== payload.new.id);
    }
    // Si no, actualizar en sitio
    return prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s);
  });
```

Esto hace que la tarjeta desaparezca **instantaneamente** cuando el admin la aprueba/rechaza, sin necesidad de recargar.

### Archivo 2: `src/components/admin/SolicitudesDescuentoPanel.tsx`

Lineas 182-206 -- Agregar push notification a `handleContraoferta`:

Despues de la linea `toast.success("Contraoferta enviada")`, agregar:

```typescript
try {
  await supabase.functions.invoke('send-push-notification', {
    body: {
      user_ids: [contraofertaDialog.vendedor_id],
      title: '💰 Contraoferta de Precio',
      body: `Se aprobo un precio diferente para ${contraofertaDialog.producto?.nombre || 'producto'}: ${formatCurrency(precio)}`,
      data: {
        type: 'descuento_contraoferta',
        solicitud_id: contraofertaDialog.id,
        precio_aprobado: String(precio),
      }
    }
  });
} catch (pushError) {
  console.error("Error sending push:", pushError);
}
```

### Sin cambios en:
- Edge function `send-push-notification` (ya soporta `user_ids`)
- Deep linking (el vendedor ya recibe la notificacion web via realtime)
- Vista desktop vs movil (el `SolicitudesDescuentoPanel` es el mismo componente para ambos)

