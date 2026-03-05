

# Plan: Estandarizar tipografía y ajustar contenido por variante

## Problemas identificados

1. **Falta de armonía tipográfica**: Mezcla de tamaños (7px, 8px, 9px, 10px, 11px, sm, base) y pesos (font-bold, font-black, font-semibold) sin consistencia.
2. **ALMACÉN** muestra pagaré, firmas de entrega/recepción, y aviso importante — no debería. Solo necesita un espacio simple de "Acepto Conformidad" con línea para nombre, firma y sello.
3. **Observaciones/Devoluciones** aparece en ALMACÉN cuando no tiene sentido ahí.

## Cambios en `HojaCargaUnificadaTemplate.tsx`

### 1. Estandarizar tipografía (todas las variantes)

Establecer una escala tipográfica consistente:
- **Labels/etiquetas**: `text-[8px] font-semibold text-gray-500 uppercase` (uniforme)
- **Valores de datos**: `text-[10px] font-medium` (uniforme, quitar el `text-sm` del folio y la cantidad)
- **Título "HOJA DE CARGA"**: `text-sm font-bold` (bajar de `text-base font-black`)
- **Variante badge**: `text-[9px] font-bold` (bajar de `text-[10px] font-black`)
- **Tabla header**: `text-[8px] font-semibold` (uniforme)
- **Tabla body**: `text-[9px] font-normal` (uniforme, quitar el `font-bold` de cantidad)
- **Disclaimer y aviso**: `text-[8px] font-semibold` (uniforme)
- **Firmas**: `text-[8px] font-medium`
- **Footer**: `text-[7px]` se mantiene

### 2. Variante ALMACÉN — contenido simplificado

Para `variante === "ALMACÉN"`:
- **Quitar**: Pagaré (ya está excluido), firmas Entregó/Recibió, Aviso Importante, frase de no reclamaciones, observaciones/devoluciones
- **Agregar**: Un solo bloque de conformidad:
  ```
  ACEPTO CONFORMIDAD
  ________________________
  Nombre, firma y sello
  ```

### 3. Variantes ORIGINAL y CLIENTE — mantener todo

Conservan: tabla, frase de no reclamaciones, notas, observaciones, aviso importante, firmas Entregó/Recibió, pagaré.

## Resumen de lógica condicional

| Sección | ORIGINAL | CLIENTE | ALMACÉN |
|---------|----------|---------|---------|
| QR | Si | No | No |
| Tabla productos | Si | Si | Si |
| No reclamaciones | Si | Si | No |
| Notas | Si | Si | Si |
| Observaciones | Si | Si | No |
| Aviso importante | Si | Si | No |
| Firmas Entregó/Recibió | Si | Si | No |
| Pagaré | Si | Si | No |
| Acepto Conformidad | No | No | Si |

## Archivo a modificar

| Archivo | Cambios |
|---------|---------|
| `HojaCargaUnificadaTemplate.tsx` | Estandarizar escala tipográfica, condicionar secciones por variante, agregar bloque de conformidad para ALMACÉN |

