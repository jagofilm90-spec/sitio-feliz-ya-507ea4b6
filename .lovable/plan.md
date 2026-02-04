
# Plan: Rediseño del Proceso de Nuevo Pedido como Wizard

## Resumen

Transformar el formulario actual de "Nuevo Pedido" en un **Wizard de 4 pasos** con indicadores visuales de progreso, instrucciones claras en cada etapa, y una experiencia más guiada e intuitiva, siguiendo el mismo patrón exitoso de `CrearOrdenCompraWizard`.

---

## Problemas Actuales Identificados

| Problema | Descripcion |
|----------|-------------|
| Todo en una sola pantalla | El usuario ve cliente, sucursal, productos, descuentos, credito, notas y totales simultaneamente |
| Sin indicadores de progreso | No hay guia visual de que pasos faltan o estan completos |
| Carrito mezclado con catalogo | Los productos agregados se mezclan visualmente con la busqueda |
| Descuentos confusos | No es claro cuando se necesita autorizacion ni como solicitarla |
| Informacion densa | Demasiados campos y opciones visibles al mismo tiempo |

---

## Solucion Propuesta: Wizard de 4 Pasos

```text
+-------------------+     +-------------------+     +-------------------+     +-------------------+
|   PASO 1          | --> |   PASO 2          | --> |   PASO 3          | --> |   PASO 4          |
|   Cliente         |     |   Productos       |     |   Credito/Notas   |     |   Confirmar       |
+-------------------+     +-------------------+     +-------------------+     +-------------------+
| - Seleccionar     |     | - Productos       |     | - Plazo credito   |     | - Resumen visual  |
|   cliente         |     |   frecuentes      |     | - Notas entrega   |     | - Cliente/Sucursal|
| - Seleccionar     |     | - Catalogo        |     |                   |     | - Lista productos |
|   sucursal        |     |   completo        |     |                   |     | - Total + Imptos  |
|                   |     | - Carrito         |     |                   |     | - Boton Crear     |
+-------------------+     +-------------------+     +-------------------+     +-------------------+
```

### Paso 1: Cliente y Sucursal
- Titulo: "Quien compra?"
- Selector de cliente con agrupacion por region (ya existe)
- Selector de sucursal (solo si tiene multiples)
- Indicador visual del termino de credito del cliente
- Boton "Continuar" prominente

### Paso 2: Agregar Productos
- Titulo: "Que productos necesita?"
- Seccion de productos frecuentes arriba (acceso rapido)
- Buscador con filtro
- Lista de productos con controles +/- directos
- Carrito lateral fijo (escritorio) o acordeon (movil)
- Control de descuentos DENTRO del carrito con indicadores claros:
  - Verde: descuento dentro del limite
  - Amarillo: requiere autorizacion (con boton de solicitar)
  - Rojo: rechazado
- Contador de productos y total parcial siempre visible

### Paso 3: Credito y Notas
- Titulo: "Condiciones de pago"
- Selector de plazo con descripciones claras y grandes
- Indicador si es diferente al default del cliente
- Campo de notas para instrucciones de entrega
- Resumen rapido: X productos, Y kg, $Z total

### Paso 4: Confirmar y Crear
- Titulo: "Revisa tu pedido"
- Resumen completo:
  - Cliente y sucursal
  - Lista de productos con precios finales
  - Desglose de impuestos (IVA, IEPS)
  - Total destacado
  - Plazo de credito seleccionado
  - Alertas de productos sin stock
  - Alertas de descuentos pendientes de autorizacion
- Boton grande "Crear Pedido"

---

## Mejoras de UX Especificas

### 1. Indicador de Progreso Visual
Implementar el mismo patron del Wizard de OC:
```
[1]----[2]----[3]----[4]
 o      o      o      o
Paso actual: circulo lleno
Pasos completados: check verde
Pasos pendientes: circulo vacio
```

### 2. Carrito Siempre Visible (Paso 2)
- En escritorio: panel lateral derecho fijo (30% ancho)
- En movil: boton flotante con contador que abre sheet
- Muestra: cantidad productos, peso total, subtotal

### 3. Descuentos Simplificados
- Reemplazar input numerico por slider intuitivo
- Mostrar claramente el limite maximo
- Boton "Solicitar precio especial" cuando excede limite
- Estado de autorizacion visible (pendiente/aprobado/rechazado)

### 4. Navegacion Clara
- Botones "Anterior" y "Siguiente" siempre visibles
- Deshabilitar "Siguiente" si faltan campos requeridos
- Permitir clic en indicadores de paso para navegar (solo a pasos ya visitados)

---

## Cambios Tecnicos

### Archivos a Modificar/Crear

| Archivo | Cambio |
|---------|--------|
| `src/components/vendedor/VendedorNuevoPedidoTab.tsx` | Refactorizar completamente a estructura Wizard con 4 pasos |
| `src/components/vendedor/pedido-wizard/PasoCliente.tsx` | Nuevo: Componente para paso 1 |
| `src/components/vendedor/pedido-wizard/PasoProductos.tsx` | Nuevo: Componente para paso 2 |
| `src/components/vendedor/pedido-wizard/PasoCredito.tsx` | Nuevo: Componente para paso 3 |
| `src/components/vendedor/pedido-wizard/PasoConfirmar.tsx` | Nuevo: Componente para paso 4 |
| `src/components/vendedor/pedido-wizard/CarritoPanel.tsx` | Nuevo: Componente de carrito reutilizable |
| `src/components/vendedor/pedido-wizard/StepIndicator.tsx` | Nuevo: Indicador de progreso visual |

### Logica de Estado
Mantener un solo estado compartido elevado al componente padre (VendedorNuevoPedidoTab):
```typescript
interface WizardState {
  step: 1 | 2 | 3 | 4;
  clienteId: string;
  sucursalId: string;
  lineas: LineaPedido[];
  terminoCredito: string;
  notas: string;
}
```

Cada componente de paso recibe props del estado y callbacks para actualizarlo.

### Validaciones por Paso

| Paso | Validacion |
|------|------------|
| 1 | Cliente seleccionado + sucursal (si aplica) |
| 2 | Al menos 1 producto en carrito |
| 3 | Plazo de credito seleccionado (ya tiene default) |
| 4 | Sin descuentos sin autorizar (a menos que sean "pendiente revision") |

---

## Flujo Visual (Mobile)

```text
+---------------------------+
|  [1]-[2]-[3]-[4]          |  <- Indicador progreso
|                           |
|  Quien compra?            |  <- Titulo del paso
|  Selecciona cliente       |  <- Instruccion clara
|                           |
|  [Dropdown Cliente    v]  |
|                           |
|  [Dropdown Sucursal   v]  |  <- Solo si tiene multiples
|                           |
|  Credito: 30 dias         |  <- Info del cliente
|                           |
|  +---------------------+  |
|  |    CONTINUAR   -->  |  |  <- Boton prominente
|  +---------------------+  |
+---------------------------+
```

---

## Beneficios Esperados

1. **Menos confusion**: Un solo enfoque por pantalla
2. **Progreso visible**: El usuario sabe exactamente donde esta
3. **Errores tempranos**: Validacion por paso evita errores al final
4. **Movil optimizado**: Cada paso cabe perfectamente en pantalla
5. **Consistencia**: Mismo patron que el Wizard de Ordenes de Compra

---

## Consideraciones de Migracion

- El borrador guardado en sessionStorage seguira funcionando
- La logica de negocio (calculos, autorizaciones, notificaciones) no cambia
- Solo cambia la presentacion y organizacion visual
- Los vendedores veran el nuevo flujo inmediatamente sin necesidad de capacitacion adicional
