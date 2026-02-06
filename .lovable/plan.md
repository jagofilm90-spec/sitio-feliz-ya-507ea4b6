
# Plan: Mostrar Detalle Completo de Precios en Autorizacion

## Problema

Actualmente cuando abres un pedido por autorizar (tanto en movil como en desktop), solo ves:
- Nombre del producto
- Cantidad
- Precio solicitado
- Precio lista
- Subtotal

Falta informacion critica para tomar la decision de autorizar:
- **Precio minimo** (precio lista - descuento maximo permitido)
- **Diferencia** entre precio solicitado y precio minimo
- **% de ganancia** basado en el costo real del producto

## Lo que veras despues del cambio

Para cada producto en la vista de autorizacion:

```text
Fecula de Maiz Ingredion -- Bulto 25.00 kg
Cantidad: 100 bultos

Precio lista:     $430.00
Precio minimo:    $400.00  (descuento max: $30)
Precio solicitado: $390.00
Diferencia:       -$10.00  (por debajo del minimo)

Costo:            $320.00
Ganancia:         $70.00 (21.9%)
```

Si el precio solicitado esta por debajo del minimo, se resalta en rojo.
Si la ganancia es baja (menos de 10%), se muestra una alerta.

---

## Cambios Tecnicos

### 1. Ampliar la consulta de datos

**Archivo:** `src/components/pedidos/PedidosPorAutorizarTab.tsx`

En la query de la linea 132, agregar los campos faltantes de productos:
- `descuento_maximo` - para calcular precio minimo
- `ultimo_costo_compra` - para calcular ganancia
- `costo_promedio_ponderado` - como respaldo si no hay ultimo costo

Actualizar la interface `PedidoPorAutorizar` para incluir estos campos en el tipo de `productos`.

### 2. Redisenar las cards moviles de autorizacion

**Archivo:** `src/components/pedidos/AutorizacionRapidaSheet.tsx`

Actualizar la interface `PedidoDetalle` para incluir los nuevos campos.

Para cada producto, cambiar de:
```text
[Nombre]
[Cantidad x Precio] ... [Subtotal]
```

A un layout con desglose completo:
```text
[Nombre completo del producto]
[Cantidad] [Unidad]
----
P. Lista:      $430.00
P. Minimo:     $400.00
P. Solicitado: $390.00  (badge rojo si < minimo)
Diferencia:    -$10.00
----
Costo: $320 | Ganancia: 21.9%
----
Subtotal: $39,000.00
```

Se usa una tabla de 2 columnas (label + valor) dentro de cada card para alinear los numeros.

### 3. Redisenar las cards moviles en el dialogo desktop

**Archivo:** `src/components/pedidos/PedidosPorAutorizarTab.tsx`

En la seccion `sm:hidden` (lineas 564-647), agregar los mismos campos de precio minimo, diferencia y ganancia que en el AutorizacionRapidaSheet.

### 4. Agregar columnas a la tabla desktop

**Archivo:** `src/components/pedidos/PedidosPorAutorizarTab.tsx`

En la tabla desktop (lineas 650-753), agregar columnas:
- **P. Minimo** - precio lista menos descuento maximo
- **Diferencia** - precio solicitado vs precio minimo (con color rojo/verde)
- **Margen %** - porcentaje de ganancia basado en costo

### 5. Indicadores visuales de alerta

Se agregaran badges de color para facilitar la decision:
- **Rojo**: Precio solicitado por debajo del minimo permitido
- **Amarillo**: Ganancia menor al 10%
- **Verde**: Precio dentro de rango con buena ganancia

---

## Archivos a modificar

1. `src/components/pedidos/PedidosPorAutorizarTab.tsx` - Query ampliada + interfaces + tabla desktop + cards moviles del dialogo
2. `src/components/pedidos/AutorizacionRapidaSheet.tsx` - Interface actualizada + cards con desglose completo de precios

## Compatibilidad

- **Desktop**: Se agregan columnas a la tabla existente
- **Movil**: Se amplian las cards con el desglose de precios en formato vertical
- **Sin cambios en la logica de autorizacion**: Solo es visual, la mecanica de autorizar/rechazar/editar precios no cambia
