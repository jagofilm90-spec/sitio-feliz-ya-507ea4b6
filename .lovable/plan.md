

# Plan: Vincular Facturas de Proveedores desde Correo CFDI

## Problema Actual

El flujo actual para registrar una factura de proveedor es:

```text
Proveedor envía factura XML/PDF
        ↓
Llega a cfd@almasa.com.mx
        ↓
Secretaria abre Outlook/Gmail
        ↓
Descarga el archivo adjunto
        ↓
Abre el ERP → Compras → OC → Facturas
        ↓
Sube el archivo manualmente
        ↓
Captura datos (folio, fecha, monto)
```

**Pasos manuales: 5-6**

## Solución Propuesta

Agregar un botón "Vincular Factura a OC" en la bandeja de correos cuando se está en la cuenta `cfd@almasa.com.mx`:

```text
Proveedor envía factura XML/PDF
        ↓
Llega a cfd@almasa.com.mx
        ↓
Secretaria ve el correo en ERP → Correos
        ↓
Click en "Vincular Factura" (nuevo botón)
        ↓
Sistema detecta OC por RFC/proveedor
        ↓
Secretaria confirma OC correcta
        ↓
Sistema descarga adjuntos y extrae datos
        ↓
Factura vinculada automáticamente
```

**Pasos manuales: 2-3**

---

## Componentes a Crear/Modificar

### 1. Nuevo Componente: `VincularFacturaDialog.tsx`

Un diálogo similar a `ProcesarPedidoDialog` pero para facturas:

```text
┌─────────────────────────────────────────────────────────────┐
│ 📄 Vincular Factura de Proveedor                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ De: facturacion@molinos-xyz.com                             │
│ Asunto: CFDI - Factura F-12345 ALMASA                       │
│                                                             │
│ Archivos adjuntos detectados:                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑ F-12345.xml  (12 KB) ← CFDI                          │ │
│ │ ☑ F-12345.pdf  (85 KB) ← Representación impresa        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Datos extraídos del XML:                    [Procesando...] │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ RFC Emisor:     MOL123456ABC                           │ │
│ │ Proveedor:      MOLINOS XYZ SA DE CV                   │ │
│ │ Folio:          F-12345                                │ │
│ │ Fecha:          25/01/2026                             │ │
│ │ Subtotal:       $45,000.00                             │ │
│ │ IVA:            $7,200.00                              │ │
│ │ Total:          $52,200.00                             │ │
│ │ UUID:           abc123-def456-...                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ OCs pendientes de este proveedor:                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ○ OC-202601-0034 | $52,000 | Recibida 23/01           │ │
│ │ ● OC-202601-0035 | $52,200 | Recibida 25/01  ← Match! │ │
│ │ ○ OC-202601-0038 | $18,500 | Parcial                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                              [Cancelar]  [Vincular Factura] │
└─────────────────────────────────────────────────────────────┘
```

### 2. Nueva Edge Function: `parse-cfdi-xml`

Extrae datos del XML CFDI:
- RFC del emisor
- Razón social
- Folio y serie
- Fecha de emisión
- Subtotal, IVA, IEPS, Total
- UUID (Timbre Fiscal)
- Lista de conceptos (productos)

### 3. Modificar `EmailDetailView.tsx`

Agregar botón condicional cuando:
- La cuenta actual es `cfd@almasa.com.mx`
- El correo tiene adjuntos `.xml` o `.pdf`

```typescript
{esCuentaCFDI && tieneAdjuntosFactura && (
  <Button onClick={() => setVincularFacturaOpen(true)}>
    <FileText className="h-4 w-4 mr-2" />
    Vincular Factura a OC
  </Button>
)}
```

---

## Flujo Técnico

```text
1. Usuario abre correo en cfd@almasa.com.mx
              │
              ▼
2. EmailDetailView detecta adjuntos XML/PDF
              │
              ▼
3. Muestra botón "Vincular Factura a OC"
              │
              ▼
4. Click → Abre VincularFacturaDialog
              │
              ▼
5. Sistema descarga adjunto XML vía gmail-api
              │
              ▼
6. Envía XML a parse-cfdi-xml (Edge Function)
              │
              ▼
7. Extrae: RFC, Folio, Fecha, Total, UUID, Productos
              │
              ▼
8. Busca proveedor por RFC en tabla proveedores
              │
              ▼
9. Lista OCs del proveedor con status recibida/parcial
              │
              ▼
10. Sugiere la OC con monto más cercano al Total
              │
              ▼
11. Usuario confirma OC
              │
              ▼
12. Sistema:
    - Descarga XML y PDF del correo
    - Sube archivos a bucket proveedor-facturas
    - Crea registro en proveedor_facturas
    - Vincula con OC seleccionada
    - Si diferencia > $1, marca requiere_conciliacion
              │
              ▼
13. Email marcado como "Procesado" (label o flag interno)
```

---

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/components/correos/VincularFacturaDialog.tsx` | Diálogo principal para vincular facturas |
| `supabase/functions/parse-cfdi-xml/index.ts` | Extrae datos del XML CFDI |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/correos/EmailDetailView.tsx` | Agregar botón "Vincular Factura" cuando es cuenta CFD |
| `supabase/config.toml` | Registrar nueva función parse-cfdi-xml |

---

## Datos a Extraer del CFDI (XML)

El XML CFDI tiene esta estructura:

```xml
<cfdi:Comprobante 
  Serie="F" 
  Folio="12345" 
  Fecha="2026-01-25T12:00:00"
  SubTotal="45000.00"
  Total="52200.00">
  
  <cfdi:Emisor 
    Rfc="MOL123456ABC" 
    Nombre="MOLINOS XYZ SA DE CV" 
    RegimenFiscal="601"/>
  
  <cfdi:Receptor 
    Rfc="AMA700701GI8" 
    Nombre="ABARROTES LA MANITA SA DE CV"/>
  
  <cfdi:Conceptos>
    <cfdi:Concepto 
      ClaveProdServ="10112301" 
      Cantidad="100" 
      ClaveUnidad="XBX"
      Descripcion="HARINA DE TRIGO"
      ValorUnitario="450.00"
      Importe="45000.00"/>
  </cfdi:Conceptos>
  
  <tfd:TimbreFiscalDigital 
    UUID="abc123-def456-ghi789"/>
    
</cfdi:Comprobante>
```

---

## Match Automático de OC

El sistema sugerirá automáticamente la OC más probable basándose en:

1. **RFC del proveedor** (match exacto)
2. **Monto similar** (tolerancia de $100 o 2%)
3. **Fecha de recepción reciente** (últimos 30 días)
4. **Status**: recibida, parcial o completada (no pagada)

---

## Beneficios

| Antes | Después |
|-------|---------|
| 5-6 pasos manuales | 2-3 clicks |
| Descargar archivo | Automático |
| Capturar folio manualmente | Extraído del XML |
| Capturar monto manualmente | Extraído del XML |
| Buscar OC correcta | Sugerida automáticamente |
| Posibles errores de captura | Datos del SAT (confiables) |

---

## Consideraciones

### Si el XML no viene adjunto
Algunos proveedores envían solo el PDF. En ese caso:
- Mostrar advertencia: "No se detectó XML CFDI"
- Permitir vincular solo el PDF
- Captura manual de folio/monto (como actualmente)

### Validación del UUID
El UUID del timbre fiscal es único y podría usarse para:
- Evitar duplicados (si ya existe una factura con ese UUID)
- Verificar autenticidad consultando al SAT (futuro)

### Marcar correo como procesado
Agregar label interno o guardar referencia en `proveedor_facturas.email_id` para saber qué correos ya fueron procesados.

