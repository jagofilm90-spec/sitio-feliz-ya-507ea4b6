

# Plan: Notificación Automática con Datos Bancarios al Solicitar Depósito

## Situación Actual

Cuando se selecciona "Marcar como Reembolsado" en `CreditosPendientesPanel.tsx`:
- Solo actualiza el status del crédito a `"aplicado"`
- **NO** envía ningún correo al proveedor
- El proveedor no sabe a qué cuenta depositar

## Solución

Cuando se selecciona la opción de **depósito/reembolso**, el sistema enviará automáticamente un correo al proveedor con:
1. Los datos bancarios de ALMASA
2. El monto exacto a depositar
3. La referencia del crédito (OC origen)
4. La instrucción de enviar comprobante a `pagos@almasa.com.mx`

---

## Flujo Propuesto

```text
Usuario selecciona: "Marcar como Reembolsado"
                │
                ▼
┌────────────────────────────────────────────────────┐
│ Dialog de Confirmación (YA EXISTE)                 │
│                                                    │
│ "¿Confirmas que el proveedor reembolsó $4,000?"    │
│                                                    │
│ [x] ¿Ya depositó? (marcar como resuelto)           │
│ [ ] Solicitar depósito (enviar datos bancarios)   │
│                                                    │
│ [Cancelar] [Confirmar]                             │
└────────────────────────────────────────────────────┘
                │
                ▼
Si seleccionó "Solicitar depósito":
                │
                ▼
Sistema envía email automático al proveedor:
┌────────────────────────────────────────────────────┐
│ Asunto: 📋 Datos para Depósito/Transferencia -     │
│         Crédito Pendiente OC-202601-0005           │
│                                                    │
│ Estimado Proveedor X,                              │
│                                                    │
│ Le enviamos los datos bancarios para realizar      │
│ el depósito correspondiente al crédito pendiente:  │
│                                                    │
│ MONTO A DEPOSITAR: $4,000.00 MXN                   │
│ REFERENCIA: OC-202601-0005 / Faltante             │
│                                                    │
│ ════════════════════════════════════════════       │
│ DATOS BANCARIOS:                                   │
│ Beneficiario: ABARROTES LA MANITA, S.A. DE C.V.   │
│ Banco: BBVA BANCOMER, S.A.                         │
│ Sucursal: 0122 (Plaza Jamaica)                     │
│ Cuenta: 0442413388                                 │
│ CLABE: 012180004424133881                          │
│ ════════════════════════════════════════════       │
│                                                    │
│ ⚠️ IMPORTANTE: Una vez realizado el depósito,      │
│ favor de enviar el comprobante a:                  │
│ 📧 pagos@almasa.com.mx                             │
│                                                    │
│ Indicando como referencia: OC-202601-0005          │
└────────────────────────────────────────────────────┘
```

---

## Cambios Técnicos

### 1. Modificar `CreditosPendientesPanel.tsx`

Agregar opción para distinguir entre:
- **Ya depositó** → Solo marcar como resuelto
- **Solicitar depósito** → Marcar + enviar email con datos bancarios

```typescript
// Nuevo estado
const [solicitarDeposito, setSolicitarDeposito] = useState(false);

// En el dialog de confirmación, agregar opciones:
{tipoResolucion === "reembolso_efectivo" && (
  <div className="space-y-2 my-3">
    <label className="flex items-center gap-2">
      <input 
        type="radio" 
        name="tipoReembolso" 
        checked={!solicitarDeposito}
        onChange={() => setSolicitarDeposito(false)}
      />
      <span>El proveedor YA depositó</span>
    </label>
    <label className="flex items-center gap-2">
      <input 
        type="radio" 
        name="tipoReembolso" 
        checked={solicitarDeposito}
        onChange={() => setSolicitarDeposito(true)}
      />
      <span>Solicitar depósito (enviar datos bancarios por email)</span>
    </label>
  </div>
)}
```

### 2. Crear Edge Function: `notificar-solicitud-deposito`

Nueva función que envía email al proveedor con datos bancarios:

```typescript
// supabase/functions/notificar-solicitud-deposito/index.ts

const DATOS_BANCARIOS = {
  beneficiario: "ABARROTES LA MANITA, S.A. DE C.V.",
  banco: "BBVA BANCOMER, S.A.",
  plaza: "JAMAICA",
  sucursal: "0122",
  cuenta: "0442413388",
  clabe: "012180004424133881",
  emailPagos: "pagos@almasa.com.mx"
};

// Generar HTML del email
const emailBody = `
  <div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #1e40af;">📋 Datos para Depósito - Crédito Pendiente</h2>
    
    <p>Estimado <strong>${proveedorNombre}</strong>,</p>
    
    <p>Le enviamos los datos bancarios para realizar el depósito 
    correspondiente al siguiente crédito pendiente:</p>
    
    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; font-size: 18px;">
        <strong>MONTO A DEPOSITAR:</strong> 
        <span style="color: #b45309; font-size: 24px; font-weight: bold;">
          $${monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
        </span>
      </p>
      <p style="margin: 10px 0 0 0; color: #78350f;">
        <strong>Referencia:</strong> ${ocFolio} / ${productoNombre}
      </p>
    </div>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #374151;">🏦 DATOS BANCARIOS</h3>
      <table style="width: 100%;">
        <tr><td><strong>Beneficiario:</strong></td><td>${DATOS_BANCARIOS.beneficiario}</td></tr>
        <tr><td><strong>Banco:</strong></td><td>${DATOS_BANCARIOS.banco}</td></tr>
        <tr><td><strong>Sucursal:</strong></td><td>${DATOS_BANCARIOS.sucursal} (Plaza ${DATOS_BANCARIOS.plaza})</td></tr>
        <tr><td><strong>Cuenta:</strong></td><td style="font-family: monospace; font-size: 16px;">${DATOS_BANCARIOS.cuenta}</td></tr>
        <tr><td><strong>CLABE:</strong></td><td style="font-family: monospace; font-size: 16px; color: #1e40af;">${DATOS_BANCARIOS.clabe}</td></tr>
      </table>
    </div>
    
    <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626;">
      <p style="margin: 0;">
        ⚠️ <strong>IMPORTANTE:</strong> Una vez realizado el depósito o transferencia, 
        favor de enviar el comprobante a:
      </p>
      <p style="margin: 10px 0 0 0; font-size: 18px;">
        📧 <a href="mailto:${DATOS_BANCARIOS.emailPagos}" style="color: #dc2626;">
          ${DATOS_BANCARIOS.emailPagos}
        </a>
      </p>
      <p style="margin: 10px 0 0 0; color: #7f1d1d;">
        Indicando como referencia: <strong>${ocFolio}</strong>
      </p>
    </div>
    
    <p>Quedamos atentos a su comprobante.</p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #666; font-size: 12px;">
      Este es un correo automático del sistema de gestión de ALMASA.
    </p>
  </div>
`;
```

### 3. Flujo de Llamada

En `CreditosPendientesPanel.tsx`, modificar la mutación:

```typescript
const resolverCredito = useMutation({
  mutationFn: async ({ creditoId, tipo, notas, solicitarDeposito }: { 
    creditoId: string; 
    tipo: string; 
    notas: string;
    solicitarDeposito?: boolean;
  }) => {
    // Actualizar status del crédito
    const { error } = await supabase
      .from("proveedor_creditos_pendientes")
      .update({
        status: tipo === "cancelar" ? "cancelado" : 
                (solicitarDeposito ? "deposito_solicitado" : "aplicado"),
        tipo_resolucion: tipo,
        resolucion_notas: notas,
        fecha_aplicacion: new Date().toISOString(),
      })
      .eq("id", creditoId);

    if (error) throw error;

    // Si es reembolso Y se solicitó enviar datos bancarios
    if (tipo === "reembolso_efectivo" && solicitarDeposito) {
      // Obtener datos del crédito para el email
      const { data: credito } = await supabase
        .from("proveedor_creditos_pendientes")
        .select(`
          *, 
          proveedores (nombre, email, proveedor_contactos (email, proposito))
        `)
        .eq("id", creditoId)
        .single();

      if (credito) {
        await supabase.functions.invoke("notificar-solicitud-deposito", {
          body: {
            credito_id: creditoId,
            proveedor_id: credito.proveedor_id,
            proveedor_nombre: credito.proveedores?.nombre || credito.proveedor_nombre_manual,
            monto: credito.monto_total,
            producto_nombre: credito.producto_nombre,
            oc_folio: credito.ordenes_compra?.folio,
            motivo: credito.motivo
          }
        });
      }
    }
  },
  // ... resto igual
});
```

---

## Nuevo Status: "deposito_solicitado"

Agregar un status intermedio para cuando se envió el email pero aún no se confirma el pago:

| Status | Significado |
|--------|-------------|
| `pendiente` | Crédito sin resolver |
| `deposito_solicitado` | Se enviaron datos bancarios, esperando comprobante |
| `aplicado` | Crédito resuelto (pagado, repuesto o descontado) |
| `cancelado` | Crédito cancelado |

Esto permite ver en el panel qué créditos están "en proceso de cobro".

---

## Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `supabase/functions/notificar-solicitud-deposito/index.ts` | **Crear** | Edge function para enviar email con datos bancarios |
| `CreditosPendientesPanel.tsx` | **Modificar** | Agregar opciones y llamar edge function |
| `supabase/config.toml` | **Modificar** | Registrar nueva función |

---

## Vista Previa del Email

```text
┌──────────────────────────────────────────────────────────────┐
│ 📋 Datos para Depósito - Crédito Pendiente                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Estimado PROVEEDOR X,                                        │
│                                                              │
│ Le enviamos los datos bancarios para realizar el depósito:   │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ MONTO A DEPOSITAR: $4,000.00 MXN                        │ │
│ │ Referencia: OC-202601-0005 / Producto ABC               │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 🏦 DATOS BANCARIOS                                       │ │
│ │                                                          │ │
│ │ Beneficiario: ABARROTES LA MANITA, S.A. DE C.V.         │ │
│ │ Banco:        BBVA BANCOMER, S.A.                        │ │
│ │ Sucursal:     0122 (Plaza Jamaica)                       │ │
│ │ Cuenta:       0442413388                                 │ │
│ │ CLABE:        012180004424133881                         │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ⚠️ IMPORTANTE:                                               │
│ Una vez realizado el depósito, enviar comprobante a:         │
│ 📧 pagos@almasa.com.mx                                       │
│ Indicando referencia: OC-202601-0005                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Registro en correos_enviados

Cada email enviado se registrará en la tabla `correos_enviados` con:
- `tipo`: `"solicitud_deposito_credito"`
- `referencia_id`: ID del crédito
- `destinatario`: Email del proveedor
- `asunto`: "Datos para Depósito - Crédito Pendiente OC-XXXX"

Esto permite trazabilidad completa de cuándo se solicitó el depósito.

