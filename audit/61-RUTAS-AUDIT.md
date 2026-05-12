# Auditoría Rutas — 11 Mayo 2026

## Resumen

| Métrica | Valor |
|---------|-------|
| Total rutas | 68 |
| Core negocio | 45 |
| Públicas/Marketing | 6 |
| Dev/Debug | 4 |
| Redirects | 3 |
| Role-specific panels | 4 |
| Sub-rutas detail | 6 |

| Recomendación | Count |
|---------------|-------|
| KEEP intactas | 54 |
| KILL (debug/dev) | 4 |
| RENAME (limpiar v3) | 3 |
| MERGE (consolidar) | 2 |
| REVISAR (Josan decide) | 5 |

---

## Análisis por Grupo

### 1. Dashboard (/dashboard vs /dashboard-ejecutivo)

| Ruta | Roles | LoC | Propósito |
|------|-------|-----|-----------|
| /dashboard | admin,sec,vend,cont | 270 | Dashboard operativo existente (KPIs, gráficos ventas) |
| /dashboard-ejecutivo | admin,cont | 185 | Dashboard ejecutivo nuevo (resumen consolidado + reportes) |

**Veredicto: KEEP ambos.** Propósitos distintos. Dashboard operativo es para trabajo diario (vendedores, secretaria). Ejecutivo es para dirección (papá ve todo).

### 2. Compras (/compras/proveedores-v3)

| Ruta | Roles | LoC |
|------|-------|-----|
| /compras | admin,sec,cont | 206 |
| /compras/nueva-oc-v3 | admin,sec | 236 |
| /compras/proveedores-v3 | admin,sec,cont | 247 |
| /compras/proveedores-v3/:id | admin,sec,cont | 156 |

**No existen V1/V2 como archivos.** Los nombres "v3" son herencia del desarrollo pero son las únicas versiones.
**Veredicto: RENAME** — quitar "-v3" para limpieza (`/compras/proveedores`, `/compras/nueva-oc`).

### 3. Lecaroz (/lecaroz/*)

| Ruta | Roles | LoC |
|------|-------|-----|
| /lecaroz/cotizaciones | admin,sec,vend,cont | 244 |
| /lecaroz/cotizaciones/:id | admin,sec,vend,cont | 400 |
| /lecaroz/bandeja | admin,sec,vend | 500 |

**Veredicto: KEEP.** Módulo Lecaroz es cliente especial con flujo propio.

### 4. Vendedor (/vendedor vs /vendedor/analisis)

| Ruta | Roles | LoC |
|------|-------|-----|
| /vendedor | admin,vend | 509 |
| /vendedor/analisis | admin,vend | 75 |

**Veredicto: KEEP.** Panel principal + sub-página análisis. Patrón correcto.

### 5. Almacén (/almacen-tablet/*)

| Ruta | Roles | LoC |
|------|-------|-----|
| /almacen-tablet | admin,alm,g_alm | 412 |
| /almacen-tablet/carga-scan/:id? | admin,alm,g_alm | 1,362 |
| /almacen-tablet/surtir/:id | admin,alm,g_alm | 273 |

**Veredicto: KEEP.** Tres funciones distintas: dashboard, escaneo carga, surtido.

### 6. Chofer (/chofer vs /chofer/mi-ruta)

| Ruta | Roles | LoC |
|------|-------|-----|
| /chofer | admin,chofer | 282 |
| /chofer/mi-ruta | admin,chofer | 82 |
| /chofer/entrega/:id | admin,chofer | 238 |

**Veredicto: MERGE candidato.** `/chofer` (ChoferPanel) y `/chofer/mi-ruta` (MiRutaHoy) tienen funcionalidad similar. Evaluar si ChoferPanel se reemplaza por MiRutaHoy o si son complementarios.

### 7. Productos (/productos/*)

| Ruta | Roles | LoC |
|------|-------|-----|
| /productos | admin,sec,cont | 1,281 |
| /productos/modo-cobro | admin | 511 |
| /productos/historial-precios | admin | 468 |

**Veredicto: KEEP.** Sub-rutas admin-only para configuración avanzada.

### 8. Correos (/correos vs /correos/config)

| Ruta | Roles | LoC |
|------|-------|-----|
| /correos | admin,sec | 243 |
| /correos/config | admin,sec | 481 |

**Veredicto: KEEP.** Bandeja vs configuración. Patrón correcto.

---

## Páginas Debug/Dev (candidatas KILL)

| Ruta | LoC | Propósito | Recomendación |
|------|-----|-----------|---------------|
| /test-firma | 198 | Prueba firma digital canvas | **KILL** — ya integrado en chofer POD |
| /push-diagnostics | 87 | Debug push notifications | **KILL** — herramienta dev |
| /generate-assets | 57 | Genera screenshots app store | **KILL** — utilidad one-time |
| /disenos-camioneta | 262 | Genera diseños IA para camionetas | **REVISAR** — Josan decide si lo usa |

### Páginas Públicas/Marketing

| Ruta | LoC | Propósito | Recomendación |
|------|-----|-----------|---------------|
| /landing | 389 | Landing page ALMASA | **KEEP** |
| /tarjeta | 257 | Tarjeta digital contacto | **KEEP** — herramienta de ventas |
| /privacidad | 217 | Aviso de privacidad | **KEEP** — legal obligatorio |
| /soporte | 222 | Página soporte | **KEEP** |
| /app-mobile | 688 | Guía instalar PWA | **KEEP** |
| /auth | 431 | Login | **KEEP** |

### Redirects (KEEP)

| Ruta | Destino |
|------|---------|
| / | → /auth |
| /usuarios | → /configuracion |
| * | NotFound |

---

## Recomendaciones Finales

### KILL (4 rutas, ~604 LoC)
1. `/test-firma` — debug, ya integrado en POD chofer
2. `/push-diagnostics` — herramienta dev
3. `/generate-assets` — utilidad one-time
4. `/disenos-camioneta` — feature aislada (REVISAR con Josan)

### RENAME (3 rutas, 0 LoC cambia)
1. `/compras/proveedores-v3` → `/compras/proveedores`
2. `/compras/proveedores-v3/:id` → `/compras/proveedores/:id`
3. `/compras/nueva-oc-v3` → `/compras/nueva-oc`

### MERGE (evaluar, 1 par)
1. `/chofer` (ChoferPanel 282 LoC) + `/chofer/mi-ruta` (MiRutaHoy 82 LoC) — evaluar si ChoferPanel se depreca por MiRutaHoy

### KEEP intactas (60 rutas)
El resto del sistema es correcto: cada ruta tiene propósito distinto, roles adecuados, y sin duplicación.

---

*68 rutas auditadas. 4 candidatas KILL, 3 RENAME, 1 MERGE candidato.*
