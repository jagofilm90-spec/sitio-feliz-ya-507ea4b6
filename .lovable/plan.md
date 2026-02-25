

# Rediseno del Flujo de Carga de Rutas

## Resumen
Se va a reorganizar el flujo de carga para que todo ocurra dentro de la pestana "Carga de Rutas" sin necesidad de ir a otra pagina. Se elimina el boton "Escanear QR" del sidebar y se reemplaza el flujo actual con un proceso paso a paso mas claro e integrado, incluyendo una vista tipo PDF interactiva para modificar cantidades/pesos.

## Cambios principales

### 1. Eliminar boton "Escanear QR" del Sidebar
- Quitar la seccion completa del boton QR en `AlmacenSidebar.tsx` (lineas 262-286)
- El acceso sera exclusivamente desde la pestana "Carga de Rutas"

### 2. Redisenar el flujo dentro de AlmacenCargaRutasTab
En lugar de navegar a `/almacen-tablet/carga-scan`, todo el proceso se manejara inline con pasos claros:

**Paso 1 - Seleccion de personal** (reemplaza el banner actual de "Empezar a cargar")
- Selector de Chofer
- Selector de Ayudante(s) (opcional, multi-select)
- Vehiculo se auto-selecciona al elegir chofer (su unidad asignada), pero se puede cambiar
- Boton "Escanear QR" para avanzar al paso 2

**Paso 2 - Escaneo de pedidos**
- Al dar click en "Escanear QR" se abre la camara para escanear
- Se escanea QR 1, QR 2, QR 3... uno por uno
- Cada pedido escaneado aparece en una lista con folio y cliente
- Se puede seguir escaneando o cerrar la camara
- Boton "Empezar a Cargar" (solo visible cuando hay al menos 1 pedido escaneado)

**Paso 3 - Vista PDF interactiva (hoja de carga)**
- Se muestra un documento tipo PDF/hoja impresa con todos los productos de todos los pedidos escaneados
- Tabla interactiva con columnas: Producto, Cantidad solicitada, Cantidad a cargar (editable), Peso KG (editable), Lote, Acciones
- Se pueden eliminar filas de productos que no hay en inventario
- **Indicador de peso total** prominente: muestra KG teoricos vs KG reales en tiempo real
- Boton para confirmar/finalizar la carga

### 3. Indicador de peso total
- Card prominente mostrando:
  - "Peso teorico: X kg" (suma de cantidades x peso_kg de cada producto)
  - "Peso real: Y kg" (suma de pesos reales capturados)
  - Diferencia visual (verde si coincide, amarillo/rojo si hay discrepancia)

## Archivos a modificar

1. **`src/components/almacen/AlmacenSidebar.tsx`** - Eliminar boton "Escanear QR" del sidebar
2. **`src/components/almacen/AlmacenCargaRutasTab.tsx`** - Redisenar completamente: integrar el flujo de seleccion + escaneo + carga inline con pasos, eliminar el banner que navega a otra pagina
3. **`src/pages/AlmacenCargaScan.tsx`** - Extraer la logica reutilizable (procesamiento de QR, creacion de ruta, manejo de productos) pero mantener la pagina como ruta alternativa por si se accede directamente
4. **Nuevo: `src/components/almacen/CargaRutaInlineFlow.tsx`** - Componente principal del flujo inline con los 3 pasos
5. **Nuevo: `src/components/almacen/CargaHojaInteractiva.tsx`** - Vista tipo PDF/documento interactivo con tabla editable de productos, eliminacion de filas, y resumen de peso total

## Detalles tecnicos

- La logica de escaneo QR (regex para folios, URI scheme almasa, UUIDs) se reutiliza del componente existente
- La creacion de ruta, entregas y carga_productos sigue la misma logica de `AlmacenCargaScan.tsx`
- El componente `CameraQrScanner` existente se reutiliza tal cual
- El peso total se calcula en tiempo real sumando `cantidad * peso_kg` (teorico) y `peso_real_kg` (real) de todos los productos
- Al eliminar una fila de producto, no se descuenta inventario (porque aun no se ha cargado); simplemente se quita de la lista
- La finalizacion sigue el mismo flujo: marcar ruta como "cargada", enviar notificaciones a clientes, actualizar inventario

