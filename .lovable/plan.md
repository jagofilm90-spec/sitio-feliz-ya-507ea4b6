

# Plan: Número de Talón para Vincular Recepciones con Facturas

## Situación Actual

Actualmente existe:
- Campo `numero_remision_proveedor` en recepciones
- Etiquetado como "Número de remisión"
- No hay lógica para extraer/vincular por número de talón

La factura de Azúcares Selectos muestra en **Observaciones**: `"Numero de talon: XXXX"` que es el identificador único que conecta la recepción física con la factura.

---

## Solución Propuesta

### 1. Agregar Campo "Número de Talón" en Recepciones

En `ordenes_compra_entregas`:
- Nuevo campo: `numero_talon` (varchar)
- El almacenista lo captura al finalizar la descarga
- Proveedores como Azúcares Selectos lo usan como referencia en su factura

### 2. Extraer Número de Talón del CFDI

Actualizar `parse-cfdi-xml` para extraer:
- `CondicionesDePago` (ya existe)
- **Nuevo**: Campo de observaciones del concepto o addenda
- Buscar patrones: `"talon"`, `"talón"`, `"ticket"`, `"remision"`

### 3. Match Automático por Número de Talón

En `VincularFacturaDialog`:
- Si el CFDI tiene observaciones con número de talón
- Buscar en `ordenes_compra_entregas.numero_talon`
- Match exacto = alta confianza de vinculación

---

## Flujo Completo

```text
ALMACÉN                           FACTURA
──────                            ───────
                                     
Recibe mercancía                 Proveedor genera factura
      │                                    │
      ▼                                    ▼
Captura "Número de Talón"        En Observaciones: "Talon: 19094"
      │                                    │
      ▼                                    ▼
Se guarda en BD                  Llega a cfd@almasa.com.mx
ordenes_compra_entregas                    │
.numero_talon = "19094"                    ▼
                                 Sistema extrae Observaciones
                                           │
                                           ▼
                                 Busca: "19094" en entregas
                                           │
                                           ▼
                                 Match automático OC correcta
```

---

## Cambios Técnicos

### 1. Migración de Base de Datos

```sql
-- Agregar campo numero_talon a entregas
ALTER TABLE ordenes_compra_entregas 
ADD COLUMN numero_talon VARCHAR(100);

-- Índice para búsqueda rápida
CREATE INDEX idx_entregas_numero_talon 
ON ordenes_compra_entregas(numero_talon) 
WHERE numero_talon IS NOT NULL;
```

### 2. Modificar Recepción (`AlmacenRecepcionSheet.tsx`)

Cambiar el campo existente de "Número de remisión" a "Número de Talón" o agregar un campo adicional si ambos son necesarios.

```typescript
// Estado para el nuevo campo
const [numeroTalon, setNumeroTalon] = useState("");

// En el formulario:
<div className="space-y-2">
  <Label>Número de Talón</Label>
  <Input
    value={numeroTalon}
    onChange={(e) => setNumeroTalon(e.target.value)}
    placeholder="Ej: 19094 (viene en el documento del proveedor)"
  />
  <span className="text-xs text-muted-foreground">
    Este número debe coincidir con las Observaciones de la factura
  </span>
</div>

// Al guardar:
const updateEntrega = {
  ...
  numero_talon: numeroTalon.trim() || null,
};
```

### 3. Actualizar `parse-cfdi-xml` para extraer observaciones

El número de talón puede aparecer en varios lugares del CFDI:
- `CondicionesDePago` del Comprobante
- Campo `Descripcion` de los Conceptos
- Addenda (extensiones propietarias)

```typescript
// Agregar a CFDIData interface
observaciones?: string;
numeroTalonExtraido?: string;

// En parseCFDI function:
// Extraer CondicionesDePago (ya existe)
const condiciones = extractAttribute(comprobanteTag, 'CondicionesDePago');

// Buscar patrón de talón en condiciones o conceptos
const talonPatterns = [
  /tal[oó]n[:\s]*(\d+)/i,
  /ticket[:\s]*(\d+)/i,
  /ref(?:erencia)?[:\s]*(\d+)/i,
];

let numeroTalon = null;
const textosBusqueda = [
  condiciones,
  ...result.conceptos.map(c => c.descripcion),
].filter(Boolean).join(' ');

for (const pattern of talonPatterns) {
  const match = textosBusqueda.match(pattern);
  if (match) {
    numeroTalon = match[1];
    break;
  }
}

result.observaciones = condiciones || '';
result.numeroTalonExtraido = numeroTalon;
```

### 4. Actualizar `VincularFacturaDialog.tsx`

Agregar lógica de match por talón además del match por monto:

```typescript
// Buscar OC por número de talón si está disponible
const { data: entregaPorTalon } = useQuery({
  queryKey: ["entrega-por-talon", cfdiData?.numeroTalonExtraido],
  queryFn: async () => {
    if (!cfdiData?.numeroTalonExtraido) return null;
    
    const { data } = await supabase
      .from("ordenes_compra_entregas")
      .select(`
        id, numero_talon,
        orden_compra:ordenes_compra (
          id, folio, total, total_ajustado, status, proveedor_id,
          proveedores (nombre, rfc)
        )
      `)
      .eq("numero_talon", cfdiData.numeroTalonExtraido)
      .eq("status", "recibida")
      .maybeSingle();
    
    return data;
  },
  enabled: !!cfdiData?.numeroTalonExtraido,
});

// En el UI:
{entregaPorTalon && (
  <Alert className="border-green-500 bg-green-50">
    <CheckCircle className="h-4 w-4 text-green-600" />
    <AlertDescription className="text-green-800">
      <strong>Match por Número de Talón:</strong> La factura menciona 
      talón "{cfdiData.numeroTalonExtraido}" que coincide con la recepción de la OC 
      <strong>{entregaPorTalon.orden_compra.folio}</strong>
    </AlertDescription>
  </Alert>
)}
```

---

## UI de Recepción Actualizada

```text
┌────────────────────────────────────────────────────────┐
│ 📄 Documento del Proveedor                              │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Número de Remisión          Número de Talón            │
│ ┌────────────────────┐      ┌────────────────────┐     │
│ │ REM-2025-001234    │      │ 19094              │     │
│ └────────────────────┘      └────────────────────┘     │
│                             ℹ️ Coincidirá con la       │
│                             factura del proveedor      │
│                                                        │
│ 📷 Foto de la remisión                                 │
│ ┌─────────┐                                            │
│ │         │ [Tomar foto]                               │
│ └─────────┘                                            │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## UI del Dialog de Vincular Factura

Cuando hay match por talón:

```text
┌─────────────────────────────────────────────────────────┐
│ 📄 Vincular Factura de Proveedor                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ✅ MATCH POR NÚMERO DE TALÓN                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ La factura menciona: "Talon: 19094"                 │ │
│ │ Que coincide con la recepción de OC-202501-0034     │ │
│ │ Recibida el 28/01/2026                              │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Datos del CFDI:                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Emisor: AZUCARES SELECTOS DE MEXICO SA DE CV        │ │
│ │ RFC:    ASM020712PX7                                │ │
│ │ Folio:  DT-19094                                    │ │
│ │ Total:  $534,000.00                                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ OC Sugerida:                                            │
│ ● OC-202501-0034 | $534,000 | Recibida ← Match!        │
│                                                         │
│                          [Cancelar] [Vincular Factura]  │
└─────────────────────────────────────────────────────────┘
```

---

## Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| Migración SQL | **Crear** | Agregar columna `numero_talon` |
| `AlmacenRecepcionSheet.tsx` | **Modificar** | Agregar campo de captura de talón |
| `parse-cfdi-xml/index.ts` | **Modificar** | Extraer observaciones y número de talón |
| `VincularFacturaDialog.tsx` | **Modificar** | Match por número de talón |

---

## Consideraciones

### Compatibilidad con Proveedores

No todos los proveedores usan número de talón:
- Si no hay talón en la recepción → vinculación normal por monto/RFC
- Si no hay talón en la factura → vinculación normal
- Si ambos tienen talón → prioridad al match exacto

### Formato del Talón

El talón puede venir en diferentes formatos:
- Solo números: `19094`
- Con prefijo: `DT-19094` (como en el folio de Azúcares)
- Con texto: `"Observaciones: Numero de talon 19094"`

El sistema debe extraer solo los dígitos para comparación.

### Campo Opcional

El número de talón será opcional en la recepción para no afectar a proveedores que no lo usan.

