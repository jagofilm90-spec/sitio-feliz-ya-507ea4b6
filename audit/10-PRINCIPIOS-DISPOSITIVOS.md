# Principios de Dispositivos — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría móvil + decisiones operativas + metodología "Pensar como Oracle"  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** Cómo ALMASA-OS habla con cada empleado donde está.

---

## 1. La filosofía

ALMASA-OS no es un sistema de oficina. Vive en las manos de la gente:
- En el celular del vendedor caminando entre puestos del mercado
- En el iPad del almacenista cargando un camión a las 6am
- En el teléfono del chofer entregando en una colonia sin señal
- En la tablet del admin aprobando una OC desde su casa

Cada uno tiene un dispositivo, un contexto, una urgencia, una privacidad propia.
Este documento define cómo ALMASA-OS los respeta.

> Principio rector: "Una app, cuatro personalidades."

ALMASA-OS NO es 4 apps separadas (modelo Oracle). 
Es 1 sola app que detecta quién entra y se transforma.

---

## 2. Estado actual de capacidades móviles

ALMASA-OS ya tiene construido el 80% de la infraestructura móvil
necesaria. Inventario al 10 mayo 2026:

| Capacidad | Estado | Componentes clave |
|-----------|--------|-------------------|
| Capacitor v7.4.4 | ✅ Configurado | 6 plugins, sin build nativo |
| Detección dispositivo | ✅ Excelente | use-mobile.tsx (6 hooks), 32 consumidores |
| Almacén Tablet | ✅ Módulo más grande | 40 archivos, 19,631 líneas, 14 tabs |
| Push Notifications | ✅ Completo | FCM + APNs, deep links, 3 niveles |
| GPS background | ✅ Schedule-aware | Lun-Vie 8am-8pm, Sáb 8am-6pm |
| Cámara fotos | ✅ Funcional | 23 archivos, HTML5 capture |
| Firmas digitales | ✅ Completo | 6 componentes, canvas + touch |
| Realtime sync | ✅ Bien distribuido | 13 archivos, 5+ canales |
| Offline pedidos | 🟡 Parcial | Solo vendedor (offlineQueue.ts) |
| Service Worker | ❌ No existe | — |
| Build nativo iOS | ❌ No existe | Sin carpeta ios/ |
| Build nativo Android | ❌ No existe | Sin carpeta android/ |

**Conclusión:** No partimos de cero. Tenemos infraestructura sólida.

---

## 3. Estándar Oracle / SAP / NetSuite

Los grandes ERPs manejan capacidades móviles con 6 conceptos:

### Concepto 1 — Role-Based Interfaces
Cada rol tiene SU app optimizada (Oracle: 4 apps separadas).

### Concepto 2 — Offline-First or Offline-Capable
Field workers pueden trabajar SIN señal. Sync cuando regresa.

### Concepto 3 — Progressive Disclosure
Pantalla principal: 3-5 acciones. Detalles bajo demanda.

### Concepto 4 — Multi-Modal Capture
Voz (Oracle), cámara, firmas, GPS, códigos.

### Concepto 5 — Real-Time Sync Selectivo
No todo realtime. Crítico = sí, reportes = no.

### Concepto 6 — Push by Urgency
3 niveles: crítico (alarma), normal (silencioso), info (badge).

### Las estrategias específicas

**Oracle Fusion Mobile**
- 4 apps nativas separadas (Field Service, Sales, Procurement)
- Caro pero potente
- Cada rol tiene su instalación

**SAP Fiori Mobile**
- 1 app, múltiples roles vía Launchpad
- Tiles/cards por función
- Pesada (1+ GB)

**NetSuite Mobile**
- Mobile-first para admins
- Aprobaciones desde reloj
- No optimizado para field workers

---

## 4. Por qué ALMASA-OS gana

| Dimensión | Oracle/SAP | ALMASA-OS | Ganador |
|-----------|-----------|-----------|---------|
| Role-based UI | App separada | 1 app, login define UI | ALMASA |
| Detección dispositivo | Genérica | 6 hooks finos | ALMASA |
| Push 3 niveles | Sí | Sí (FCM+APNs) | EMPATE |
| GPS background | Sí | Schedule-aware | ALMASA |
| Cámara | Plugin nativo | HTML5 | ORACLE |
| Firmas digitales | Sí | Canvas + touch | EMPATE |
| Offline-first | Sí (todos) | Solo vendedor | ORACLE |
| Service Worker | N/A | NO EXISTE | ORACLE |
| Build nativo | Apps store | NO PWA web | ORACLE |
| Realtime sync | Selectivo | 13 canales | ALMASA |
| Costo | $$$$ | $0 stack | ALMASA |
| Mantenibilidad | Multi-app | 1 codebase | ALMASA |

**Marcador: ALMASA 6, Oracle 3, Empate 2.**

ALMASA gana donde importa: costo, simplicidad, mantenibilidad, role-driven UI.
Oracle gana en lo que ALMASA va a construir: offline universal, builds nativos, Service Worker.

---

## 5. Las 4 Personalidades de UI

ALMASA-OS detecta el rol al hacer login y transforma su personalidad.

### A — Móvil del Vendedor (BYOD)

**Quién:** Carlos, Salvador, Martín, Venancio  
**Dispositivo:** Sus propios celulares (iPhone/Android)  
**Subsidio:** ALMASA otorga ~$200-300 MXN/mes para saldo  
**Dónde se usa:** Calle, mercados, casa de clientes  
**Condiciones:** Una mano, sol fuerte, ruido, caminando

**Principios:**
- Botones tamaño pulgar (mínimo 44px)
- Modo claro forzado (sol)
- Catálogo offline-first (mercados sin señal)
- Captura rápida de pedidos
- Sync background al volver a oficina
- Privacidad: ve SUS comisiones, no las de otros

**Estado actual:** ✅ 80% completo (offlineQueue.ts existe)

### B — Tablet del Almacenista (iPad ALMASA)

**Quién:** Almacenistas y gerente almacén  
**Dispositivo:** ALMASA otorga iPad básico 10ª gen + funda rugged  
**Inversión:** ~$7,500 MXN por unidad ($5,500 iPad + $2,000 accesorios)  
**Dónde se usa:** Bodega, recepción, carga de camiones  
**Condiciones:** Dos manos, polvo, golpes, WiFi (con respaldo offline)

**Principios:**
- Cards grandes visibles desde lejos
- Botones gigantes (manos sucias)
- Foto rápida (cámara siempre 1 tap)
- Captura báscula (input numérico grande)
- Lista por pasillo (camina una sola vez)
- Privacidad: NO ve precios de venta
- **Online normal, OFFLINE de emergencia**
  - Si se va la luz → seguir trabajando
  - Si se cae internet → seguir trabajando
  - Sync automático al recuperar conexión

**Estado actual:** 🟡 90% UI lista, falta offline

### C — Móvil del Chofer (BYOD + subsidio)

**Quién:** Choferes de ruta  
**Dispositivo:** Sus propios teléfonos  
**Subsidio:** ALMASA otorga ~$250 MXN/mes para saldo de datos  
**Dónde se usa:** Camión, calles CDMX, colonias remotas  
**Condiciones:** GPS importante, carretera, sin señal frecuente

**Principios:**
- Mapa grande (ruta del día)
- GPS background (tracking)
- Firmas táctiles fáciles
- Foto evidencia (entrega, sello, firma)
- Modo emergencia (un botón "incidente")
- Push críticos (cambio de ruta)
- Privacidad: NO ve precios ni costos
- **OFFLINE-FIRST obligatorio**
  - Ruta completa cargada al inicio del día
  - Entregas se marcan offline
  - Firmas + fotos se almacenan local
  - Sync al regresar a oficina

**Estado actual:** 🟡 70% UI lista, falta offline crítico

### D — Tablet del Admin (Jose)

**Quién:** Jose Antonio Gomez (Director General)  
**Dispositivo:** iPad Pro o desktop  
**Dónde se usa:** Oficina, casa, viajando  
**Condiciones:** Pensativo, decisiones, supervisión

**Principios:**
- Dashboard ejecutivo
- Aprobaciones rápidas (1 tap)
- Drilldown a detalle bajo demanda
- Notificaciones de excepciones (no operativas)
- Comparativas y tendencias
- Privacidad: VE TODO

**Estado actual:** ✅ 95% completo

---

## 6. Los 6 Principios Transversales

Aplican a las 4 personalidades.

### Principio 1 — Role-Driven UI
Login detecta rol → UI completa cambia.
Mismo app, experiencias distintas.
**Diferencia con Oracle:** No 4 apps. Una sola.

### Principio 2 — Offline-Capable Where It Matters
No todo offline (caro y complejo).
Solo donde el usuario PIERDE SEÑAL típicamente.

**Estrategia graduada:**
- Vendedor: offline-first (50% del tiempo sin señal)
- Chofer: offline-first (50% del tiempo sin señal)
- Almacenista: online normal, offline de emergencia (5%)
- Admin: online siempre (oficina)

### Principio 3 — Push by Urgency
3 niveles claros:

| Nivel | Comportamiento | Ejemplo |
|-------|----------------|---------|
| Crítico | Alarma + sonido + vibrar | Error fiscal, OC > $500K |
| Normal | Notificación silenciosa | Pedido aprobado, OC enviada |
| Info | Solo badge | Estadísticas diarias |

### Principio 4 — Captura Mínima, Provecho Máximo
1 acción del usuario = N datos extraídos.
- 1 foto = 5 datos (timestamp, GPS, contexto, hash, evidencia)
- 1 GPS = 3 audit logs (entrada bodega, salida, ruta)
- 1 firma = legal + auditoría + push automático

### Principio 5 — Privacidad por Rol
(Refuerzo del Principio #1 de Biblia v1.1)

| Rol | Ve precios venta | Ve costos | Ve comisiones |
|-----|------------------|-----------|---------------|
| Almacén | ❌ | ❌ | ❌ |
| Chofer | ❌ | ❌ | ❌ |
| Vendedor | ✅ | ❌ | Solo las suyas |
| Admin | ✅ | ✅ | ✅ todas |

### Principio 6 — Evidence-First Operations
Cada acción crítica genera evidencia automática.
- Foto + GPS + timestamp + firma = audit log inmutable
- Útil para SAT, disputas, mejora continua

---

## 7. Las 4 Brechas a Cerrar

### Brecha 1 — Offline Expandido (CRÍTICO)
**Hoy:** Solo vendedor tiene offline.
**Falta:** Almacenista (emergencia) y chofer (always).
**Impacto:** ALTO  
**Esfuerzo:** 3-4 semanas

### Brecha 2 — Service Worker (IMPORTANTE)
**Hoy:** No existe.
**Falta:** Cache assets + API + Manifest.json
**Impacto:** MEDIO  
**Esfuerzo:** 1-2 semanas

### Brecha 3 — Builds Nativos (IMPORTANTE)
**Hoy:** PWA web.
**Falta:** App Store + Play Store.
**Impacto:** ALTO (cuando crezca)  
**Esfuerzo:** 2-3 semanas + cuotas
- Apple Developer: $99 USD/año
- Google Play: $25 USD una vez

### Brecha 4 — Sync Background Universal (NICE)
**Hoy:** Solo vendedor tiene retry.
**Falta:** Sistema universal con queue.
**Impacto:** MEDIO  
**Esfuerzo:** 1-2 semanas

---

## 8. Estrategia Offline Graduada

ALMASA-OS no necesita offline universal (caro y complejo).
Necesita offline INTELIGENTE.

### Tier 1 — Online Normal
Default para Admin y Almacén (oficina con WiFi estable).
Realtime sync, cache mínimo, dependencia de red.

### Tier 2 — Offline de Emergencia (Almacén)
Cuando se va luz o cae internet en bodega:
- Recepciones se guardan local
- Carga de camiones continúa
- Captura báscula se almacena
- Fotos en cola
- Sync automático al recuperar

**Funciones offline obligatorias:**
- Recibir mercancía
- Cargar camiones
- Capturar peso
- Tomar fotos

### Tier 3 — Offline-First (Vendedor y Chofer)
Diseño para que TODO funcione sin internet.

**Para Vendedor:**
- Catálogo completo cacheado
- Lista de clientes offline
- Crear pedidos offline
- Sync al volver a oficina

**Para Chofer:**
- Ruta del día completa al inicio
- Entregas marcables offline
- Firmas almacenadas local
- Fotos en cola
- GPS log local
- Sync al regresar a oficina

---

## 9. Roadmap Mayo-Octubre 2026

| Mes | Entregas |
|-----|----------|
| Mayo (resto) | Documento /audit/10 generado |
| Junio | Service Worker + PWA Manifest + Apple Developer account |
| Julio | Offline almacenista + compra iPads (4 unidades) + capacitación |
| Agosto | Offline chofer + sistema subsidio saldo en nómina |
| Septiembre | Builds nativos iOS + Android + submit a stores |
| Octubre | Apps disponibles en stores + lanzamiento oficial |

**Tiempo total:** 5-6 meses  
**Inversión inicial:** ~$44,000 MXN
- Apps stores: $130/año (~$2,500 MXN)
- iPads (4 unidades): $30,000 MXN
- Fundas + accesorios: $8,000 MXN
- Subsidio choferes (4 × $250 × 6 meses): $6,000 MXN

---

## 10. Decisiones de Negocio Pendientes

### Decisión 1 — Subsidio mensual de saldo
- Vendedores: ¿$200, $250 o $300 MXN/mes?
- Choferes: ¿$200, $250 o $300 MXN/mes?
- Aplicación: ¿en nómina o reembolso?

### Decisión 2 — Modelo de iPad para almacén
- iPad básico 10ª gen ($5,500) — recomendado
- iPad Air ($9,000)
- iPad Pro ($15,000+)

### Decisión 3 — Política BYOD
- ¿Qué pasa si chofer rompe su teléfono?
- ¿ALMASA tiene 1-2 teléfonos de respaldo?
- ¿Subsidio de emergencia para reposición?

### Decisión 4 — Cuenta App Store/Play Store
- ¿Personal de Jose o como empresa?
- ¿Quién mantiene credenciales?

### Decisión 5 — Política de actualización
- ¿Auto-update o manual?
- ¿Forzar versión mínima?

### Decisión 6 — Tablets de respaldo
- ¿Comprar 1 iPad extra de respaldo?
- ¿Alquilar en caso de emergencia?

---

## 11. Conexión con Biblia v1.1

### Principio #1 (Privacidad por rol)
Este documento opera el Principio #1 con tabla concreta
por rol y dispositivo.

### Principio #2 (AirDrop digital)
Se materializa en sync automático entre roles.

### Principio #3 (Continuidad operativa)
Offline graduado garantiza continuidad ante fallas.

### Principio #10 (Users Before Perfection)
Estrategia graduada permite empezar sin offline universal.
80% perfecto > 100% imposible.

---

## 12. Recomendación final

ALMASA-OS está mejor posicionado que Oracle/SAP en móvil
EN LO QUE TIENE. Las 4 brechas son específicas y se cierran
en 5-6 meses con inversión modesta ($44K MXN).

**Orden recomendado de implementación:**
1. Fase A: Offline expandido (CRÍTICO) — Junio-Julio
2. Fase B: Service Worker (IMPORTANTE) — Junio
3. Fase C: Builds nativos (IMPORTANTE) — Septiembre
4. Fase D: Sync universal (NICE) — Octubre

Una vez completas las 4 fases, ALMASA-OS móvil será
**superior a Oracle Mobile en 9 de 12 dimensiones**.

---

*ALMASA-OS · Principios de Dispositivos · v1.0*  
*Generado el 10 de mayo de 2026*  
*Documento de diseño · Pendiente decisión y ejecución*  
*Una app, cuatro personalidades, cero excusas.*
