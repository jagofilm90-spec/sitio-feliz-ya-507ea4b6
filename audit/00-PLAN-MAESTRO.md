# Plan Maestro — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 8 de Mayo 2026  
**Origen:** Cierre de jornada histórica (12 commits, 9 audits)  
**Estado:** Activo  
**Tagline:** El camino de ALMASA-OS, en orden estricto.

---

## Filosofía rectora

> 1. Investigar antes de actuar
> 2. Estudiar cómo lo hace Oracle / SAP / NetSuite
> 3. Proponer cómo lo hacemos nosotros mejor
> 4. Documentar antes de implementar
> 5. Una sesión, un objetivo

La Biblia es el contexto, no el destino.
ALMASA-OS funcionando es el destino.

---

## Plan de 5 fases

### Fase 1 — Biblia v1.1 (PROXIMA SESION)

**Objetivo:** Integrar los 9 documentos de /audit/ a la Biblia v1.

**Qué entra:**
- Corrección Bug #1 CPP (función ya existe, no era bug)
- Nuevos principios transversales:
  - "Doble Unidad" (sacos vs kg)
  - "Pensar como Oracle, construir mejor"
  - "Investigar antes de actuar"
  - "Ventaja por integración"
- Resumen ejecutivo de los 3 rediseños:
  - M07 Facturación → estado computado
  - M02 Inventario → ledger único + reservas + precio dual
  - M03 Compras → P2P completo
- Roadmap 6-12 meses unificado
- Estado real post-fixes (12 commits del 8 mayo)

**Tiempo:** 1 sesión dedicada (2-3 hrs)

**Entregable:** `almasa-os-biblia-v1.1.html`

---

### Fase 2 — Principios de Tablet / Móvil

**Objetivo:** Documentar UX/UI de dispositivos de campo.

**Dispositivos:**
- Tablet del almacenista (recepción, carga, conteo)
- Tablet del chofer (rutas, entregas, firmas)
- Móvil del vendedor (catálogo, pedidos)
- Tablet del admin (escritorio principal)

**Principios a definir:**
- Tamaños de target (botones grandes en tablet)
- Modo offline vs online
- Sincronización background
- Cámara para fotos (recepción, evidencia)
- GPS para tracking
- Push notifications
- Firmas digitales

**Tiempo:** 1 sesión (1-2 hrs)

**Entregable:** `/audit/10-PRINCIPIOS-DISPOSITIVOS.md`

---

### Fase 3 — Roles y Seguridad

**Objetivo:** Documentar roles, permisos y seguridad.

**Roles ALMASA:**
- Admin (Jose)
- Padre (operación actual)
- Secretaria
- Contadora
- Vendedor (Carlos, Salvador, Martín, Venancio)
- Almacenista
- Chofer
- Cliente (portal futuro)

**Para cada rol:**
- Qué ve
- Qué puede hacer
- Qué dispositivos usa
- Qué notificaciones recibe
- Qué auditoría se registra

**Tiempo:** 1 sesión (1-2 hrs)

**Entregable:** `/audit/11-ROLES-Y-SEGURIDAD.md`

---

### Fase 4 — Rastreo y Evidencia

**Objetivo:** Documentar captura de evidencia operativa.

**Evidencias existentes:**
- Fotos de recepción
- Firmas en entregas
- Sellos de proveedor
- GPS de bodegas (detección WiFi)

**Evidencias por diseñar:**
- Foto de báscula con peso real (cambio 7 inventario)
- Foto de cycle counting (cambio 6 inventario)
- Foto de devolución cliente (Bug #1B)
- Tracking GPS de chofer durante ruta
- Timestamps con hash en operaciones críticas

**Tiempo:** 1 sesión (1-2 hrs)

**Entregable:** `/audit/12-RASTREO-Y-EVIDENCIA.md`

---

### Fase 5 — Implementación por prioridad

**Solo empezar después de Fases 1-4 completas.**

**Orden estricto:**

| # | Cuándo | Qué |
|---|--------|-----|
| 1 | Mayo-Junio 2026 | Inventario Fase 1: Ledger único + RPC unificada + carga como movimiento |
| 2 | Junio 2026 | Inventario Fase 2: Reservas + Modelo precio dual báscula |
| 3 | Julio 2026 | Compras Cambio 1: 3-way match unificado |
| 4 | Julio-Agosto 2026 | Bug #1B Devolución cliente + Bug #2 Facturación |
| 5 | Agosto-Septiembre 2026 | Inventario Fase 3-4 + Compras Fase 2-4 |
| 6 | Octubre-Diciembre 2026 | Vendor Portal + Contratos marco + Auditoría UX |

---

## Reglas para no desviarnos

1. **Una sesión, un objetivo.** No saltar entre temas.
2. **Investigar antes de actuar.** Demostrado el 8 mayo.
3. **Oracle primero, ALMASA después.** No saltarse el paso 1.
4. **Decisiones de negocio se toman.** Si hay duda, documentar.
5. **Commits pequeños y limpios.** Cada commit, 1 propósito.
6. **Validar en producción.** Cada deploy, validar.
7. **La Biblia es contexto, no destino.** ALMASA-OS funcionando es el destino.

---

## Cómo retomar

**Próxima sesión, abres chat nuevo y dices:**

> "Vengo de la sesión del 8 mayo donde hicimos 12 commits
> y 9 documentos de auditoría. Necesito hacer la FASE 1
> del plan: actualizar la Biblia v1 → v1.1 integrando los
> rediseños 07, 08, 09."

**Yo (Claude) haré:**
1. Leer /audit/00-PLAN-MAESTRO.md (este archivo)
2. Leer /audit/01-09 (resumen)
3. Leer Biblia v1 actual
4. Identificar qué cambia
5. Generar Biblia v1.1
6. Commit + push

---

## Estado al cierre del 8 mayo 2026

### 12 commits hoy

**Seguridad (3):**
- 37e0f02d gmail-api verify_jwt
- 23249cac resumen-diario verify_jwt
- 1a6fa85e 3 functions verify_jwt

**Inventario técnico (2):**
- afb317c7 devoluciones proveedor RPC
- 630b539f faltantes sync trigger

**Dashboard/UX (3):**
- bf0aacce caducidad query
- c1e8e37f 4 KPIs corregidos
- 0167d9d3 stock bajo badge

**Limpieza (1):**
- 57bc3279 dead code Bug #6

**Documentación estratégica (3):**
- da786f70 rediseño facturación Oracle/SAP
- dd6fc224 rediseño inventario precio dual
- 8e198eb0 extensiones compras P2P

### Documentos en /audit/

| # | Archivo | Contenido |
|---|---------|-----------|
| 00 | PLAN-MAESTRO.md | Este documento |
| 01 | ESTRUCTURA.md | Mapa del territorio |
| 02 | MODULOS.md | 30 módulos auditados |
| 03 | DATABASE.md | 70 tablas + RPCs |
| 04 | BUGS-Y-DEUDA-TECNICA.md | Inventario problemas |
| 05 | PRIORIZACION.md | Plan original |
| 06 | OBSERVACIONES-EXTRA.md | Hallazgos secundarios |
| 07 | REDISENO-FACTURACION.md | Estado computado, eliminar boolean |
| 08 | REDISENO-INVENTARIO.md | Ledger único, reservas, precio dual |
| 09 | EXTENSIONES-COMPRAS.md | 6 extensiones Procure-to-Pay |

### Top 6 bugs

- Bug #1A Devoluciones inventario (CERRADO)
- Bug #1B Devoluciones cliente (DOCUMENTADO en 06)
- Bug #2 Facturado vs CFDI (REDISENO en 07)
- Bug #3 gmail-api seguridad (CERRADO)
- Bug #4 Faltantes UI conectada (CERRADO)
- Bug #5 NotificacionesCaducidad (CERRADO)
- Bug #6 Dual path recepción (CERRADO)

5/6 cerrados. 1 reposicionado como rediseño completo.

---

## Compromiso

Próxima sesión empieza con:
- "Qué fase del plan?"

Próxima sesión termina con:
- "Qué se hizo? Qué sigue? En qué fase estamos?"

Cualquier desvío surge → se documenta → no se ataca.

El plan se sigue.

---

*ALMASA-OS · Plan Maestro · v1.0*
*Generado el 8 de mayo de 2026 al cierre*
*El camino, en orden estricto*
