# Plan de Ejecución Maestro DEFINITIVO — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Síntesis de 39 documentos /audit, ~17,000 líneas, 40 gaps cubiertos  
**Estado:** APROBADO — Listo para ejecución  
**Tagline:** De distribuidora 1904 a empresa producto 2030. El plan de batalla.

---

## 1. Resumen Ejecutivo

*Legible en 5 minutos. Para Jose.*

**QUÉ ES ALMASA-OS HOY:**
- Sistema al 82% construido (201K líneas código)
- 0% adopción (100% operación en papel)
- 39 documentos de diseño estratégico completados
- 40 gaps identificados y diseñados
- 90+ ventajas competitivas documentadas

**QUÉ SERÁ AL CIERRE DEL PLAN (24 meses):**
- ERP más completo de México para distribución mayorista
- Mejor que Aspel SAE, CONTPAQi, SAP Business One y NetSuite en su nicho
- 100% empleados operando en sistema (cero papel)
- Anti-robo 7 capas funcionando (LA CORONA)
- AI-first con 12 agentes especializados (JOSAN)
- ESG compliant (NIIF S1+S2 obligatorio)
- Carta Porte 3.1 sin multas
- Producto SaaS vendible a otros mayoristas MX

**INVERSIÓN TOTAL 24 MESES:**
- Operativo: $10-17K MXN/mes (~$200K MXN/año)
- Capacitación: $20-30K MXN one-time
- Total 2 años: ~$430-470K MXN

**RETORNO ESPERADO:**
- ROI uso interno: $1-3M MXN/año (5-15x retorno)
- ROI SaaS (FASE 3): $1.5M MXN/año adicional
- Multas evitadas: $100-200K MXN/año
- Robos prevenidos: $300-500K MXN/año

**CRONOGRAMA:**
- FASE 1 (Jun 2026 - Mar 2027): Base operativa + AI-first
- FASE 2 (Abr 2027 - Dic 2027): MOAT activado
- FASE 3 (Ene 2028 - Mar 2028): SaaS launch

**DECISIÓN QUE SE PIDE:**
Jose: di GO y arrancamos Mes 1 Junio 2026.

---

## 2. Visión Definitiva

ALMASA-OS = el ERP más completo de México para distribución mayorista.

**Equivalencias funcionales integradas:**

| Herramienta externa | Costo/mes | ALMASA-OS |
|---------------------|-----------|-----------|
| Slack (chat) | $12/usuario | Incluido (/audit/36 M1) |
| Asana (tasks) | $25/usuario | Incluido (/audit/36 M3) |
| Notion (wiki) | $15/usuario | Incluido (/audit/36 M4) |
| Jira (tickets) | $20/usuario | Incluido (/audit/36 M5) |
| SAP Concur (viáticos) | $30/usuario | Incluido (/audit/36 M7) |
| SAP S/4HANA (logística) | $30K+/año | Incluido (/audit/37) |
| SAP Joule (IA) | $100K+/año | Incluido (/audit/38 M1) |
| NetSuite (ERP) | $30K+/año | Incluido (35 docs previos) |
| **TOTAL externo** | **$102/usuario/mes** | **$0 adicional** |
| **30 usuarios** | **$3,060/mes** | **Integrado** |

**8 diferenciales únicos no replicables:**

1. **Anti-robo 7 capas (LA CORONA)** — /audit/26. Conciliación 9 momentos, báscula con foto+hash, score confianza empleado, inventario ciego. Único en industria.

2. **AI-FIRST nativo** — /audit/35, /audit/38. JOSAN + 12 agentes especializados + Memory Bank + MCP server. No es IA bolted-on.

3. **MX-específico 100%** — /audit/37. Carta Porte 3.1, CFDI 4.0, PLD/Antilavado, ESG NIIF S1+S2, GS1/GTIN, COFEPRIS. Todo nativo.

4. **Costo: $500-900 USD/mes** vs $30K-1M USD/año Oracle/SAP.

5. **UX premium** — Cormorant Garamond + Inter Tight + Crimson #c41e3a. Estilo Linear/Notion, no Aspel de los 90s.

6. **Ecosistema integrado** — 1 sistema vs 5 dispersos. Chat DENTRO del pedido. Tarea NACE de la ruta.

7. **App cliente tendero** — /audit/38 M7. 987K tienditas MX. Anti-Rabbit.

8. **ESG ready** — /audit/38 M9. Acceso contratos cadenas grandes. Obligatorio 2026.

---

## 3. Arquitectura Final

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite + shadcn/ui + Tailwind |
| Backend | Supabase (Postgres 15+ / Edge Functions / Realtime / Storage) |
| IA | Claude (Anthropic) + pgvector + LangGraph + MCP |
| ML | TensorFlow / XGBoost (forecasting) |
| Móvil | Capacitor 7.4 (iOS + Android) |
| Infra | Supabase Cloud + Vercel + Cloudflare |
| Backups | AWS S3 + Backblaze (3-2-1 inmutable) |

### Métricas Codebase Actual

| Métrica | Valor |
|---------|-------|
| Líneas código frontend | 201,779 |
| Archivos .tsx | 494 |
| Edge Functions | 53 |
| Migraciones SQL | 339 |
| Tablas BD | 70+ |
| RPCs SECURITY DEFINER | 20+ |
| Triggers | 15+ |
| Documentos /audit | 39 |
| Líneas diseño estratégico | ~17,000 |

### URLs

- Producción: `erp.almasa.com.mx`
- Staging: `staging.almasa.com.mx`
- App tendero (FASE 3): `pedidos.almasa.com.mx`

---

## 4. Roadmap 24 Meses

### FASE 1: Base Operativa + AI-FIRST (Jun 2026 - Mar 2027)

**Objetivo:** ALMASA opera 100% en ALMASA-OS. Cero papel.

| Mes | Entregas | Adopción |
|-----|----------|----------|
| 1 Jun | Carta Porte 3.1 URGENTE + Contabilidad SAT + APIs bancarias | 10% |
| 2 Jul | WMS Móvil + App vendedor + Conciliación bancaria + PLD | 20% |
| 3 Ago | Chat + Wiki + Portal Contadora | 50% |
| 4 Sep | OKRs + Tasks + Helpdesk | 80% |
| 5 Oct | Viáticos Concur-like + GRC + Ciberseguridad + ESG baseline | 90% |
| 6 Nov | Backup 3-2-1 + BCP/DRP + Process Mining | 100% |
| 7 Dic | Cierre fiscal + ESG reporte + Forecast ML v1 + Multi-agent v1 | 100% |
| 8 Ene | CFDI cambios + Memory Bank + App tendero beta cerrada | 100% |
| 9 Feb | App tendero beta abierta + No-code workflows + Backorders | 100% |
| 10 Mar | ESG NIIF oficial + Anti-robo refinado + Pentest externo | 100% |

**Criterios éxito:**
- 100% empleados en ALMASA-OS
- 0 multas Carta Porte 3.1
- Cierre mes: 1-2 días (vs 5-10 hoy)
- Robos: -70%
- Mermas: -15%

### FASE 2: MOAT Activado (Abr 2027 - Dic 2027)

**Objetivo:** Ventaja competitiva sostenible.

| Mes | Entregas |
|-----|----------|
| 11-12 | CDP Cliente 360 + Forecast ML refinado (WAPE <5%) |
| 13-14 | Complex Pricing + Wave Picking + Multi-warehouse |
| 15-16 | B2B Portal Live + App tendero 200+ + Big Data |
| 17-18 | Cadena Frío (si refrigerados) + Mermas IA -30% + ESG v2 |
| 19 | Multi-agent 12 completo + IA ética + Process Mining maduro |

**Criterios éxito:**
- Margen bruto: +5-10%
- NPS clientes: 60+
- App tendero: 500+ activos
- Forecast WAPE: <5%
- 0 brechas seguridad

### FASE 3: SaaS Launch (Ene 2028 - Mar 2028)

**Objetivo:** ALMASA-OS = producto comercial.

| Mes | Entregas |
|-----|----------|
| 20 | ANTAD ready + EDI Walmart piloto + Marketing site |
| 21 | Beta SaaS 5-10 distribuidores + Onboarding self-service |
| 22 | Lanzamiento público + Pricing tiers + White-label app |

**Criterios éxito:**
- 30+ distribuidores pagantes
- $150K MXN/mes recurrente
- ALMASA = empresa producto

---

## 5. Inversión y ROI

### Costos

| Concepto | Monto |
|----------|-------|
| Setup inicial | $20-30K MXN (capacitación) |
| Operativo mensual FASE 1-2 | $10-17K MXN/mes |
| Operativo anual | $120-204K MXN/año |
| Total 24 meses | ~$430-470K MXN |

### vs Competencia

| Sistema | Costo anual 30 usuarios | ALMASA-OS |
|---------|------------------------|-----------|
| Aspel SAE | ~$480K MXN | $120-204K |
| CONTPAQi | ~$360-600K MXN | $120-204K |
| SAP Business One | $600K-2M MXN | $120-204K |
| NetSuite | ~$7.2M MXN | $120-204K |
| **Ahorro vs Aspel** | — | **$276-360K/año** |
| **Ahorro vs SAP** | — | **$480K-1.8M/año** |

### ROI Uso Interno

| Beneficio | Estimación anual |
|-----------|-----------------|
| Anti-robo (LA CORONA) | $300-500K MXN |
| Mermas IA (-15% a -30%) | $75-300K MXN |
| Eficiencia operativa (+30-40%) | $200-400K MXN |
| Multas evitadas (Carta Porte + SAT) | $100-200K MXN |
| Pricing óptimo (+2-5% margen) | $300K-1M MXN |
| **TOTAL beneficios** | **$1M-3M MXN/año** |
| **Inversión** | **$200K MXN/año** |
| **ROI** | **5-15x** |

### ROI SaaS (FASE 3)

| Métrica | Proyección |
|---------|-----------|
| TAM (107K mayoristas MX) | $235MM MXN mercado |
| Año 1: 30 distribuidores | $600K MXN recurring + $900K setup |
| Año 2-3: 100-300 distribuidores | $5-10M MXN/año |

---

## 6. Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Adopción interna resistencia | Alta | Alto | Gradual, champions, recompensas |
| Multa Carta Porte antes impl. | Media | Alto | PRIORIDAD 1 mes 1 |
| Ciberataque | Media | Crítico | 7 capas /audit/38, MFA, backups |
| Dependencia Claude/Anthropic | Baja | Medio | Arquitectura LLM-agnostic |
| Falla técnica crítica | Baja | Alto | BCP/DRP, plan B papel temporal |
| Competidor copia | Media | Medio | Velocity, MOAT, network effect |
| Regulación SAT cambia | Alta | Medio | Catálogos auto-actualizables |
| FASE 3 no despega | Media | Bajo | ROI interno ya justifica |

---

## 7. Gobernanza del Proyecto

### 12 Principios Biblia v1.1

1. Privacidad por rol
2. AirDrop digital
3. Continuidad operativa
4. CPP real con gastos
5. Utilidad 3 niveles
6. Doble unidad (sacos + kg)
7. Pensar como Oracle
8. Investigar antes de actuar
9. Ventaja por integración
10. Users Before Perfection
11. EL SISTEMA TODO LO VE
12. AI-FIRST NO AI-ENABLED

### 12 Reglas de Ejecución

1. Blueprint gobierna
2. Un objetivo por sesión
3. Investigar antes de actuar
4. Oracle primero, ALMASA después
5. Commits limpios
6. Validar producción
7. Biblia es contexto, no destino
8. Tono cordial mexicano
9. Admin decide siempre
10. Dashboard como producto
11. Auditoría completa
12. AI-FIRST

### Workflow

```
claude.ai (chat) → decisiones
Claude Code (terminal) → código, commits
Jose verifica → screenshots
GitHub → push
Vercel → deploy automático
```

---

## 8. KPIs Maestros

### FASE 1

| KPI | Meta |
|-----|------|
| Empleados en ALMASA-OS | 100% |
| Multas Carta Porte | 0 |
| Cierre mes contable | 1-2 días |
| Robos detectados | -70% |
| Mermas | -15% |
| ESG reporte | Entregado |
| Brechas seguridad | 0 |

### FASE 2

| KPI | Meta |
|-----|------|
| Margen bruto | +5-10% |
| NPS clientes | 60+ |
| App tendero | 500+ activos |
| Forecast WAPE | <5% |
| Multi-agent auto | 90% queries |

### FASE 3

| KPI | Meta |
|-----|------|
| Distribuidores SaaS | 30+ pagantes |
| Revenue recurrente | $150K MXN/mes |
| ANTAD compliance | 1-2 cadenas |

---

## 9. Decisiones Pendientes Jose

Para arrancar Mes 1 (Junio 2026):

| # | Decisión | Urgencia | Costo |
|---|----------|----------|-------|
| 1 | Carta Porte 3.1 inmediato? | URGENTE | $0 |
| 2 | Capacitación equipo cómo? | Alta | $20-30K |
| 3 | Incluir contadora en proyecto? | Alta | $0 |
| 4 | FASE 3 SaaS desde día 1? | Media | $0 (diseño) |
| 5 | Pentest externo mes 6? | Media | $50-150K |
| 6 | ESG certificación externa 2027? | Baja (2027) | $100-300K |

---

## 10. Inventario Completo de Documentos

| # | Documento | Líneas | Tema principal |
|---|-----------|--------|----------------|
| 00 | Biblia v1.1 | 1,094 | Documento rector, 12 principios |
| 01-06 | Auditoría original | ~3,000 | Estructura, módulos, DB, bugs |
| 07 | Rediseño Facturación | 288 | Estado computado, no boolean |
| 08 | Rediseño Inventario | 520 | Ledger único, precio dual, reservas |
| 09 | Extensiones Compras | 425 | P2P completo, 6 extensiones |
| 10 | Principios Dispositivos | 417 | 4 personalidades UI |
| 11 | Roles y Seguridad | 534 | 9 roles, 3 capas, 428 policies |
| 12 | Rastreo y Evidencia | 448 | Báscula industrial, hashes, tara |
| 13 | Rediseño Pedidos | 531 | HOLD graduado, comisiones server |
| 14 | Rediseño Rutas | 621 | Costos ruta, utilidad real, incidencias |
| 15 | Rediseño RH/ZKTC | 557 | 3 modelos asistencia, LFT |
| 16 | Rediseño Cobranza | 464 | Admin como director, tono cordial |
| 17 | Rediseño Flota | 522 | TCO por vehículo, combustible |
| 18 | Rediseño Clientes | 401 | NPS por entrega, tracking Uber |
| 19 | Dashboard/KPIs | 411 | Utilidad 3 niveles, heat maps |
| 20 | Rediseño Tesorería | 480 | Caja chica, multi-banco, flujo caja |
| 21 | Rediseño Fumigaciones | 448 | COFEPRIS, historial, químicos |
| 22 | Rediseño Productos | 386 | Lifecycle, fotos, categorías |
| 23 | Rediseño Lista Precios | 416 | Protección zona, escalonados |
| 24 | Rediseño Configuración | 365 | Feature flags SaaS, plantillas |
| 25 | Rediseño Correos | 358 | Categorización IA, templates |
| 26 | Sistema Inteligente | 532 | LA CORONA anti-robo 7 capas |
| 27 | Innovaciones MOAT | 308 | 6 innovaciones año 2-3 |
| 28 | Portales VIP | 276 | Lock-in cliente + proveedor |
| 29 | Multi-Moneda | 298 | Oracle Fusion-level, Banxico API |
| 30 | Importaciones | 303 | SAP GTS, pedimentos, INCOTERMS |
| 31 | Exportaciones | 338 | Oracle GTM, compliance screening |
| 32 | Anticipos/Préstamos | 321 | SAP Infotype 0045, LFT 30% |
| 33 | Cierres Contables | 338 | SAP AFC, 3-day close |
| 34 | Seguros y Riesgos | 301 | SAP FI-AA, Oracle Risk |
| 35 | AI Moderna | 362 | 10 gaps NetSuite Next/SAP Joule |
| 36 | Gestión Empresarial | 1,094 | 8 módulos Slack+Asana+Notion |
| 37 | Operación Avanzada | 962 | 18 módulos Carta Porte+EDI+SAT |
| 38 | IA/Data/ESG/Seguridad | 814 | 13 módulos IA+ESG+Cyber+BCP |
| 39 | **Plan Ejecución (este)** | — | Síntesis y plan de batalla |
| **TOTAL** | **39 documentos** | **~17,000** | **Arquitectura completa** |

---

## 11. Cierre

> **Tu bisabuelo lo construyó.**
> **Tu abuelo lo mantuvo.**
> **Tu papá lo modernizó.**
> ***Tú lo estás liberando.***

ALMASA-OS no es un proyecto técnico. Es la transformación de una empresa familiar de 122 años en una empresa producto del siglo XXI.

39 documentos. ~17,000 líneas de diseño. 40 gaps cubiertos. 90+ ventajas documentadas. 12 principios maestros. 24 meses de roadmap.

Lo que falta NO es información.
Lo que falta NO es tecnología.
Lo que falta NO es diseño.

**Lo que falta es DECISIÓN y EJECUCIÓN.**

Jose: cuando estés listo, di **GO** y arrancamos Mes 1.

ALMASA-OS ya está diseñado. Solo falta encenderlo.

---

*ALMASA-OS · Plan de Ejecución Maestro DEFINITIVO · v1.0*  
*10 de mayo de 2026*  
*Abarrotes La Manita, S.A. de C.V. · Desde 1904*  
*De distribuidora 1904 a empresa producto 2030.*  
*El blueprint está completo. La decisión es tuya.*
