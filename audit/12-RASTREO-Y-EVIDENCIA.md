# Rastreo y Evidencia — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría de evidencia + decisiones operativas + metodología "Pensar como Oracle"  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** Capturar verdad operativa con respeto a la privacidad.

---

## 1. La filosofía

ALMASA-OS opera en el mundo real: bodegas con polvo, choferes en colonias 
sin señal, vendedores en mercados, clientes que firman con prisa. Cada 
acción crítica deja una huella digital o no la deja.

Si no la deja, eventualmente vendrá una disputa, una auditoría del SAT, 
un juicio laboral, o simplemente una duda interna. Sin evidencia: 
palabra contra palabra.

> Principio rector: "Captura cuando hay riesgo. Confía cuando no lo hay."

Este documento define:
- Qué se captura como evidencia
- Cómo se garantiza inmutabilidad
- Cómo se balancea trazabilidad con privacidad
- Cómo se cumplen requisitos legales (SAT, laborales)
- Cómo se modela la realidad de pesaje industrial de ALMASA

---

## 2. Estado actual de evidencia

ALMASA-OS tiene infraestructura de evidencia importante. Inventario:

| Capacidad | Estado | Detalle |
|-----------|--------|---------|
| Tablas de evidencia | ✅ 3 dedicadas | recepciones, carga, devoluciones |
| Storage buckets | ✅ 7 organizados | recepciones, empleados, vehículos, etc. |
| Firmas digitales | ✅ 10+ contextos | canvas touch, base64 PNG |
| GPS background | ✅ Schedule-aware | Lun-Vie 8am-8pm, 30s interval |
| Timestamps | ✅ Ubicuos | DEFAULT now() en todas las tablas |
| CFDI compliance | ✅ Completo | 5 edge functions fiscales |
| Detección bodega | ✅ WiFi+GPS | Auto-detect activo |
| Metadata IP | 🟡 Parcial | Solo en pedidos vendedor |
| Hashes inmutables | ❌ NO existen | Cero sha256/md5 en codebase |
| Cycle counting | ❌ NO existe | Sin tabla ni UI |
| Audit log global | ❌ NO existe | 8 tablas dispersas |
| Retention policy | ❌ NO existe | Sin auto-archivado |
| Modelo báscula | ❌ NO existe | Solo número, sin estructura |
| Sistema de tara | ❌ NO existe | Algunos productos lo requieren |
| Cadena de custodia | ❌ NO existe | Concepto formal ausente |

**Hallazgo crítico:** Las firmas digitales actuales NO son legalmente 
válidas en juicio mexicano. Faltan: hash + IP + device info + consentimiento.

---

## 3. Estándar Oracle / SAP / NetSuite

7 conceptos universales:
1. Inmutabilidad (hash + signature)
2. Metadata automática (usuario, GPS, IP, device)
3. Vinculación contextual
4. Almacenamiento seguro
5. Validación legal
6. Visibilidad controlada
7. Retention policy

**Oracle Transportation:** ePOD obligatorio, geofencing, document vault.
**SAP Transportation:** Track and trace, eventos por waypoint.
**NetSuite Inventory:** Bin tracking, lot/serial, cycle counting.

---

## 4. Por qué ALMASA-OS gana

| Dimensión | Oracle/SAP | ALMASA-OS | Ganador |
|-----------|-----------|-----------|---------|
| Hash inmutable | ✅ | ❌ → planeado | ORACLE |
| GPS schedule-aware | ❌ | ✅ | ALMASA |
| Detección bodega auto | ❌ | ✅ WiFi+GPS | ALMASA |
| Modelo báscula industrial | ❌ | ✅ ÚNICO | ALMASA |
| Sistema tara opcional | ❌ | ✅ ÚNICO | ALMASA |
| Audit log global | ✅ | ❌ → planeado | ORACLE |
| Compliance SAT MX | 🟡 general | ✅ específico | ALMASA |
| Costo licencia | $$$$ | $0 | ALMASA |

ALMASA tendrá modelo único de pesaje y tara que Oracle/SAP no modelan.

---

## 5. Las 6 Brechas Críticas

### Brecha 1 — Hashes Criptográficos (URGENTE LEGAL)

**Problema:** Sin hash, las evidencias actuales NO son legalmente 
irrefutables.

**Solución:**

```typescript
async function captureEvidence(file: File, contexto: object) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const metadata = {
    timestamp_servidor: new Date().toISOString(),
    usuario_id: currentUser.id,
    ip_address: await fetchPublicIP(),
    user_agent: navigator.userAgent,
    gps: await getCurrentPosition(),
    contexto: contexto
  };
  
  const path = await uploadToStorage(file);
  
  await supabase.from('evidencias').insert({
    ruta_storage: path,
    hash_sha256: hashHex,
    metadata: metadata
  });
}
```

**Impacto:** ALTO (validez legal)  
**Esfuerzo:** 1 semana  
**Prioridad:** CRÍTICA

### Brecha 2 — Sistema de Básculas Industriales con Sesiones de Pesada

**Realidad operativa de ALMASA:**

3 básculas industriales en 2 bodegas:

```
BODEGA 1 (B1):
   - Báscula 1A: capacidad 1 ton
   - Báscula 1B: capacidad 2 ton

BODEGA 2 (B2):
   - Báscula 2A: capacidad 1 ton
```

**Reglas de negocio:**

1. **NO mezclar básculas:** Si una carga requiere múltiples pesadas, 
   TODAS van en la MISMA báscula. Razón: cada báscula tiene calibración 
   propia. Mezclar = diferencia acumulada = pérdida.

2. **Almacenista decide bultos por pesada:** Si son 100 sacos en 
   báscula de 1 ton, puede pesar 25-25-25-25 o como decida.

3. **Capacidad respetada:** Sistema valida que cada pesada NO exceda 
   capacidad de báscula.

4. **Configuración modificable:** Admin puede agregar/editar/desactivar 
   básculas desde UI.

**Modelo de datos (3 tablas):**

```sql
CREATE TABLE basculas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  bodega_id UUID NOT NULL,
  capacidad_kg NUMERIC NOT NULL,
  ubicacion TEXT,
  activa BOOLEAN DEFAULT true,
  fecha_calibracion DATE,
  proxima_calibracion DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sesiones_pesada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID NOT NULL,
  bascula_id UUID NOT NULL REFERENCES basculas(id),
  almacenista_id UUID NOT NULL,
  num_pesadas_realizadas INTEGER DEFAULT 0,
  total_bultos_pesados INTEGER DEFAULT 0,
  peso_bruto_total_kg NUMERIC DEFAULT 0,
  tara_total_kg NUMERIC DEFAULT 0,
  peso_neto_total_kg NUMERIC GENERATED ALWAYS AS 
    (peso_bruto_total_kg - tara_total_kg) STORED,
  peso_estimado_total_kg NUMERIC NOT NULL,
  diferencia_kg NUMERIC GENERATED ALWAYS AS 
    ((peso_bruto_total_kg - tara_total_kg) - peso_estimado_total_kg) STORED,
  decision_final TEXT CHECK (decision_final IN 
    ('cobrar_real', 'redondear_arriba', 'ajustar_carga')),
  motivo_decision TEXT,
  foto_url TEXT,
  foto_hash_sha256 TEXT,
  estado TEXT DEFAULT 'en_proceso',
  timestamp_inicio TIMESTAMPTZ DEFAULT now(),
  timestamp_fin TIMESTAMPTZ
);

CREATE TABLE pesadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_pesada_id UUID NOT NULL REFERENCES sesiones_pesada(id) ON DELETE CASCADE,
  numero_pesada INTEGER NOT NULL,
  bultos_en_pesada INTEGER NOT NULL,
  peso_bruto_kg NUMERIC NOT NULL,
  tara_aplicada_kg NUMERIC DEFAULT 0,
  peso_neto_kg NUMERIC GENERATED ALWAYS AS 
    (peso_bruto_kg - tara_aplicada_kg) STORED,
  modo_tara TEXT DEFAULT 'sin_tara' CHECK (modo_tara IN 
    ('sin_tara', 'automatica', 'manual')),
  motivo_tara_manual TEXT,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  capturado_por UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Trigger validar capacidad
CREATE OR REPLACE FUNCTION validar_capacidad_bascula()
RETURNS TRIGGER AS $$
DECLARE
  capacidad NUMERIC;
BEGIN
  SELECT b.capacidad_kg INTO capacidad
  FROM sesiones_pesada sp
  JOIN basculas b ON b.id = sp.bascula_id
  WHERE sp.id = NEW.sesion_pesada_id;
  
  IF NEW.peso_bruto_kg > capacidad THEN
    RAISE EXCEPTION 'Peso bruto excede capacidad (% kg > % kg)', 
      NEW.peso_bruto_kg, capacidad;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_capacidad
BEFORE INSERT ON pesadas
FOR EACH ROW EXECUTE FUNCTION validar_capacidad_bascula();
```

**Foto inteligente (a nivel sesión):**

Sistema FUERZA foto cuando:
- |diferencia_pct| > 3%
- decision_final = 'redondear_arriba'
- valor pesada > $20,000 MXN

**Impacto:** ALTO (alinea con rediseño Inventario)  
**Esfuerzo:** 2 semanas  
**Prioridad:** CRÍTICA

### Brecha 2.1 — Sistema de Tara Opcional por Producto

**Realidad operativa de ALMASA:**

La MAYORÍA de productos NO requieren descontar tara:
- Sacos de azúcar 50kg: saco pesa nada relevante
- Sacos de granos: igual
- Bultos a granel

ALGUNOS POCOS productos SÍ requieren:
- Productos en cubetas pesadas
- Productos en cajas con envase grueso
- Casos especiales

**Filosofía:** Tara es EXCEPCIÓN, no regla. La app no debe 
agregar fricción para el 99% de productos.

**Modelo:**

```sql
ALTER TABLE productos ADD COLUMN requiere_tara BOOLEAN DEFAULT false;
ALTER TABLE productos ADD COLUMN tara_kg NUMERIC; -- NULL si no aplica
ALTER TABLE productos ADD COLUMN nota_tara TEXT;

-- Ejemplos:
UPDATE productos 
SET requiere_tara = false 
WHERE codigo IN ('AZ50', 'AL25', 'HA50'); -- mayoría

UPDATE productos 
SET requiere_tara = true, 
    tara_kg = 1.5,
    nota_tara = 'Cubeta plástica 19L'
WHERE codigo = 'AC19';
```

**Comportamiento UI:**

Para productos SIN tara (default):
```
┌─────────────────────────────────────┐
│ PESADA #1                           │
│ Bultos: [25]                        │
│ Peso en báscula: [625 kg]           │
│                                     │
│ [Confirmar Pesada]                  │
└─────────────────────────────────────┘
```

Para productos CON tara:
```
┌─────────────────────────────────────┐
│ PESADA #1                           │
│ Producto requiere descontar tara    │
│                                     │
│ Bultos: [25]                        │
│ Peso BRUTO en báscula: [625 kg]     │
│                                     │
│ Tara: 25 x 1.5 = 37.5 kg           │
│ * Usar tara estándar                │
│   Ajustar manualmente: [____] kg    │
│                                     │
│ Peso NETO: 625 - 37.5 = 587.5 kg   │
│                                     │
│ [Confirmar Pesada]                  │
└─────────────────────────────────────┘
```

**Reglas de tara:**

1. **Default:** requiere_tara = false (mayoría de productos)
2. **Admin marca productos** con tara desde catálogo
3. **App detecta automáticamente** si producto requiere tara
4. **Tara automática** = bultos x tara_unitaria
5. **Override manual** disponible siempre con motivo
6. **Aplica en recepción Y en salida** (mismas reglas)

**Impacto:** MEDIO  
**Esfuerzo:** 3-5 días  
**Prioridad:** IMPORTANTE (junto con báscula)

### Brecha 3 — Cycle Counting Móvil
(Ya documentado en /audit/08 Cambio 6)
**Esfuerzo:** 2-3 semanas

### Brecha 4 — Audit Log Global
(Ya documentado en /audit/11 Brecha 3)
**Esfuerzo:** 1-2 semanas

### Brecha 5 — Política de Tracking GPS Formal

**Solución:**
- Cláusula en contrato laboral (autorización GPS)
- Política escrita pública
- Borrado al dar de baja (90 días anonimización)
- Endpoint para empleado ver sus datos

**Impacto:** ALTO (legal laboral)  
**Esfuerzo:** 1 semana

### Brecha 6 — Retention Policy Automatizada

| Tipo dato | Retención |
|-----------|-----------|
| CFDI / fiscal | 7 años |
| Operacional crítico | 5 años |
| Operacional normal | 2 años |
| GPS chofer | 1 año |
| Logs | 30-90 días |

**Esfuerzo:** 1-2 semanas

---

## 6. ePOD - Decisión: SOLO FIRMA

Foto del cliente NO obligatoria. Firma del chofer suficiente.

---

## 7. Patrón Unificado: EvidenceCapture

```typescript
<EvidenceCapture
  contexto={{ pedido_id, cliente_id }}
  tipo="entrega_cliente"
  reglasAutomaticas={[
    { condicion: 'monto > 20000', requiereFoto: true }
  ]}
  onCaptured={(evidencia) => {
    // hash, gps, timestamp, usuario, ip incluidos
  }}
/>
```

---

## 8. Roadmap

| Mes | Entregas |
|-----|----------|
| Mayo | /audit/12 generado |
| Junio | Brecha 1 (hashes) + Brecha 5 (política GPS) |
| Julio | Brecha 2 (báscula + tara opcional) |
| Agosto | Brecha 3 (cycle counting) + Brecha 4 (audit log) |
| Septiembre | Patrón unificado EvidenceCapture |
| Octubre-Noviembre | Brecha 6 (retention) + validación legal |

**Tiempo total:** 6-7 meses  
**Inversión:** $0 software + $5K-10K MXN abogado laboral

---

## 9. Decisiones de Negocio Pendientes

1. Productos específicos que requieren tara (ALMASA define)
2. Calibración básculas (cada 6 meses o anual)
3. Umbral foto báscula (3% propuesto)
4. Política retención específica
5. Borrado al dar de baja (90 días anonimización)
6. Tipo de envases estándar para tara

---

## 10. Conexión con Biblia v1.1

- Principio #1 (Privacidad): hashes + tracking respetuoso
- Principio #4 (CPP real): hashes garantizan veracidad costos
- Principio #6 (Doble Unidad): pesada por lote + tara opcional

**Nuevo Principio Propuesto:** TRAZABILIDAD GRADUADA
"Captura cuando hay riesgo. Confía cuando no lo hay.
La fricción operativa es enemiga de la adopción."

---

## 11. Recomendación final

ALMASA-OS tendrá **modelo único de báscula y tara que Oracle/SAP NO 
modelan**. Es ventaja competitiva real para mayoreo de abarrotes.

**Orden estricto:**
1. JUNIO: Hashes + Política GPS (URGENTE legal)
2. JULIO: Báscula dual + Tara opcional (alinea con Inventario)
3. AGOSTO: Cycle counting + Audit log
4. SEPTIEMBRE: Patrón unificado
5. OCTUBRE-NOVIEMBRE: Retention + validación legal

---

*ALMASA-OS · Rastreo y Evidencia · v1.0*  
*Generado el 10 de mayo de 2026*  
*Capturar verdad operativa con respeto a la privacidad.*
