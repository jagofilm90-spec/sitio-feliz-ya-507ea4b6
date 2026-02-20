
# Correcciones: CSF al crear cliente, Factura en Pedido, y Menú Desplegable

## Qué se va a corregir

Hay 3 temas independientes que atacamos en este plan.

---

## Problema 1 — El vendedor sube CSF pero no se guarda el archivo en Storage

**Estado actual:** El formulario `VendedorNuevoClienteSheet` parsea el CSF con AI para extraer RFC y domicilio, pero nunca sube el archivo PDF al bucket `clientes-csf`. Solo guarda los datos de texto. El campo `csf_archivo_url` en la tabla `clientes` queda siempre en NULL.

**Además:** El bucket `clientes-csf` solo tiene RLS para admin y secretaria — el vendedor no puede subir ni leer archivos.

**Lo que falta:**
1. Migración SQL: agregar policy de INSERT al bucket `clientes-csf` para vendedores
2. En `VendedorNuevoClienteSheet.tsx`: después de parsear el CSF con AI, subir el PDF al bucket con la ruta `{cliente_id}/{timestamp}_csf.pdf` y guardar la URL pública en `clienteData.csf_archivo_url`

---

## Problema 2 — El pedido siempre sale como "remisión" sin opción de factura

**Estado actual:** El wizard de pedidos no tiene ninguna pantalla ni opción para marcar si el pedido requiere factura. El campo `requiere_factura` en `pedidos` siempre queda en `false`. El paso 4 (Confirmar) muestra los datos pero nunca pregunta al vendedor si quiere factura.

**Flujo correcto:**
- Si el cliente tiene CSF subido (`csf_archivo_url IS NOT NULL` o `preferencia_facturacion = 'siempre_factura'`): mostrar un toggle/switch en el paso 4 para que el vendedor seleccione "Con Factura" o "Solo Remisión"
- Si el cliente NO tiene CSF: el pedido siempre es remisión (sin opción de factura), ya que no hay datos fiscales para facturar
- Al guardar el pedido, pasar el valor correcto de `requiere_factura` al INSERT

**Lo que cambia:**
- `src/components/vendedor/pedido-wizard/types.ts`: agregar `preferencia_facturacion` y `csf_archivo_url` al tipo `Cliente`
- `src/components/vendedor/VendedorNuevoPedidoTab.tsx`: incluir `preferencia_facturacion, csf_archivo_url` en la query de clientes; agregar estado `requiereFactura`; pasarlo al `PasoConfirmar`; incluirlo en el INSERT de pedido
- `src/components/vendedor/pedido-wizard/PasoConfirmar.tsx`: mostrar sección de "Tipo de documento" solo si el cliente tiene CSF (switch entre Remisión / Con Factura), visual claro con icono de factura
- El email que se envía a `pedidos@almasa.com.mx` ya incluye la info del pedido, agregarle si requiere factura o no

---

## Problema 3 — Menú desplegable roto/feo

**Estado actual:** El dropdown del Layout usa `Collapsible` de shadcn para las cuentas de correo, que funciona bien. El problema que reportas es visual: el menú no se ve "bonito" ni se mantiene fijo en pantallas móviles. Revisando el código:
- El mobile menu usa `fixed inset-0 bg-background/80 backdrop-blur-sm` — el overlay cubre toda la pantalla pero el contenido del menú puede solaparse con el header
- Los DropdownMenuContent de Radix ya usan `Portal` (z-50) — esto está bien
- El sidebar mobile (`aside`) empieza en `top-[calc(4rem+env(safe-area-inset-top))]` — correcto

**Ajustes a hacer:**
1. Agregar `bg-card` sólido al sidebar mobile con `shadow-xl` para que se vea como panel flotante
2. Cerrar el mobile menu cuando se hace tap en el overlay (ya funciona al hacer click en un ítem, pero no en el overlay)
3. El `DropdownMenuContent` en `ui/dropdown-menu.tsx` — asegurar `bg-popover` explícito y `shadow-md` (ya existe pero puede perderse en dark mode con ciertos temas)
4. Agregar botón "Cerrar menú" visible en la parte superior del menú móvil con la X más grande y más fácil de tocar

---

## Archivos que se modifican

| Archivo | Cambio |
|---------|--------|
| Migración SQL | RLS: vendedor puede INSERT en bucket `clientes-csf` |
| `src/components/vendedor/VendedorNuevoClienteSheet.tsx` | Subir archivo CSF al bucket y guardar URL |
| `src/components/vendedor/pedido-wizard/types.ts` | Agregar `preferencia_facturacion` y `csf_archivo_url` al tipo `Cliente` |
| `src/components/vendedor/VendedorNuevoPedidoTab.tsx` | Incluir campos CSF en query; estado `requiereFactura`; pasa a wizard; INSERT correcto |
| `src/components/vendedor/pedido-wizard/PasoConfirmar.tsx` | Nueva sección "Tipo de documento" condicional al CSF del cliente |
| `src/components/Layout.tsx` | Mejorar UX del mobile menu: overlay clickeable para cerrar, sidebar más visible |

---

## Flujo de negocio resultante

```text
Vendedor crea cliente SIN CSF:
  → preferencia_facturacion = "siempre_remision"
  → csf_archivo_url = NULL
  → Al crear pedido: requiere_factura = false (sin opción)
  → Email a pedidos@ dice: REMISION

Vendedor crea cliente CON CSF:
  → Sube PDF → se guarda en Storage
  → preferencia_facturacion = "siempre_factura"
  → csf_archivo_url = "https://...clientes-csf/..."
  → Al crear pedido: aparece toggle "¿Requiere factura?"
  → Vendedor elige → requiere_factura = true/false
  → Email a pedidos@ dice: CON FACTURA o REMISION

Cuando el pedido es entregado y requiere_factura = true:
  → Secretaria ve el pedido marcado para facturar
  → Puede generar CFDI desde el detalle del pedido
```

---

## Detalle técnico de la subida de CSF

En `VendedorNuevoClienteSheet`, la subida ocurre en 2 momentos:

1. **Al parsear (en `handleCsfUpload`)**: guardar el `File` en estado local, no subirlo aún
2. **Al confirmar el cliente (en `handleSubmit`)**: primero crear el cliente, luego subir el archivo con la ruta `{cliente_id}/csf.pdf`, y finalmente hacer `UPDATE clientes SET csf_archivo_url = url WHERE id = cliente_id`

Esto garantiza que si el parseo falla o el usuario cancela, no queda archivo huérfano en storage.

La policy RLS que se agrega:

```sql
CREATE POLICY "Vendedores pueden subir CSF de sus clientes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'clientes-csf'
  AND has_role(auth.uid(), 'vendedor'::app_role)
);

CREATE POLICY "Vendedores pueden ver CSF de sus clientes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'clientes-csf'
  AND has_role(auth.uid(), 'vendedor'::app_role)
);
```
