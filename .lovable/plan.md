
## Objetivo (lo que estás pidiendo)
En el calendario del wizard, en vez de que cada fecha muestre “1” (porque hoy está mostrando “cantidad de entregas en ese día”), quieres que muestre el número de la entrega de tu OC:
- Feb 04 → “1”
- Feb 06 → “2”
- Feb 11 → “3”

Y si dos entregas caen el mismo día, idealmente que se vea algo como “1-2” o “1,2”.

---

## Diagnóstico (por qué hoy se ve “1 1 1”)
El componente `CalendarioOcupacion.tsx` actualmente pone en el badge esto:

- `ocupacion.count` = (entregas de BD + entregasLocales) para ese día

Entonces:
- Si en Feb 04 solo hay 1 entrega local, mostrará “1”
- Si en Feb 06 solo hay 1 entrega local, mostrará “1”
- Si en Feb 11 solo hay 1 entrega local, mostrará “1”

Eso es correcto para “ocupación”, pero no para “orden de entrega”.

---

## Solución propuesta (sin perder la ocupación)
Cuando el día incluya entregasLocales (tu OC en creación), el badge debe mostrar **los números de entrega locales** (1/2/3), y el color/fondo puede seguir representando **ocupación total** (para que sigas viendo si el día está saturado).

### Comportamiento final
- Si un día tiene entregasLocales: el badge muestra “1”, “2”, “3” (según corresponda).
- Si un día tiene varias entregasLocales en el mismo día: mostrar “1-3” si son consecutivas, o “1,3” si no lo son.
- El color del badge (verde/ámbar/rojo) seguirá basándose en la ocupación total (BD + tu OC) para conservar la señal de saturación.
- Un “ring/borde” seguirá indicando “incluye esta OC”.

---

## Cambios concretos a implementar

### 1) Actualizar el modelo de ocupación por día en `CalendarioOcupacion.tsx`
Hoy:
- `entregasLocales: number` (solo cuenta)

Propuesto:
- Guardar **qué entregas** locales caen en ese día, por ejemplo:
  - `entregasLocalesNumeros: number[]`

Ejemplo:
- Feb 04: `[1]`
- Feb 06: `[2]`
- Feb 11: `[3]`
- Si dos en mismo día: `[1,2]`

### 2) Construir el “label” que se pinta en el calendario
Agregar una función helper en `CalendarioOcupacion.tsx`:

- Ordena y elimina duplicados
- Si hay 1 número → `"1"`
- Si hay varios consecutivos → `"1-3"`
- Si hay varios no consecutivos → `"1,3"`
- Si por alguna razón no cabe (muchos números), fallback tipo `"1-6"` (rango) para evitar textos largos

### 3) Cambiar el badge para mostrar números de entrega cuando haya entregasLocales
En el render del día:

- Si `ocupacion.entregasLocalesNumeros.length > 0`
  - texto del badge = `labelLocal` (ej. “2”)
  - mantener ring/borde para indicar “tu OC”
- Si no hay entregasLocales
  - texto = `ocupacion.count` (ocupación normal)

### 4) Tooltip más claro (para evitar confusión)
Actualizar tooltip:
- “Ocupación total: X”
- “Esta OC: #1, #2 … (Proveedor)”
- “Otras OCs:” (lista existente)

### 5) Leyenda (opcional pero recomendado)
Mantener:
- Verde 1-2 / Ámbar 3-4 / Rojo 5+

Agregar una mini-nota:
- “Borde = esta OC” (para que el usuario entienda el ring)

---

## Archivos a modificar
1) `src/components/compras/CalendarioOcupacion.tsx`
- Cambiar la estructura `OcupacionDia`
- Guardar números de entregas locales por fecha
- Mostrar label local (“1/2/3”) en el badge
- Ajustar tooltip

`CrearOrdenCompraWizard.tsx` no debería requerir cambios (ya manda `entregasLocales={entregasProgramadas}` con `numero_entrega`).

---

## Pruebas rápidas (lo que voy a validar al terminar)
1) OC con 3 entregas en 3 fechas distintas:
- Debe verse “1”, “2”, “3” en sus días.
2) OC con 3 entregas el mismo día:
- Debe verse “1-3” (o “1,2,3” si decidimos ese formato).
3) Quitar una fecha con “×”:
- Debe desaparecer el número de ese día inmediatamente.
4) Día con otras OCs + tu entrega:
- El badge debe mostrar tu número, pero el color debe reflejar ocupación total (y tooltip debe mostrar el desglose).

---

## Nota importante (para confirmar expectativa)
Con este cambio, el número en el calendario ya no significa “cuántos camiones hay ese día” cuando es tu OC; significa “qué entrega(s) de tu OC cae(n) ese día”.  
La ocupación total seguirá visible por color y por tooltip (y si quieres, en una segunda marquita pequeña también se puede agregar después).

