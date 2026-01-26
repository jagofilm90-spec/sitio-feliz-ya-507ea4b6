
# Plan: Separar Flujos de Notificación y Pago de OC

## Resumen del Cambio

Separar completamente el proceso de **notificación al proveedor** (solo devoluciones) del proceso de **pago interno** (monto calculado + comprobante).

**Flujo actual**: El proveedor recibe todo (productos recibidos, devoluciones, monto a pagar, estado de cuenta)

**Flujo nuevo**:
- **Al proveedor**: Solo notificación de devoluciones (qué productos se rechazaron y por qué)
- **Interno**: PDF con monto a pagar, botón para registrar pago, conciliación de montos

---

## Cambios Propuestos

### 1. Modificar `notificar-cierre-oc` para Solo Enviar Devoluciones

**Archivo**: `supabase/functions/notificar-cierre-oc/index.ts`

Cambiar el contenido del correo para que **solo incluya las devoluciones**, sin mostrar:
- Total original de la OC
- Total a pagar
- Productos recibidos correctamente

El correo al proveedor dirá algo como:
```
"Le notificamos que durante la recepción de la OC-XXXX 
los siguientes productos fueron devueltos:

- 2 x Azúcar (Empaque roto)
- 1 x Arroz (Calidad rechazada)

Esta notificación es para su registro. El ajuste 
correspondiente se aplicará al pago."
```

---

### 2. Nuevo Diálogo: "Procesar Pago de OC"

**Archivo**: `src/components/compras/ProcesarPagoOCDialog.tsx` (CREAR)

Diálogo interno para el departamento de Compras que muestra:
- Resumen de la OC (folio, proveedor, fecha)
- Tabla de productos recibidos con subtotales
- Tabla de devoluciones con descuentos
- **Monto Calculado a Pagar** (Total - Devoluciones)
- Botón para **Descargar PDF de Orden de Pago** (uso interno)
- Sección para subir comprobante de pago
- Campo para monto pagado (para conciliación)
- Botón "Marcar como Pagado"

```text
┌────────────────────────────────────────────────────────────────┐
│  PROCESAR PAGO - OC-202601-0003                                │
├────────────────────────────────────────────────────────────────┤
│  Proveedor: BODEGA AURRERA                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ RESUMEN FINANCIERO                                      │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Total Original:                          $60,000.00     │   │
│  │ (-) Devoluciones:                          -$100.00     │   │
│  │ ─────────────────────────────────────────────────────   │   │
│  │ MONTO A PAGAR:                           $59,900.00     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [📄 Descargar PDF Orden de Pago]                              │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                 │
│  REGISTRAR PAGO:                                               │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Monto Pagado:  [$59,900.00]                           │     │
│  │ Fecha de Pago: [26/01/2026]                           │     │
│  │ Referencia:    [Transferencia #12345]                 │     │
│  │ Comprobante:   [📎 Subir archivo]                     │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  ⚠️ El monto pagado debe coincidir con el monto calculado     │
│     para que la OC se marque como pagada correctamente.        │
│                                                                 │
│                          [Cancelar]  [✓ Confirmar Pago]        │
└────────────────────────────────────────────────────────────────┘
```

---

### 3. Nuevo Generador de PDF: "Orden de Pago Interno"

**Archivo**: `src/utils/ordenPagoPdfGenerator.ts` (CREAR)

PDF para uso interno (no se envía al proveedor) que incluye:
- Encabezado con logo ALMASA
- Datos de la OC y proveedor
- Tabla de productos recibidos
- Tabla de devoluciones
- **Monto a Pagar claramente destacado**
- Datos bancarios del proveedor (si los tiene)
- Espacio para referencia de pago

Este PDF se usa internamente para procesar el pago con el departamento de tesorería.

---

### 4. Agregar Icono "Procesar Pago" en Lista de OCs

**Archivo**: `src/components/compras/OrdenesCompraTab.tsx`

Agregar un nuevo botón/icono en cada OC cuando esté en status `completada` o `parcial`:

```typescript
// Nuevo icono al lado de los existentes
{(orden.status === 'completada' || orden.status === 'parcial') && 
 orden.status_pago !== 'pagado' && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => abrirProcesarPago(orden)}
    className="text-green-600 hover:text-green-700"
    title="Procesar Pago"
  >
    <CreditCard className="h-4 w-4" />
  </Button>
)}
```

También agregar un Badge visual que muestre el estado de pago:
- Verde: "Pagado"
- Amarillo: "Pago Pendiente"
- Rojo: "Con Devoluciones" (cuando hay monto_devoluciones > 0)

---

### 5. Actualizar `MarcarPagadoDialog` o Reemplazarlo

**Opción**: Modificar el existente `MarcarPagadoDialog.tsx` para que:
1. **NO envíe el Estado de Cuenta al proveedor** (quitar esa opción)
2. Solo registre el pago internamente
3. Valide que el monto pagado coincida con el monto calculado (con tolerancia de centavos)
4. Si hay devoluciones, pregunte si se desea notificar solo las devoluciones al proveedor

---

### 6. Flujo de Notificación de Devoluciones Separado

**Archivo**: `supabase/functions/notificar-devoluciones-proveedor/index.ts` (CREAR)

Nueva edge function dedicada **solo para notificar devoluciones**:

```typescript
// Solo envía al proveedor:
// - Lista de productos devueltos
// - Motivo de cada devolución
// - NO incluye montos ni totales

const emailBody = `
  Le notificamos que durante la recepción de la 
  Orden de Compra ${folio}, los siguientes productos 
  fueron devueltos:
  
  - 2 x Azúcar Estándar 50kg (Empaque roto)
  - 1 x Arroz Morelos (Calidad rechazada)
  
  Esta notificación es únicamente para su registro. 
  El ajuste correspondiente se aplicará al momento 
  del pago.
  
  Saludos,
  Departamento de Compras - ALMASA
`;
```

Esta notificación se dispara:
- Automáticamente al registrar devoluciones en almacén
- O manualmente desde el diálogo de pago

---

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/components/compras/ProcesarPagoOCDialog.tsx` | Nuevo diálogo para proceso interno de pago |
| `src/utils/ordenPagoPdfGenerator.ts` | Generador de PDF para orden de pago interna |
| `supabase/functions/notificar-devoluciones-proveedor/index.ts` | Edge function solo para notificar devoluciones |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/notificar-cierre-oc/index.ts` | Modificar para solo enviar devoluciones, sin montos |
| `src/components/compras/OrdenesCompraTab.tsx` | Agregar icono "Procesar Pago" en cada OC |
| `src/components/compras/MarcarPagadoDialog.tsx` | Quitar envío de estado de cuenta, solo registro interno |
| `supabase/config.toml` | Registrar nueva edge function |

---

## Flujo Visual Completo

```text
┌────────────────────────────────────────────────────────────────────┐
│                    ALMACÉN: Recepción de OC                        │
│                    ↓                                                │
│        Registra devoluciones (2 bultos rotos)                      │
│                    ↓                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ AUTOMÁTICO: Notificar SOLO devoluciones al proveedor        │   │
│  │ (Sin montos, sin totales, solo qué se devolvió y por qué)   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│                    COMPRAS: Menú de OCs                            │
│                    ↓                                                │
│        Ve OC con status "Completada" + badge "Pago Pendiente"      │
│                    ↓                                                │
│        Click en icono 💳 "Procesar Pago"                           │
│                    ↓                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ DIÁLOGO: Procesar Pago OC                                   │   │
│  │ - Muestra resumen: $60,000 - $100 = $59,900                 │   │
│  │ - [📄 Descargar PDF Orden de Pago] ← Para tesorería         │   │
│  │ - Ingresa monto pagado: $59,900                             │   │
│  │ - Sube comprobante de transferencia                         │   │
│  │ - [Confirmar Pago]                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                    ↓                                                │
│        OC se marca como "Pagada"                                   │
│        Monto pagado queda registrado para conciliación             │
└────────────────────────────────────────────────────────────────────┘
```

---

## Validación de Conciliación

Al confirmar el pago, el sistema verificará:

```typescript
const montoCalculado = orden.total_ajustado ?? orden.total;
const diferencia = Math.abs(montoPagado - montoCalculado);

if (diferencia > 0.02) { // Tolerancia de 2 centavos
  // Mostrar advertencia
  "El monto pagado ($59,800) no coincide con el calculado ($59,900). 
   Diferencia: $100.00
   ¿Desea continuar de todos modos?"
}
```

Esto garantiza que el pago cuadre con la OC y permite detectar errores antes de marcar como pagado.

---

## Beneficios

1. **Separación de responsabilidades**: El proveedor solo sabe qué se devolvió, no cuánto le van a pagar
2. **Control interno**: El cálculo del pago queda 100% interno
3. **PDF para tesorería**: Documento listo para procesar el pago
4. **Conciliación**: El monto pagado se registra y valida contra el calculado
5. **Trazabilidad**: Queda registro de quién procesó el pago y cuándo
