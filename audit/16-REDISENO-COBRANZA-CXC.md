# Rediseño de Cobranza / CXC — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría de cobranza + decisiones operativas + metodología "Pensar como Oracle"  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** Sistema firme, tono respetuoso. ALMASA acompaña al admin, no presiona al cliente.

---

## 1. La filosofía

Cobrar no es opcional, pero la cobranza en mayoreo abarrotero mexicano 
es DIFERENTE a Oracle/SAP. Aquí los clientes son relaciones de años: 
amigos, compadres, conocidos generacionales. Algunos deben millones 
y van pagando con confianza mutua. Otros son comerciales con flujo 
estándar.

ALMASA-OS NO debe presionar a clientes amigos. NO debe mandar 
mensajes legales. NO debe simular ser un cobrador externo.

ALMASA-OS DEBE ser asistente del admin: darle visibilidad total, 
permitir decisiones humanas, mandar SOLO recordatorios cordiales 
cuando el admin lo autorice por cliente.

> Principio rector: "Sistema firme con datos, tono respetuoso con 
> clientes. El admin siempre decide. El sistema acompaña, no presiona."

Este documento define:
- Cómo el ADMIN tiene visibilidad total (dashboard ejecutivo)
- Cómo el ADMIN configura recordatorios POR CLIENTE
- Cómo el sistema manda mensajes SOLO informativos (sin presión)
- Cómo se registran conversaciones humanas (notas)

---

## 2. Estado actual de cobranza

ALMASA-OS Cobranza es MUCHO más completo de lo aparente:

- 5 archivos en /components/cobranza (~2,025 líneas)
- 3 tablas dedicadas
- creditoUtils.ts con 5 plazos + 6 estados
- Edge function check-invoice-expiry-reminders
- Portal cliente con estado de cuenta
- Vista vendedor con cobranza + saldos
- Dashboard CobranzaCriticaPanel para morosos

| Capacidad | Estado | Detalle |
|-----------|--------|---------|
| Tabla cobros/pagos | ✅ 3 tablas | cobros_pedido + pagos_cliente + detalle |
| Saldos por factura | ✅ | pagada + fecha_vencimiento |
| Saldos por cliente | ✅ | trigger automático |
| Plazos de pago | ✅ 5 | contado/8/15/30/60 días desde ENTREGA |
| Pago multi-factura | ✅ | RegistrarPagoDialog (652 lín) |
| Pago parcial | ✅ | monto_aplicado en detalle |
| Validación pago | ✅ | requiere_validacion |
| Comprobante upload | ✅ | comprobante_url |
| Recordatorios cron | ✅ | check-invoice-expiry-reminders |
| Dashboard morosos | ✅ | CobranzaCriticaPanel |
| Vista vendedor | ✅ ÚNICO | VendedorCobranzaTab + Saldos |
| Portal cliente | ✅ ÚNICO PYME | ClienteEstadoCuenta |
| Aging report 30/60/90 | ❌ NO existe | Sin clasificación formal |
| Conciliación bancaria | ❌ NO existe | Sin tabla ni match |
| Notas crédito CFDI tipo E | ❌ NO existe | Crítico fiscal |
| Configuración recordatorios | ❌ NO existe | No por cliente |
| Notas seguimiento humano | ❌ NO existe | Sin memoria externa |
| Dashboard ejecutivo admin | 🟡 Parcial | Falta vista completa |

---

## 3. Estándar Oracle / SAP / NetSuite

**Oracle Receivables (AR):** customer balance, aging report, dunning 
letters, collection management.

**SAP FI-AR:** customer aging, dunning procedures.

**NetSuite A/R:** Customer Center autoservicio, online payment portal.

6 conceptos universales:
1. Aging Report (buckets)
2. Recordatorios escalonados
3. Aplicación de pagos
4. Conciliación bancaria
5. Promise to Pay
6. Dunning (cartas escalonadas)

**Crítica cultural:** Oracle/SAP usan tono LEGAL frío. Para mercado 
mexicano abarrotero de relaciones largas, esto NO funciona. Genera 
ruptura con clientes amigos.

---

## 4. Por qué ALMASA-OS gana

| Dimensión | Oracle/SAP | ALMASA-OS | Ganador |
|-----------|-----------|-----------|---------|
| Tablas cobros | ✅ | ✅ 3 | EMPATE |
| Saldos por factura | ✅ | ✅ | EMPATE |
| Plazos de pago | ✅ | ✅ 5 desde ENTREGA | ALMASA |
| Portal cliente | ✅ | ✅ ÚNICO PYME | ALMASA |
| Vista vendedor | 🟡 | ✅ ÚNICO | ALMASA |
| Configuración por cliente | 🟡 | ✅ ÚNICO | ALMASA |
| Tono cordial mexicano | ❌ legal | ✅ ÚNICO | ALMASA |
| Aging report | ✅ | ❌ → planeado | ORACLE |
| Conciliación bancaria | ✅ | ❌ → planeado | ORACLE |
| Notas crédito CFDI E | ✅ | ❌ → planeado | ORACLE |
| Workflow escalado | ✅ presión | 🟡 → cordial | ALMASA (post) |
| Notas seguimiento | ✅ | ❌ → planeado | ORACLE |
| Dashboard ejecutivo | ✅ | 🟡 → planeado | ORACLE |
| Costo licencia | $$$$ | $0 | ALMASA |

---

## 5. Las 6 Brechas Críticas

### Brecha 1 — Aging Report + Dashboard Ejecutivo Admin

**Problema:** Sin visibilidad completa de cartera por antigüedad.

**Solución:**

```sql
CREATE VIEW vw_aging_cartera AS
SELECT 
  c.id AS cliente_id,
  c.nombre AS cliente_nombre,
  c.telefono,
  c.email,
  c.recordatorios_automaticos,
  c.nivel_relacion,
  c.limite_credito,
  
  COALESCE(SUM(CASE 
    WHEN f.fecha_vencimiento >= CURRENT_DATE 
    THEN f.saldo_pendiente END), 0) AS por_vencer,
  
  COALESCE(SUM(CASE 
    WHEN CURRENT_DATE - f.fecha_vencimiento BETWEEN 1 AND 30
    THEN f.saldo_pendiente END), 0) AS vencido_1_30,
  
  COALESCE(SUM(CASE 
    WHEN CURRENT_DATE - f.fecha_vencimiento BETWEEN 31 AND 60
    THEN f.saldo_pendiente END), 0) AS vencido_31_60,
  
  COALESCE(SUM(CASE 
    WHEN CURRENT_DATE - f.fecha_vencimiento BETWEEN 61 AND 90
    THEN f.saldo_pendiente END), 0) AS vencido_61_90,
  
  COALESCE(SUM(CASE 
    WHEN CURRENT_DATE - f.fecha_vencimiento > 90
    THEN f.saldo_pendiente END), 0) AS vencido_mas_90,
  
  COALESCE(SUM(f.saldo_pendiente), 0) AS total_cartera,
  MAX(CURRENT_DATE - f.fecha_vencimiento) AS dias_max_vencido
  
FROM clientes c
LEFT JOIN facturas f ON f.cliente_id = c.id 
  AND f.saldo_pendiente > 0 
  AND f.pagada = false
GROUP BY c.id;
```

**Esfuerzo:** 1-2 semanas  
**Prioridad:** ALTA

### Brecha 2 — Configuración de Recordatorios POR CLIENTE

**Problema:** Hoy todos reciben (o nadie). Admin necesita decidir por 
cliente quién recibe automáticos y quién no.

**Solución:**

```sql
ALTER TABLE clientes ADD COLUMN recordatorios_automaticos BOOLEAN DEFAULT true;
ALTER TABLE clientes ADD COLUMN nivel_relacion TEXT 
  CHECK (nivel_relacion IN (
    'amigo_cercano',  -- NO mandar automático nunca
    'comercial',      -- recordatorios cordiales (default)
    'nuevo',          -- recordatorios estándar
    'corporativo'     -- recordatorios formales
  )) DEFAULT 'comercial';

ALTER TABLE clientes ADD COLUMN nota_relacion TEXT;
```

**Lógica:**
- Si `recordatorios_automaticos = false` → sistema NO manda nada
- Si `true` → manda según nivel de relación
- TODAS las situaciones aparecen en dashboard admin

**Esfuerzo:** 3-5 días  
**Prioridad:** CRÍTICA (filosofía del módulo)

### Brecha 3 — Templates Cordiales Informativos

**Problema:** Tono legal de Oracle NO aplica.

**Solución:** 3 niveles SOLO INFORMATIVOS, sin presión.

```sql
CREATE TYPE nivel_recordatorio AS ENUM (
  'pre_vencimiento',     -- Día -3 antes vencer
  'post_7_dias',         -- Día +7 vencido
  'post_30_dias'         -- Día +30 vencido
);

CREATE TABLE recordatorios_cobranza (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  nivel nivel_recordatorio NOT NULL,
  enviado_whatsapp BOOLEAN DEFAULT false,
  enviado_email BOOLEAN DEFAULT false,
  enviado_en TIMESTAMPTZ,
  contenido_enviado TEXT,
  cliente_respondio BOOLEAN DEFAULT false,
  respondido_en TIMESTAMPTZ,
  respuesta TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Templates (TONO CORDIAL, NO COBRANZA):**

**NIVEL 1 — Pre-vencimiento (Día -3):**

```
Hola {cliente_nombre},

Le mandamos un recordatorio:
su factura {folio} de ${monto} 
vence el {fecha_vencimiento}.

Cualquier duda estamos para servirle.

Saludos,
ALMASA
```

**NIVEL 2 — Post 7 días vencido:**

```
Hola {cliente_nombre},

Recordatorio: su factura {folio} 
de ${monto} cumplió {dias_vencido} 
días desde su vencimiento.

Cualquier cosa avísenos.

Saludos,
ALMASA
```

**NIVEL 3 — Post 30 días vencido:**

```
Hola {cliente_nombre},

Recordatorio: su factura {folio} 
de ${monto} acumula {dias_vencido} 
días desde vencimiento.

Si necesita revisar algún detalle, 
con gusto le atendemos.

Saludos,
ALMASA
```

**Notas culturales del tono:**
- NO se menciona "cobranza", "vencido", "atrasado", "deuda"
- NO se menciona "suspender pedidos", "acción legal"
- NO se presiona con plazos finales
- Solo se informa los días
- Se ofrece ayuda "para servirle"
- Se mantiene relación

**Esfuerzo:** 1 semana  
**Prioridad:** ALTA

### Brecha 4 — Notas de Seguimiento Humano

**Problema:** Cuando admin habla personalmente con cliente, no hay 
dónde guardar lo conversado. Se pierde memoria.

**Solución:**

```sql
CREATE TABLE notas_seguimiento_cobranza (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  factura_id UUID REFERENCES facturas(id),
  
  fecha TIMESTAMPTZ DEFAULT now(),
  tipo_contacto TEXT CHECK (tipo_contacto IN (
    'llamada', 'visita_personal', 'whatsapp_manual',
    'email_manual', 'reunion', 'otro'
  )),
  
  resumen TEXT NOT NULL,
  
  -- Compromiso adquirido
  compromiso_fecha DATE,
  compromiso_monto NUMERIC,
  compromiso_descripcion TEXT,
  compromiso_cumplido BOOLEAN DEFAULT false,
  compromiso_cumplido_fecha DATE,
  
  registrado_por UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Ejemplo:**
```
HISTÓRICO DON PEPE
---
2026-05-08 - Llamada
"Hablamos del saldo $20M, 
prometió abonar $500K el viernes 12"
Compromiso: 2026-05-12 - $500,000

2026-05-12 - Sistema
Compromiso cumplido (abonó $500K)

2026-05-15 - Visita personal
"Pasé por su negocio, 
acordamos abono mensual de $300K"
Compromiso: 2026-06-15 - $300,000
```

**Esfuerzo:** 1-2 semanas  
**Prioridad:** ALTA (memoria del admin)

### Brecha 5 — Conciliación Bancaria Completa

**Problema:** Sin verificación de pagos en banco.

**Solución:** Tabla movimientos_bancarios + import CSV/PDF + match 
automático por monto + fecha + concepto.

**Esfuerzo:** 2-3 semanas  
**Prioridad:** IMPORTANTE

### Brecha 6 — Notas de Crédito CFDI Tipo E

**Problema:** SAT requiere CFDI tipo E para devoluciones/ajustes 
post-factura. Hoy NO existe.

**Solución:** Tabla notas_credito + edge function emitir-nota-credito-cfdi 
con timbrado PAC.

**Esfuerzo:** 2 semanas  
**Prioridad:** IMPORTANTE (legal/fiscal)  
**Alineado con:** /audit/07 Facturación

---

## 6. Roadmap

| Mes | Entregas |
|-----|----------|
| Mayo (resto) | /audit/16 generado |
| Julio | Brecha 2: Configuración por cliente (3-5 días) |
| Julio | Brecha 1: Aging + Dashboard admin (2 sem) |
| Agosto | Brecha 3: Templates cordiales (1 sem) |
| Agosto | Brecha 4: Notas seguimiento humano (2 sem) |
| Septiembre | Brecha 6: Notas crédito CFDI tipo E (2 sem) |
| Octubre | Brecha 5: Conciliación bancaria (3 sem) |

**Tiempo total:** 4-5 meses  
**Inversión:** $0 software (solo desarrollo)

---

## 7. Decisiones de Negocio Pendientes

### Decisión 1 — Clasificación inicial de clientes
Admin tendrá que clasificar clientes existentes:
- Cuántos son `amigo_cercano`?
- Cuántos `comercial`?
- Cuántos `corporativo`?

### Decisión 2 — Bancos a conciliar
- Cuántas cuentas bancarias tiene ALMASA?
- Qué bancos? (BBVA, Santander, Banamex...)
- Estado de cuenta digital disponible?

### Decisión 3 — Validar templates con admin
- Ajustar wording si hay regionalismos
- Considerar saludos específicos
- Adaptar a vocabulario ALMASA

### Decisión 4 — Plazo de compromisos
- Si cliente promete pago el día X y no cumple
- Cuándo escala alerta?
- Mismo día o 1 día después?

---

## 8. Conexión con Biblia v1.1 y otros documentos

### Biblia v1.1 - Principios afectados:
- Principio #5 (Utilidad en tres niveles): cartera = utilidad real
- Principio #1 (Privacidad por rol): admin ve TODO
- Principio #10 (Users Before Perfection): admin decide siempre

### Conexiones cruzadas:
- /audit/07-FACTURACION: notas de crédito tipo E
- /audit/13-PEDIDOS: HOLD de crédito (NO automático para amigos)
- /audit/15-RH: contadora consulta cobros
- /audit/12-EVIDENCIA: hashes en comprobantes

### Nuevo Principio Transversal Propuesto — ADMIN COMO DIRECTOR
"ALMASA-OS NO toma decisiones humanas por el admin. El sistema 
acompaña con datos, automatiza tareas repetitivas, pero las 
decisiones sobre relaciones humanas siempre las toma el admin. 
El sistema es asistente, no autómata."

### Sobre clientes amigos con grandes deudas:
Este módulo NO presiona a clientes amigos. Si Don Pepe debe $20M 
y va pagando con confianza mutua, el sistema solo asegura que el 
admin tenga visibilidad total. La gestión humana queda intacta.

---

## 9. Recomendación final

ALMASA-OS Cobranza es uno de los módulos más sofisticados, con 
capacidades únicas (portal cliente, vista vendedor, plazos desde 
entrega) que Oracle/SAP NO modelan así para PYMEs.

Las 6 brechas son específicas y respetan la cultura mexicana:
1. AGING + DASHBOARD ADMIN — visibilidad total
2. CONFIGURACIÓN POR CLIENTE — control granular
3. TEMPLATES CORDIALES — tono respetuoso
4. NOTAS SEGUIMIENTO — memoria humana
5. CONCILIACIÓN BANCARIA — control financiero
6. NOTAS CRÉDITO CFDI — protección fiscal

**Decisión cultural fundamental:** Sistema acompaña al admin, no 
presiona al cliente. Cada admin decide por cliente quién recibe 
recordatorios automáticos y quién requiere atención personal.

**Orden estricto:**
1. JULIO 2026: Configuración por cliente + Aging dashboard (alto impacto)
2. AGOSTO 2026: Templates cordiales + Notas seguimiento
3. SEPTIEMBRE 2026: Notas crédito CFDI (legal urgente)
4. OCTUBRE 2026: Conciliación bancaria

Una vez completas las 6 brechas, ALMASA-OS Cobranza será **superior 
a Oracle Receivables para PYMEs mexicanas con relaciones largas**, 
con costo $0, ventajas únicas (portal cliente, vista vendedor, 
plazos desde entrega, tono cordial, configuración por cliente) y 
RESPETO TOTAL por la cultura mexicana de mayoreo.

---

*ALMASA-OS · Rediseño de Cobranza / CXC · v1.0*  
*Generado el 10 de mayo de 2026*  
*Sistema firme con datos. Tono respetuoso con clientes. Admin decide siempre.*
