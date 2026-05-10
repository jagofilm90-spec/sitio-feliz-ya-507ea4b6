# Portales Cliente VIP y Proveedor — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Necesidad de lock-in clientes top + transparencia proveedores  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** Lock-in para clientes VIP. Transparencia con proveedores.

---

## 1. La filosofía

Portales auto-servicio para clientes VIP y proveedores 
estratégicos. Oracle/SAP los ofrecen pero a precios prohibitivos 
($50K+ USD setup). En mayoreo mexicano PYME, NADIE los ofrece.

> Principio rector: "Los clientes y proveedores son socios 
> estratégicos. Damos transparencia y herramientas. Ellos 
> dan lealtad y eficiencia. Win-win."

---

## 2. PORTAL CLIENTE VIP

### Para Quién

- Lecaroz (149 sucursales) — automático
- Top 20 clientes por volumen — automático
- Score crediticio Platino/Oro — automático
- Cliente solicita acceso — admin aprueba

Estimado inicial: 30-50 clientes con portal activo.

### Capacidades

- **Dashboard** con métricas mes, entregas en vivo, pedidos recientes
- **Crear pedidos 24/7** sin vendedor, catálogo con SUS precios
- **Histórico pedidos** con re-pedir 1 click
- **Facturas** XML/PDF + verificación blockchain (/audit/27)
- **Tracking Uber-style** mapa en vivo del camión
- **Estado cobranza** transparente con crédito disponible
- **Chat con vendedor** asignado
- **NPS** calificar entregas + reportar discrepancias
- **Sugerencias IA** de reorden

### Implementación

```sql
CREATE TABLE clientes_portal_acceso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  activo BOOLEAN DEFAULT true,
  motivo_acceso TEXT,
  puede_crear_pedidos BOOLEAN DEFAULT true,
  puede_ver_facturas BOOLEAN DEFAULT true,
  puede_pagar_online BOOLEAN DEFAULT false,
  puede_chat_vendedor BOOLEAN DEFAULT true,
  puede_tracking_vivo BOOLEAN DEFAULT true,
  branding_color TEXT,
  email_dominio_permitido TEXT,
  ultimo_acceso TIMESTAMPTZ,
  total_logins INTEGER DEFAULT 0,
  pedidos_creados_portal INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clientes_portal_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  telefono TEXT,
  rol_cliente TEXT,
  puede_pedir BOOLEAN DEFAULT true,
  puede_aprobar_pedidos BOOLEAN DEFAULT false,
  monto_maximo_pedido NUMERIC,
  puede_ver_precios BOOLEAN DEFAULT true,
  puede_pagar BOOLEAN DEFAULT false,
  password_hash TEXT,
  mfa_activo BOOLEAN DEFAULT false,
  ultimo_login TIMESTAMPTZ,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clientes_portal_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_portal_id UUID NOT NULL,
  cliente_id UUID NOT NULL,
  accion TEXT NOT NULL,
  detalles JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**URL:** `https://portal.almasa.com.mx`
**VIP TOP:** subdomain custom (lecaroz.almasa.com.mx)

**Beneficios ALMASA:**
- Pedidos 24/7 sin vendedor
- Reduce carga vendedores ~30%
- Lock-in (acostumbrado no se va)
- Cobros más rápidos

**Esfuerzo:** 6-8 semanas  
**Prioridad:** ALTA

---

## 3. PORTAL PROVEEDOR

### Para Quién

- Top 20 proveedores por volumen
- Proveedores con CFDI mensual >$50K
- Estratégicos (productos exclusivos)

Estimado inicial: 15-25 proveedores con portal activo.

### Capacidades

- **Dashboard** ventas a ALMASA, OCs abiertas, pagos próximos
- **OCs abiertas** con estado, confirmar fecha entrega
- **Subir CFDI XML directo** (CRÍTICO — elimina email)
  - Procesamiento automático: valida XML, vincula a OC, envía a contabilidad
- **Estado pagos** transparente con comprobantes SPEI
- **Catálogo productos** vendidos a ALMASA con tendencias
- **Chat con compras** ALMASA

### Implementación

```sql
CREATE TABLE proveedores_portal_acceso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id),
  activo BOOLEAN DEFAULT true,
  motivo_acceso TEXT,
  puede_subir_cfdi BOOLEAN DEFAULT true,
  puede_ver_pagos BOOLEAN DEFAULT true,
  puede_ver_ocs BOOLEAN DEFAULT true,
  puede_chat_compras BOOLEAN DEFAULT true,
  puede_ver_estadisticas BOOLEAN DEFAULT true,
  ultimo_acceso TIMESTAMPTZ,
  total_logins INTEGER DEFAULT 0,
  cfdis_subidos_portal INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE proveedores_portal_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id),
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  telefono TEXT,
  rol_proveedor TEXT,
  puede_subir_cfdi BOOLEAN DEFAULT true,
  puede_ver_pagos BOOLEAN DEFAULT true,
  puede_responder_ocs BOOLEAN DEFAULT false,
  password_hash TEXT,
  mfa_activo BOOLEAN DEFAULT false,
  ultimo_login TIMESTAMPTZ,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE proveedores_cfdi_subidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL,
  usuario_portal_id UUID NOT NULL,
  xml_url TEXT NOT NULL,
  xml_hash_sha256 TEXT NOT NULL,
  uuid_sat TEXT,
  rfc_emisor TEXT,
  monto NUMERIC,
  fecha_emision TIMESTAMPTZ,
  oc_id UUID,
  factura_proveedor_id UUID,
  estado TEXT CHECK (estado IN (
    'subido', 'validado', 'vinculado', 'aprobado', 
    'rechazado', 'pagado'
  )) DEFAULT 'subido',
  rechazo_motivo TEXT,
  subido_en TIMESTAMPTZ DEFAULT now(),
  procesado_en TIMESTAMPTZ
);
```

**URL:** `https://proveedores.almasa.com.mx`

**Beneficios ALMASA:**
- Reduce llamadas "¿cuándo me pagan?" ~70%
- Cero data entry XMLs
- Mejor relación (transparencia)
- ÚNICO en mayoreo MX

**Esfuerzo:** 6-8 semanas  
**Prioridad:** ALTA (después portal cliente)

---

## 4. Comparación Oracle/SAP

| Capacidad | Oracle | SAP | NetSuite | Mayoristas MX | ALMASA-OS |
|-----------|--------|-----|----------|---------------|-----------|
| Portal Cliente VIP | ✅ $50K+ | ✅ Ariba | ✅ Suite | ❌ | ✅ INCLUIDO |
| Portal Proveedor | ✅ Ariba $$$ | ✅ Ariba | 🟡 | ❌ NADIE | ✅ INCLUIDO |
| Subir CFDI directo | 🟡 | 🟡 | 🟡 | ❌ | ✅ ÚNICO MX |
| Tracking Uber en portal | ❌ | ❌ | ❌ | ❌ | ✅ ÚNICO |
| Verificar blockchain | ❌ | ❌ | ❌ | ❌ | ✅ ÚNICO |
| Reorder 1 click | ✅ | 🟡 | ✅ | ❌ | ✅ |
| Chat directo | 🟡 | 🟡 | ❌ | ❌ | ✅ |
| Costo | $$$$$ | $$$$$ | $$$$ | N/A | $0 |

---

## 5. Roadmap

| Mes | Hito |
|-----|------|
| 5-6 | Portal Cliente Fase 1 (login + ver pedidos + facturas) |
| 6-7 | Portal Cliente Fase 2 (crear pedidos + tracking + chat) |
| 8 | Portal Cliente Fase 3 (pagos online + branding) |
| 9-10 | Portal Proveedor Fase 1 (ver OCs + ver pagos) |
| 10-11 | Portal Proveedor Fase 2 (subir CFDI + chat) |
| 12 | Portal Proveedor Fase 3 (estadísticas + dashboards) |

**Tiempo total:** 8 meses  
**Inversión:** ~$50/mes hosting

---

## 6. Decisiones Pendientes

1. **Pagos online** — SPEI integrado? Tarjeta (comisión 3.6%)?
2. **Subdomain VIP** — Cuántos clientes lo merecen?
3. **Branding VIP** — Logo cliente en su portal?
4. **MFA proveedor** — Obligatorio por seguridad XMLs?
5. **Auto-aprobación CFDI** — Si coincide OC ±5%: auto?
6. **Push notifications** — Ambos portales?

---

## 7. Conexión con todo

- /audit/13 Pedidos (cliente crea directo)
- /audit/14 Rutas (tracking Uber-style)
- /audit/16 Cobranza (estado cuenta)
- /audit/09 Compras (proveedor sube XML)
- /audit/07 Facturación (CFDI verificable)
- /audit/24 Configuración (feature flags)
- /audit/27 Innovaciones (blockchain)

### Nuevo Principio — TRANSPARENCIA ESTRATÉGICA
"Clientes y proveedores son socios, no transacciones. 
Damos visibilidad total. Ellos nos dan lealtad."

---

## 8. Recomendación final

2 portales = INVERSIÓN ESTRATÉGICA:

1. **Portal Cliente VIP**: Lock-in top 20 clientes (~80% revenue)
2. **Portal Proveedor**: Reduce 70% llamadas, cero data entry XMLs

**Orden:** Cliente primero (mes 5-8), Proveedor después (mes 9-12).

ALMASA-OS = ERP + 2 portales = único en mayoreo MX.

---

*ALMASA-OS · Portales Cliente VIP y Proveedor · v1.0*  
*Generado el 10 de mayo de 2026*  
*Lock-in clientes. Transparencia proveedores. Único mayoreo MX.*
