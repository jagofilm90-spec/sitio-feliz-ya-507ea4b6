
# Plan: Rediseño Profesional de PDFs de OC

## Análisis del Estado Actual

Los PDFs de **Orden de Pago** y **Cierre de OC** tienen un diseño funcional pero básico comparado con el de Cotizaciones que es más profesional. Voy a aplicar las mejores prácticas del PDF de Cotizaciones:

| Elemento | Actual | Propuesto |
|----------|--------|-----------|
| Header | Barra roja simple + logo pequeño | Header con gradiente visual + logo + badge prominente |
| Tipografía | Tamaños inconsistentes | Jerarquía clara con pesos y tamaños definidos |
| Espaciado | Muy comprimido | Más aire, secciones bien diferenciadas |
| Cajas de datos | Bordes grises planos | Bordes redondeados con sombras sutiles |
| Resumen financiero | Caja verde básica | Panel destacado con iconografía y mejor estructura |
| Tablas | Headers grises genéricos | Headers con colores semánticos (verde=recibido, rojo=devolución) |
| Footer | Solo fecha de generación | Footer corporativo completo con contacto |

## Cambios Visuales Propuestos

### 1. Orden de Pago (`ordenPagoPdfGenerator.ts`)

**Header Mejorado:**
```text
┌─────────────────────────────────────────────────────────────────┐
│ ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄ BARRA ROJA ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄ │
├─────────────────────────────────────────────────────────────────┤
│  [LOGO]                                    ┌─────────────────┐  │
│  ALMASA                                    │  ORDEN DE PAGO  │  │
│  ABARROTES LA MANITA, S.A. DE C.V.         │ DOCUMENTO INTERNO│  │
│                                            └─────────────────┘  │
│  RFC: AMA700701GI8                         Folio: OC-2025-0042  │
│  Tel: 55 5552-0168                         Fecha: 29/01/2026   │
└─────────────────────────────────────────────────────────────────┘
```

**Panel de Resumen Financiero (más prominente):**
```text
┌─────────────────────────────────────────────────────────────────┐
│  💰 RESUMEN FINANCIERO                                          │
├─────────────────────────────────────────────────────────────────┤
│  Total Original:                              $125,450.00       │
│  (-) Devoluciones:                             -$3,200.00       │
│  ────────────────────────────────────────────────────────────   │
│  ✓ MONTO A PAGAR                            $122,250.00        │
└─────────────────────────────────────────────────────────────────┘
  (Panel verde con borde grueso y tipografía grande)
```

**Datos Bancarios del Proveedor (más visual):**
```text
┌─────────────────────────────────────────────────────────────────┐
│  🏦 DATOS BANCARIOS DEL PROVEEDOR                               │
├────────────────────────────┬────────────────────────────────────┤
│  Beneficiario:             │  PROVEEDOR EJEMPLO, S.A.           │
│  Banco:                    │  BBVA BANCOMER                     │
│  Cuenta:                   │  0123456789                        │
│  CLABE:                    │  012180001234567891                │
└────────────────────────────┴────────────────────────────────────┘
  (Panel azul claro con iconografía)
```

**Footer Profesional:**
```text
────────────────────────────────────────────────────────────────
        ABARROTES LA MANITA, S.A. DE C.V.
        compras@almasa.com.mx | Tel: 55 5552-0168
        Documento generado el 29/01/2026 10:30 - USO INTERNO
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄ BARRA ROJA ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
```

### 2. Cierre de OC / Estado de Cuenta (`cierreOCPdfGenerator.ts`)

**Mismas mejoras de header y footer, más:**

**Tabla de Productos con mejor contraste:**
- Header verde oscuro (#228B22) para productos recibidos
- Header rojo (#B41E1E) para devoluciones
- Filas zebra con colores más suaves
- Subtotales en paneles coloreados

**Panel de Totales más impactante:**
```text
┌─────────────────────────────────────────────────────────────────┐
│  📊 RESUMEN DE OPERACIÓN                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Total Productos:    $128,650.00       ┌───────────────────┐   │
│   (-) Devoluciones:    -$6,400.00       │ TOTAL A PAGAR     │   │
│   ──────────────────────────────        │ $122,250.00       │   │
│                                         └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
  (Monto destacado en badge rojo con tipografía grande)
```

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/utils/ordenPagoPdfGenerator.ts` | Rediseño completo del layout |
| `src/utils/cierreOCPdfGenerator.ts` | Rediseño completo del layout |

## Mejoras Técnicas Específicas

### Paleta de Colores Unificada
```typescript
const COLORS = {
  brandRed: { r: 139, g: 35, b: 50 },      // Rojo Almasa
  success: { r: 34, g: 139, b: 34 },       // Verde para montos
  accent: { r: 70, g: 130, b: 180 },       // Azul para datos
  dark: { r: 33, g: 37, b: 41 },           // Texto principal
  gray: { r: 100, g: 100, b: 100 },        // Texto secundario
  lightBg: { r: 248, g: 248, b: 248 },     // Fondos claros
  successBg: { r: 240, g: 255, b: 240 },   // Fondo verde claro
  dangerBg: { r: 255, g: 240, b: 240 },    // Fondo rojo claro
  infoBg: { r: 240, g: 248, b: 255 },      // Fondo azul claro
};
```

### Nuevos Elementos Visuales
1. **Badges redondeados** para folio y estados
2. **Iconografía** con emojis para secciones (💰🏦📊📝)
3. **Líneas separadoras** con gradiente visual
4. **Paneles con sombras** usando doble borde
5. **Footer corporativo** con información de contacto
6. **Mejor espaciado** entre secciones (+40% más aire)

### Estructura del Header Unificada
```typescript
const drawProfessionalHeader = async (doc: jsPDF, title: string, subtitle: string) => {
  // Barra superior roja
  doc.setFillColor(139, 35, 50);
  doc.rect(0, 0, 210, 10, "F");
  
  // Logo con más espacio
  const logoBase64 = await loadImageAsBase64('/logo-almasa-pdf.png');
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 15, 15, 45, 16);
  }
  
  // Badge del documento (derecha)
  doc.setFillColor(139, 35, 50);
  doc.roundedRect(130, 14, 65, 14, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, 162.5, 23, { align: "center" });
  
  // Datos de empresa
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("ABARROTES LA MANITA, S.A. DE C.V.", 15, 38);
  doc.text(`RFC: ${COMPANY_DATA.rfc} | Tel: ${COMPANY_DATA.telefonos.principal}`, 15, 43);
  
  // Línea separadora elegante
  doc.setDrawColor(139, 35, 50);
  doc.setLineWidth(0.8);
  doc.line(15, 48, 195, 48);
};
```

### Footer Corporativo
```typescript
const drawProfessionalFooter = (doc: jsPDF) => {
  const pageHeight = doc.internal.pageSize.height;
  
  // Línea separadora
  doc.setDrawColor(139, 35, 50);
  doc.setLineWidth(0.5);
  doc.line(40, pageHeight - 25, 170, pageHeight - 25);
  
  // Datos de empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(33, 37, 41);
  doc.text(COMPANY_DATA.razonSocialLarga, 105, pageHeight - 20, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`${COMPANY_DATA.emails.compras} | Tel: ${COMPANY_DATA.telefonos.principal}`, 105, pageHeight - 15, { align: "center" });
  
  // Fecha de generación
  const fecha = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
  doc.text(`Documento generado el ${fecha}`, 105, pageHeight - 10, { align: "center" });
  
  // Barra inferior
  doc.setFillColor(139, 35, 50);
  doc.rect(0, pageHeight - 6, 210, 6, "F");
};
```

## Resultado Esperado

- PDFs con apariencia ejecutiva y profesional
- Consistencia visual con el PDF de Cotizaciones
- Mejor legibilidad y jerarquía de información
- Información de contacto corporativo visible
- Montos destacados y fáciles de identificar
- Datos bancarios claros para facilitar pagos
