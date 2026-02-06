

# Plan: Corregir 3 Problemas de Autorizacion en Movil

Los 3 cambios son puntuales y se aplican en 2 archivos.

---

## Problema 1: No deja rechazar pedidos

El formulario de rechazo (textarea + botones) esta escondido DENTRO del scroll de productos. Hay que moverlo al footer fijo.

**Archivo:** `src/components/pedidos/AutorizacionRapidaSheet.tsx`

- Eliminar el bloque de rechazo de dentro del ScrollArea (lineas 366-398)
- Cuando `showRejectForm` sea true, el footer mostrara: textarea + botones confirmar/cancelar
- Cuando sea false, se mantiene el layout actual (autorizar/editar/rechazar)

```text
Antes:
[Header]
[ScrollArea con productos...]
  [...muchos productos...]
  [Formulario rechazo aqui -- invisible]
[Footer: botones desaparecen]

Despues:
[Header]
[ScrollArea con productos...]
[Footer: Textarea + Confirmar/Cancelar]
```

---

## Problema 2: % de ganancia no aparece

Todos los productos tienen `ultimo_costo_compra = 0` y `costo_promedio_ponderado = 0`. El codigo dice `{costo > 0 && (...)}` asi que nunca muestra nada.

**Solucion:** Mostrar la seccion SIEMPRE:
- Si costo > 0: Badge de color con el % de margen (verde/amarillo/rojo)
- Si costo = 0: Texto "Sin costo registrado" en gris

**Archivos:**
- `AutorizacionRapidaSheet.tsx` linea 331: quitar condicion `costo > 0`
- `PedidosPorAutorizarTab.tsx` linea 614 (cards movil) y linea 737 (tabla desktop): misma correccion

---

## Problema 3: "Sin pedidos pendientes" muy grande

La tarjeta ocupa demasiado espacio con icono grande y `py-12`.

**Archivo:** `src/components/pedidos/PedidosPorAutorizarTab.tsx` (lineas 382-392)

- Cambiar de Card grande a un mensaje inline compacto
- Solo un icono pequeno + texto en una linea, sin la Card envolvente

---

## Detalle Tecnico

### Archivos a modificar:

1. **`src/components/pedidos/AutorizacionRapidaSheet.tsx`**
   - Mover formulario de rechazo (lineas 366-398) de ScrollArea al footer (despues de linea 401)
   - El footer tendra dos estados: normal (botones autorizar/editar/rechazar) y rechazo (textarea + confirmar/cancelar)
   - Quitar `{costo > 0 &&` de linea 331, reemplazar con render incondicional que muestre "Sin costo" cuando costo es 0

2. **`src/components/pedidos/PedidosPorAutorizarTab.tsx`**
   - Linea 614: quitar `{costo > 0 &&`, mostrar "Sin costo" si costo es 0
   - Linea 737: quitar `{costo > 0 ?`, mostrar "Sin costo" si costo es 0
   - Lineas 382-392: cambiar Card grande a mensaje inline compacto

### Patron del margen cuando no hay costo:

```text
Si costo > 0:
  Costo: $320.00  |  +21.9% margen (badge verde/amarillo/rojo)

Si costo = 0:
  Costo: Sin registro  |  -- (badge gris)
```

### Sin cambios en:
- Logica de autorizacion/rechazo (mutations)
- Vista desktop del listado principal
- Query de datos (ya trae los campos necesarios)

