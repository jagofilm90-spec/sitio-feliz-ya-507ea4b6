

## Plan: 3 Critical Fixes for Warehouse Reception Module

### FIX 1 — Auto-notify Supplier on Total Rejection

**DB Migration:**
- Add `comprobante_recepcion_url` column to `ordenes_compra_entregas` (text, nullable) — needed for FIX 2

**File: `src/components/almacen/RegistrarLlegadaSheet.tsx`**

After the rechazo total flow completes (after uploading photos/firma, around line 371), add:

1. Fetch supplier contacts (`recibe_logistica` and `recibe_devoluciones`) from `proveedor_contactos`
2. Get rejection evidence signed URLs from storage
3. Build rejection email HTML with: folio, date/time, motivo label, almacenista name, chofer name, placas, evidence note
4. Send via Gmail API (`gmail-api` edge function) with evidence photos as attachments, to logistica contact, CC devoluciones contact
5. Register in `correos_enviados` via `registrarCorreoEnviado`
6. Send internal copies via `enviarCopiaInterna`
7. Insert in-app notification: `tipo: 'rechazo_entrega_total'`
8. Send push notification via `send-push-notification` to admin/secretaria roles

**File: `src/hooks/useNotificaciones.ts`**

- Add `notificacionesRechazo` to `NotificacionesData` interface
- Add `cargarNotificacionesRechazo()`: queries `notificaciones` WHERE `tipo = 'rechazo_entrega_total'` AND `leida = false`, admin+secretaria only
- Include in `cargarNotificaciones` Promise.all and totalCount

**File: `src/components/CentroNotificaciones.tsx`**

- Add `notificacionesRechazo` to destructured data
- Add to `computedCount`
- Add red-background section with `Ban` icon, click → `/compras?tab=devoluciones-faltantes`

---

### FIX 2 — Save Reception PDF Permanently

**File: `src/components/almacen/AlmacenRecepcionSheet.tsx`**

After PDF generation (line ~1481, after `pdfBase64Data` is ready), before sending email:

1. Convert base64 to Blob
2. Upload to storage: `recepciones-evidencias/comprobantes/{oc_id}/{entrega_id}/comprobante-recepcion-{folio}-{date}.pdf`
3. Get public/signed URL
4. Update `ordenes_compra_entregas` SET `comprobante_recepcion_url = url`

**File: `src/components/almacen/AlmacenRecepcionTab.tsx`**

- Add `comprobante_recepcion_url` to the query select
- In `EntregaCard`, add "Ver comprobante" button (FileText icon) when `comprobante_recepcion_url` exists, opens in new tab
- Only visible for completed receptions shown in the "completadas" section

**File: `src/components/compras/OrdenesCompraTab.tsx`** (or wherever OC detail is shown)

- Add "Ver comprobante" and "Regenerar PDF" buttons when viewing a completed OC's delivery detail
- "Regenerar PDF" calls `generarRecepcionPDFBase64` with data from DB, triggers direct download (admin/secretaria only)

---

### FIX 3 — Clearer Warehouse Panel

**File: `src/components/almacen/AlmacenRecepcionTab.tsx`**

Redesign the "Hoy" tab with three clearly separated sections:

**Section 1 — "Recepciones de hoy"** (always on top):
- Restyle `EntregaCard` to show status badges prominently: 🟡 ESPERANDO / 🟢 EN PROCESO / ✅ LISTA
- Show provider name + OC folio as card header
- Show "Entrega X de Y" + tipo_pago info
- Products list with quantities and units (already exists via `ProductosEntregaList`, keep it)
- Estimated totals: sum of bultos and estimated kg
- OC anticipada sin pagar: red badge "⚠️ OC anticipada sin pagar", disable "Registrar Llegada" button, show "Esperar autorización de secretaría" text
- Habilitada por secretaría: green badge "✅ Habilitada por secretaría"
- In-progress reception: show progress bar "X de Y productos recibidos", button text → "Continuar recepción"

**Section 2 — "Mañana — Prepararse"** (below):
- Query tomorrow's deliveries from `ordenes_compra_entregas` WHERE `fecha_programada = tomorrow`
- Compact collapsible list: provider name, OC folio, # products, estimated bultos
- Click expands to show product list (reuse `ProductosEntregaList`)
- No action buttons — read-only

**Section 3 — "Recepciones completadas hoy"** (collapsible at bottom):
- Query deliveries WHERE `status = 'recibida'` AND `fecha_entrega_real = today`
- Show: provider, folio, completion time
- Green "Completada" badge
- "Ver comprobante" button if `comprobante_recepcion_url` exists

The existing `ProximasEntregasTab` stays as a separate tab — unchanged.

---

### Technical Summary

**Migration (1):** Add `comprobante_recepcion_url` column to `ordenes_compra_entregas`

**Files modified (~5):**
- `RegistrarLlegadaSheet.tsx` — rejection email + notifications
- `AlmacenRecepcionSheet.tsx` — save PDF to storage after generation
- `AlmacenRecepcionTab.tsx` — redesigned panel with 3 sections + comprobante button
- `useNotificaciones.ts` — add `rechazo_entrega_total` type
- `CentroNotificaciones.tsx` — render rejection notifications

**No existing functionality removed.** All changes are additive or visual improvements to the existing layout.

