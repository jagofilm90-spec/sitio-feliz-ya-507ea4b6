

# Plan: Notificación al Proveedor al Cierre de OC con Devoluciones

## Resumen

Crear un flujo automático que notifique al proveedor cuando se cierra una OC que tuvo devoluciones (productos rotos, rechazados por calidad), enviando un correo profesional con un PDF adjunto que detalla:
- Productos recibidos correctamente
- Productos devueltos y sus motivos
- Total original vs monto final a pagar

---

## Contexto Actual

### Lo que ya existe:
1. **Flujo de pago** (`MarcarPagadoDialog.tsx`): Ya envía correo de confirmación al proveedor con desglose de devoluciones
2. **Generador de PDF de recepción** (`recepcionPdfGenerator.ts`): Genera PDFs profesionales con logo, tabla de productos, firmas
3. **Edge Function de notificaciones** (`notificar-faltante-oc`): Patrón para enviar emails a proveedores via Gmail API
4. **Campos de devoluciones en OC**: `monto_devoluciones` y `total_ajustado` ya calculados

### Lo que falta:
- Un PDF consolidado de "Cierre de OC" que incluya tanto lo recibido como lo devuelto
- Disparo automático de la notificación al cerrar una OC con devoluciones (no solo al pagar)

---

## Solución Propuesta

### 1. Nuevo Generador de PDF: `cierreOCPdfGenerator.ts`

Crear un nuevo generador que produzca un documento de "Estado de Cuenta de Orden de Compra" con:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  [LOGO]                                ESTADO DE CUENTA               │
│                                        ORDEN DE COMPRA                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Folio: OC-202601-0003          Fecha: 26/01/2026                      │
│  Proveedor: BODEGA AURRERA                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PRODUCTOS RECIBIDOS                                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Código     │ Producto              │ Cantidad │ P.U.    │ Subtotal│  │
│  ├────────────┼───────────────────────┼──────────┼─────────┼─────────┤  │
│  │ AZC001     │ Azúcar Estándar 50kg  │    1,198 │  $50.00 │$59,900  │  │
│  │ ARR002     │ Arroz Morelos 25kg    │      200 │  $42.00 │ $8,400  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  PRODUCTOS DEVUELTOS                                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Código     │ Producto              │ Cant │ Motivo   │ Descuento │  │
│  ├────────────┼───────────────────────┼──────┼──────────┼───────────┤  │
│  │ AZC001     │ Azúcar Estándar 50kg  │    2 │ Roto     │   -$100.00│  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ════════════════════════════════════════════════════════════════════   │
│                                                                          │
│  Total Original:                                          $68,300.00    │
│  (-) Devoluciones:                                          -$100.00    │
│  ──────────────────────────────────────────────────────────────────     │
│  TOTAL A PAGAR:                                           $68,200.00    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Estructura del archivo:**

```typescript
// src/utils/cierreOCPdfGenerator.ts

interface CierreOCData {
  ordenCompra: {
    id: string;
    folio: string;
    proveedor_nombre: string;
    fecha_creacion: string;
    total: number;
    monto_devoluciones: number;
    total_ajustado: number;
  };
  productosRecibidos: Array<{
    codigo: string;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
  devoluciones: Array<{
    codigo: string;
    nombre: string;
    cantidad: number;
    motivo: string;
    precio_unitario: number;
    monto: number;
  }>;
}

// Función principal
export const generarCierreOCPDF = async (data: CierreOCData): Promise<void>

// Versión base64 para adjuntar a emails
export const generarCierreOCPDFBase64 = async (data: CierreOCData): Promise<{
  base64: string;
  fileName: string;
}>
```

---

### 2. Nueva Edge Function: `notificar-cierre-oc`

Crear una edge function que:
1. Reciba el `orden_compra_id`
2. Consulte los datos de la OC, productos recibidos y devoluciones
3. Genere el HTML del correo con resumen financiero
4. Adjunte el PDF generado (pasado como base64 desde el frontend)
5. Envíe via `gmail-api` a los contactos del proveedor con `recibe_logistica` o `recibe_devoluciones`

**Estructura:**

```typescript
// supabase/functions/notificar-cierre-oc/index.ts

interface RequestBody {
  orden_compra_id: string;
  pdf_base64: string;
  pdf_filename: string;
}

// El email incluirá:
// - Resumen de la OC (folio, fecha, proveedor)
// - Tabla de productos recibidos
// - Tabla de devoluciones (si las hay)
// - Desglose financiero (original - devoluciones = total)
// - PDF adjunto con el detalle completo
```

---

### 3. Disparar Notificación al Cerrar OC

**Opción A - Al marcar la última entrega como recibida:**

Modificar `AlmacenRecepcionSheet.tsx` (líneas 1030-1039) donde ya se marca la OC como "completada":

```typescript
// Después de marcar como completada...
if (!entregasPendientes || entregasPendientes.length === 0) {
  await supabase
    .from("ordenes_compra")
    .update({ status: "completada", ... })
    .eq("id", entrega.orden_compra.id);
  
  // Si hubo devoluciones, enviar notificación
  if (monto_devoluciones > 0) {
    await enviarNotificacionCierreOC(ordenCompraId);
  }
}
```

**Opción B - Al registrar el pago (recomendada):**

Integrar en `MarcarPagadoDialog.tsx` ya que:
- Ya tiene el flujo de envío de correo
- Ya tiene los datos de devoluciones cargados
- El PDF serviría como documento oficial de cierre

La diferencia sería agregar la generación del PDF de cierre como adjunto adicional.

---

### 4. Modificaciones a `MarcarPagadoDialog.tsx`

Agregar opción de adjuntar "Estado de Cuenta de OC" como PDF adicional:

```typescript
// Nuevo checkbox en la UI
<div className="flex items-center space-x-2">
  <Checkbox
    id="adjuntarEstadoCuenta"
    checked={adjuntarEstadoCuenta}
    onCheckedChange={(checked) => setAdjuntarEstadoCuenta(checked === true)}
  />
  <Label htmlFor="adjuntarEstadoCuenta">
    Adjuntar Estado de Cuenta (PDF con detalle de productos)
  </Label>
</div>

// Al enviar el correo, generar y adjuntar el PDF
if (adjuntarEstadoCuenta) {
  const estadoCuentaPDF = await generarCierreOCPDFBase64(cierreData);
  emailPayload.attachments.push({
    filename: estadoCuentaPDF.fileName,
    content: estadoCuentaPDF.base64,
    mimeType: 'application/pdf',
  });
}
```

---

## Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/utils/cierreOCPdfGenerator.ts` | CREAR | Generador de PDF de Estado de Cuenta |
| `supabase/functions/notificar-cierre-oc/index.ts` | CREAR | Edge function para notificación automática |
| `src/components/compras/MarcarPagadoDialog.tsx` | MODIFICAR | Agregar opción de adjuntar PDF de cierre |
| `supabase/config.toml` | MODIFICAR | Registrar nueva edge function |

---

## Flujo Visual del Usuario

```text
                    ┌─────────────────────────────────┐
                    │   Almacén: Recepción con        │
                    │   devoluciones (2 bultos rotos) │
                    └──────────────┬──────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────┐
                    │   Sistema calcula:              │
                    │   monto_devoluciones = $100     │
                    │   total_ajustado = $59,900      │
                    └──────────────┬──────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────┐
                    │   OC marcada como "completada"  │
                    └──────────────┬──────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────┐
                    │   Secretaria: Registrar Pago    │
                    │   ☑ Enviar correo al proveedor  │
                    │   ☑ Adjuntar Estado de Cuenta   │
                    │   📎 Adjuntar comprobante pago  │
                    └──────────────┬──────────────────┘
                                   │
                                   ▼
            ┌──────────────────────────────────────────────┐
            │             📧 CORREO AL PROVEEDOR           │
            ├──────────────────────────────────────────────┤
            │  Asunto: Confirmación de Pago - OC-202601-003│
            │                                               │
            │  Adjuntos:                                    │
            │  📄 Comprobante_pago.pdf                      │
            │  📄 Estado_Cuenta_OC-202601-0003.pdf          │
            │                                               │
            │  Contenido:                                   │
            │  - Resumen de pago                           │
            │  - Desglose de devoluciones                  │
            │  - Total pagado                              │
            └──────────────────────────────────────────────┘
```

---

## Contenido del Correo (HTML)

```html
<h2>Confirmación de Pago - OC-202601-0003</h2>

<p>Estimado proveedor,</p>

<p>Le informamos que hemos procesado el cierre de la siguiente orden de compra:</p>

<table>
  <tr><td>Folio OC:</td><td>OC-202601-0003</td></tr>
  <tr><td>Total Original:</td><td>$60,000.00</td></tr>
  <tr><td>(-) Devoluciones:</td><td>-$100.00</td></tr>
  <tr><td><strong>Total Pagado:</strong></td><td><strong>$59,900.00</strong></td></tr>
</table>

<h3>Detalle de Devoluciones:</h3>
<table>
  <tr><th>Producto</th><th>Cantidad</th><th>Motivo</th><th>Monto</th></tr>
  <tr><td>Azúcar Estándar 50kg</td><td>2</td><td>Empaque roto</td><td>-$100.00</td></tr>
</table>

<p>Adjuntamos:</p>
<ul>
  <li>Estado de Cuenta detallado (PDF)</li>
  <li>Comprobante de pago</li>
</ul>

<p>Saludos cordiales,<br>
<strong>Departamento de Compras - ALMASA</strong></p>
```

---

## Beneficios

1. **Transparencia total**: El proveedor recibe documento oficial con todo el detalle
2. **Trazabilidad**: Queda registro del PDF enviado y los correos
3. **Profesionalismo**: PDF con formato corporativo (logo, colores institucionales)
4. **Reducción de disputas**: El proveedor sabe exactamente qué se recibió y qué se devolvió
5. **Eficiencia**: Un solo clic genera y envía todo automáticamente

---

## Datos Necesarios para el PDF

La información se obtiene de:
- `ordenes_compra`: folio, total, monto_devoluciones, total_ajustado
- `ordenes_compra_detalles`: productos con cantidades y precios
- `devoluciones_proveedor`: productos devueltos con motivos
- `proveedores`: nombre del proveedor

Todo esto ya está disponible en el contexto del `MarcarPagadoDialog`.

