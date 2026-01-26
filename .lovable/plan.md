

# Plan: Corrección Definitiva del Scroll en ProcesarPagoOCDialog

## Diagnóstico Actualizado

Revisando el código, veo que:

1. **`DialogContent` base** (en `dialog.tsx` línea 39) tiene `grid` como clase por defecto
2. Aunque usamos `!flex !flex-col`, hay un problema con cómo Tailwind procesa los modificadores `!important` cuando se mezclan con clases existentes en `cn()`
3. El `ScrollArea` de Radix tiene un `Viewport` interno con `h-full` que depende de que su padre tenga altura definida

## Solución Definitiva

Vamos a tomar un enfoque más directo: **usar estilos inline para forzar el display flex**, ya que los estilos inline siempre tienen mayor especificidad que las clases CSS.

### Cambio en `ProcesarPagoOCDialog.tsx`

**Ubicación**: Línea 520

**Cambio**:
```tsx
// ANTES:
<DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden !flex !flex-col">

// DESPUÉS:
<DialogContent 
  className="max-w-4xl max-h-[90vh] overflow-hidden" 
  style={{ display: 'flex', flexDirection: 'column' }}
>
```

Al usar `style={{ display: 'flex', flexDirection: 'column' }}`, garantizamos que:
- El estilo inline tiene mayor especificidad que cualquier clase Tailwind
- No hay conflicto con la clase `grid` del componente base
- El `ScrollArea` con `flex-1 min-h-0` funcionará correctamente

---

## Validación Post-Cambio

1. Abrir una OC con muchos productos
2. Hacer clic en "Procesar Pago"
3. Verificar que aparece la barra de scroll a la derecha
4. Hacer scroll hasta ver "Datos del Pago"
5. Verificar que se puede subir el comprobante
6. Confirmar que los botones del footer son visibles y accesibles

---

## Archivo a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/compras/ProcesarPagoOCDialog.tsx` | Línea 520: usar `style` inline para forzar flex |

