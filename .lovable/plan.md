
## Diagnóstico (por qué “no te deja” aunque ya agregamos `min-h-0`)
En tu `ProcesarPagoOCDialog`, el `DialogContent` base (el componente de UI) trae por defecto la clase Tailwind `grid` (viene de `src/components/ui/dialog.tsx`).

Aunque en tu código le pasamos `className="... flex flex-col"`, en Tailwind **el orden de clases en el HTML no siempre “gana”**; para utilidades conflictivas como `grid` vs `flex`, puede terminar aplicándose `grid`.  
Resultado: tu `ScrollArea` está dentro de un contenedor que **no es flex**, así que:

- `flex-1` **no funciona**
- el `ScrollArea` no recibe una altura “limitada”
- el contenido se “sale” del modal y queda **cortado** sin posibilidad de scroll
- por eso no alcanzas a llegar a “Datos del Pago / subir comprobante”

Esto cuadra perfecto con lo que describes: “no me deja ver más abajo”.

---

## Solución propuesta (robusta): forzar el layout del modal a flex (solo aquí)
En lugar de depender de que `flex` “override” a `grid`, vamos a **forzarlo** usando el modificador `!` de Tailwind (important).

### Cambio 1 — `ProcesarPagoOCDialog.tsx`
**Objetivo:** asegurar que el `DialogContent` sea realmente `flex flex-col` y además recorte el contenido para que el scroll interno funcione.

- Ubicación actual:
```tsx
<DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
```

- Cambiar a:
```tsx
<DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden !flex !flex-col">
```

Notas:
- `!flex !flex-col`: garantiza que el contenedor sea flex aunque el componente base tenga `grid`.
- `overflow-hidden`: evita que el contenido se salga del modal; obliga a que el scroll ocurra dentro del `ScrollArea`.

### Cambio 2 — mantener tu `ScrollArea` como está (ya está bien)
Esto ya lo tienes:
```tsx
<ScrollArea className="flex-1 min-h-0 overflow-hidden px-1">
```
Lo dejamos igual; con el `DialogContent` realmente en flex, ahora sí va a funcionar.

---

## Alternativa (si por alguna razón prefieres seguir con `grid`)
Si quieres mantener grid en lugar de flex, la solución equivalente es convertir el modal en un grid con filas definidas:

- `DialogContent`: `grid grid-rows-[auto,1fr,auto] max-h-[90vh] overflow-hidden`
- `ScrollArea`: `min-h-0`

Pero la opción de `!flex` es más simple y más consistente con tu intención actual (ya lo estabas usando como flex).

---

## Qué vamos a validar después del cambio
1. Abrir una OC con muchos productos.
2. Abrir **Procesar Pago**.
3. Hacer scroll hasta **Datos del Pago**.
4. Confirmar que se puede seleccionar archivo (comprobante) y que el footer (botones) se mantiene accesible.

---

## Archivos a tocar
- `src/components/compras/ProcesarPagoOCDialog.tsx`
  - Ajustar `DialogContent className` para forzar `flex` con `!flex !flex-col` y agregar `overflow-hidden`.

