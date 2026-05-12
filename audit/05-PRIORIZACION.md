# AUDITORÍA ALMASA-OS — 05 PRIORIZACIÓN
**Fecha**: 8 mayo 2026

---

## A) DISTINCIÓN BUGS vs GAPS

**BUG** = algo que existe y está mal → arreglar
**GAP** = algo que falta y la Biblia necesita → construir/extender

| Tipo | Cantidad |
|------|----------|
| Bugs reales (código roto) | 6 |
| Gaps arquitectónicos (falta construir) | 14 |

---

## B) TOP 6 BUGS REALES — ordenados por gravedad

---

### BUG 1 — Devoluciones a proveedor no reversan inventario
- **Técnico:** `agregar_devolucion_a_oc` solo ajusta `monto_devoluciones` en la OC. No decrementa `inventario_lotes.cantidad_disponible`, no inserta `inventario_movimientos`, no recalcula `productos.stock_actual`.
- **Impacto:** Stock permanentemente inflado. Si devuelves 100 bultos de azúcar, el sistema sigue diciendo que los tienes. Decisiones de compra basadas en inventario falso. Margen calculado sobre mercancía que ya no existe.
- **Archivos:** `src/components/almacen/DevolucionProveedorDialog.tsx`, migración `20260126191923` (función `agregar_devolucion_a_oc`)
- **Fix:** Extender la RPC para: 1) decrementar lote correspondiente vía `decrementar_lote`, 2) insertar movimiento tipo 'devolucion_proveedor', 3) el trigger existente recalculará stock y CPP automáticamente.
- **Esfuerzo:** 3-4 horas
- **¿Bloquea adopción?** SÍ — inventario poco confiable si hay devoluciones reales

---

### BUG 2 — NotificacionesCaducidad consulta tabla equivocada
- **Técnico:** Consulta `inventario_movimientos` (entradas históricas) en vez de `inventario_lotes` (stock actual). Lotes consumidos siguen generando alertas. Lotes creados sin movimiento no aparecen.
- **Impacto:** Alertas fantasma (producto ya vendido aparece como "por caducar") y alertas faltantes (lote real no aparece). El almacenista desconfía del sistema.
- **Archivos:** `src/components/NotificacionesCaducidad.tsx:~línea 30`
- **Fix:** Cambiar `.from("inventario_movimientos")` a `.from("inventario_lotes").select(...).gt("cantidad_disponible", 0).not("fecha_caducidad", "is", null).lte("fecha_caducidad", fecha30Dias)`.
- **Esfuerzo:** 1 hora
- **¿Bloquea adopción?** NO directo, pero erosiona confianza

---

### BUG 3 — gmail-api edge function sin verify_jwt
- **Técnico:** `supabase/config.toml` tiene `verify_jwt = false` para `gmail-api`. Cualquiera con la URL del proyecto puede invocar la función y enviar emails desde las cuentas corporativas de ALMASA sin autenticación.
- **Impacto:** Riesgo de abuso de email (spam, phishing desde cuentas de ALMASA). Potencial pérdida de reputación de dominio.
- **Archivos:** `supabase/config.toml:~línea 25`
- **Fix:** Cambiar a `verify_jwt = true`. El frontend ya envía el JWT en cada invocación — solo falta que el backend lo exija.
- **Esfuerzo:** 15 minutos
- **¿Bloquea adopción?** SÍ — riesgo de seguridad activo

---

### BUG 4 — Facturado boolean desincronizado de CFDI
- **Técnico:** `pedidos.facturado = true` puede existir sin un registro en tabla `facturas` con CFDI timbrado. Son flujos paralelos sin constraint.
- **Impacto:** Reportes de facturación incorrectos. Un pedido puede aparecer como "facturado" cuando en realidad nunca se emitió CFDI.
- **Archivos:** Múltiples — `Pedidos.tsx`, `GenerarFacturaDialog.tsx`, `Facturas.tsx`
- **Fix:** Opción A: Trigger que sincronice (al crear factura → marca pedido.facturado). Opción B: Eliminar `pedidos.facturado` y derivarlo de la existencia de factura vinculada. Opción B es más limpia pero requiere cambiar queries.
- **Esfuerzo:** 4-6 horas
- **¿Bloquea adopción?** NO directo (pocas facturas en piloto), pero SÍ antes de adopción contable

---

### BUG 5 — Faltantes UI desconectada de tabla faltantes_proveedor
- **Técnico:** `FaltantesPendientesTab` usa `ordenes_compra_entregas.origen_faltante`. Los hooks v3 (`useProveedoresV3`, `get_proveedor_score`) consultan `faltantes_proveedor`. No hay sincronización — un faltante registrado en la UI nunca aparece en el score del proveedor.
- **Impacto:** Score de confiabilidad del proveedor siempre reporta 0 faltantes. Decisiones de compra basadas en datos incompletos.
- **Archivos:** `src/components/compras/FaltantesPendientesTab.tsx`, `src/hooks/useProveedoresV3.ts`
- **Fix:** Al registrar faltante en UI (cuando `AlmacenRecepcionSheet` detecta diferencia), insertar también en `faltantes_proveedor`. Idealmente vía trigger en `ordenes_compra_entregas` cuando `origen_faltante` cambia a `true`.
- **Esfuerzo:** 3-4 horas
- **¿Bloquea adopción?** NO directo, pero SÍ para que Proveedores v3 sea útil

---

### BUG 6 — Dual path de recepción
- **Técnico:** `RegistrarRecepcionDialog` (compras) y `AlmacenRecepcionSheet` (almacén) ambos registran recepciones, pero solo el de almacén crea `inventario_lotes`. Si secretaria usa el de compras, el stock no se actualiza.
- **Impacto:** OC marcada como "recibida" sin que el inventario lo refleje. Stock desactualizado.
- **Archivos:** `src/components/compras/RegistrarRecepcionDialog.tsx`, `src/components/almacen/AlmacenRecepcionSheet.tsx`
- **Fix:** Opción A: Que `RegistrarRecepcionDialog` también cree lotes. Opción B: Deshabilitar/ocultar el dialog legacy y forzar uso exclusivo del flujo almacén. Opción B es más segura y más rápida.
- **Esfuerzo:** 2 horas (opción B)
- **¿Bloquea adopción?** SÍ — si no se establece regla operativa clara

---

## C) TOP GAPS ARQUITECTÓNICOS — ordenados por valor

---

### GAP 1 — CPP sin gastos asociados
- **Hoy:** CPP = promedio ponderado de `inventario_lotes.precio_compra` (solo precio proveedor)
- **Biblia:** CPP debería incluir cuadrilla, flete de entrada, aduana, pedimento, tarifas de transporte rentado
- **Esfuerzo:** 5-8 días (tabla gastos_recepcion + prorrateo + actualizar fórmula CPP)
- **Valor:** ALTO — sin esto el margen real es menor de lo que reporta el sistema
- **Bloquea otros:** Sí — Análisis de Rentabilidad real depende de esto

### GAP 2 — Módulo #30 Control de Combustible
- **Hoy:** Solo campo `tipo_combustible` informativo en vehículos
- **Biblia:** Registro de cargas, consumo por ruta, rendimiento km/litro, alertas
- **Esfuerzo:** 10-15 días
- **Valor:** ALTO — gasto operativo diario significativo sin control
- **Bloquea otros:** No

### GAP 3 — Módulo #29 Compensaciones Internas y Adelantos
- **Hoy:** No existe. Cero tablas, cero UI
- **Biblia:** Adelantos de nómina, préstamos internos, compensaciones, descuentos por nómina
- **Esfuerzo:** 10-15 días
- **Valor:** ALTO — dinero que sale sin registro formal
- **Bloquea otros:** No

### GAP 4 — Cierre del Día/Mes automatizado
- **Hoy:** No existe. Dashboard muestra datos en vivo pero no hay snapshot
- **Biblia:** Corte diario con totales, corte mensual, comparativos, PDF para gerencia
- **Esfuerzo:** 5-8 días
- **Valor:** ALTO — papá de Jose necesita resumen diario
- **Bloquea otros:** No

### GAP 5 — Resumen Diario PDF para gerencia
- **Hoy:** Edge function `resumen-diario` existe pero no se verifica si está completa
- **Biblia:** PDF automático al final del día con KPIs, enviado por email
- **Esfuerzo:** 3-5 días
- **Valor:** ALTO — puente entre papel y digital para la dirección
- **Bloquea otros:** No

### GAP 6 — Análisis de Rentabilidad con gastos reales
- **Hoy:** `/rentabilidad` existe (1 componente) pero usa `ultimo_costo_compra`, no CPP real con gastos
- **Biblia:** Margen real por producto, cliente, ruta, periodo — con gastos incluidos
- **Esfuerzo:** 5-8 días (después de GAP 1)
- **Valor:** ALTO — decisiones de precio basadas en datos reales
- **Bloquea otros:** Depende de GAP 1

### GAP 7 — Fumigaciones completo
- **Hoy:** Solo tracking de última fecha (50% completitud). Sin historial, sin scheduling, sin frecuencia configurable, sin push
- **Biblia:** Historial completo, programación, frecuencia por producto, alertas push
- **Esfuerzo:** 3-5 días
- **Valor:** MEDIO — compliance y auditoría
- **Bloquea otros:** No

### GAP 8 — Eliminar concepto pre-facturas
- **Hoy:** No existe "pre-factura" en código. Lo que existe es `pedidos.facturado` boolean separado de CFDI real.
- **Biblia:** Flujo limpio: pedido → nota de venta → factura CFDI (sin estado intermedio ambiguo)
- **Esfuerzo:** 2-3 días (es más limpieza que construcción)
- **Valor:** MEDIO
- **Bloquea otros:** No

### GAP 9 — SKU dual Lecaroz
- **Hoy:** Sistema Lecaroz existe (`cotizaciones_lecaroz`, `tandas_lecaroz`, etc.) pero sin SKU dual (código ALMASA + código Lecaroz por producto)
- **Biblia:** Cada producto tiene su código ALMASA y opcionalmente un código del cliente
- **Esfuerzo:** 2-3 días
- **Valor:** MEDIO — específico para 1 cliente grande
- **Bloquea otros:** No

### GAP 10 — Matriz Continuidad Operativa
- **Hoy:** No existe
- **Biblia:** ¿Quién cubre a quién si alguien falta? Cross-training matrix
- **Esfuerzo:** 3-5 días
- **Valor:** MEDIO
- **Bloquea otros:** No

### GAP 11 — Tutoriales por Rol
- **Hoy:** No existe. Sin onboarding digital
- **Biblia:** Guías interactivas por rol al primer login
- **Esfuerzo:** 5-8 días
- **Valor:** MEDIO — crítico para adopción pero no para funcionalidad
- **Bloquea otros:** No, pero acelera Fase 6

### GAP 12 — Centralización de 6 cuentas de email
- **Hoy:** Gmail OAuth funciona con múltiples cuentas. La descentralización es operativa, no técnica
- **Biblia:** Todas las comunicaciones desde cuentas corporativas centralizadas
- **Esfuerzo:** 1-2 días (es config, no código)
- **Valor:** BAJO (ya funciona, solo falta política operativa)
- **Bloquea otros:** No

### GAP 13 — Portal Cliente mobile-optimized
- **Hoy:** Funcional pero sin mobile breakpoints, query rota, sin route guard
- **Biblia:** Portal responsive completo
- **Esfuerzo:** 3-5 días
- **Valor:** MEDIO
- **Bloquea otros:** No

### GAP 14 — types.ts desactualizado
- **Hoy:** 1,154 usos de `any`, múltiples columnas agregadas por Dashboard no reflejadas
- **Biblia:** Types sincronizados con BD
- **Esfuerzo:** 30 minutos (regenerar) + 2-3 días (limpiar `as any`)
- **Valor:** MEDIO (developer experience, previene bugs)
- **Bloquea otros:** No, pero facilita todo lo demás

---

## D) MÓDULOS LISTOS PARA PRODUCCIÓN (≥90%)

| Módulo | % | Justificación |
|--------|---|---------------|
| Respaldos | 95% | Simple, funcional, sin bugs |
| Dashboard | 92% | 27 KPIs, realtime, role-based. Solo necesita optimización de queries |
| Empleados | 92% | CRUD completo, firma digital, expediente IA. Bug #11 (documentos state) es menor |
| Clientes | 90% | Import Aspel, geocodificación, grupos, créditos. Maduro |
| Rutas | 90% | IA optimization, GPS live, 8 tabs. Solo naming inconsistency |

---

## E) MÓDULOS A RECONSTRUIR

| Módulo | % actual | Recomendación |
|--------|----------|---------------|
| Fumigaciones | 50% | **Reconstruir.** El módulo actual es un placeholder. Sin historial ni scheduling, no sirve para compliance real. |
| Chat | 80% | **Refactorizar**, no reconstruir. 1,295 líneas en 1 archivo monolítico. Extraer a 5-6 componentes. Funcionalidad está, estructura no. |

Ningún otro módulo necesita reconstrucción. Los demás necesitan fixes puntuales o extensiones, no rewrite.

---

## F) CAMINO CRÍTICO — SECUENCIA RECOMENDADA

### FASE 1 — Cerrar Bugs Críticos (2-3 semanas)

| Orden | Bug | Esfuerzo | Por qué este orden |
|-------|-----|----------|-------------------|
| 1 | gmail-api verify_jwt | 15 min | Seguridad. Se hace primero siempre. |
| 2 | Devoluciones no reversan inventario | 3-4h | Integridad de datos. Cada día que pase infla más el stock. |
| 3 | NotificacionesCaducidad query | 1h | Fix trivial, impacto inmediato en confianza. |
| 4 | Dual path recepción (ocultar legacy) | 2h | Regla operativa: solo almacén recibe. |
| 5 | Faltantes sync | 3-4h | Habilita Proveedores v3 completo. |
| 6 | Facturado vs CFDI | 4-6h | Antes de adopción contable. |

**Total Fase 1: ~15-20 horas de desarrollo efectivo.**

### FASE 2 — Módulos Faltantes #29 y #30 (4-6 semanas)

**#30 Combustible PRIMERO.** Razón: es gasto diario recurrente que afecta a 14+ vehículos y 5+ choferes. El control no existe y el dinero sale sin registro. #29 Compensaciones es importante pero menos frecuente.

| Módulo | Esfuerzo | Tablas nuevas | UI |
|--------|----------|---------------|-----|
| #30 Combustible | 10-15 días | cargas_combustible, rendimiento_vehiculo | Tab en Rutas + Reporte |
| #29 Compensaciones | 10-15 días | anticipos, compensaciones, prestamos | Módulo nuevo + tab en Empleados |

### FASE 3 — Extensiones Arquitectónicas (4-6 semanas)

| Extensión | Esfuerzo | Dependencia |
|-----------|----------|-------------|
| CPP con gastos asociados | 5-8 días | Ninguna |
| Análisis de Rentabilidad real | 5-8 días | CPP con gastos |
| Limpiar facturado/CFDI flow | 2-3 días | Bug #4 cerrado |
| SKU dual Lecaroz | 2-3 días | Ninguna |

### FASE 4 — Sub-módulos Transversales (3-4 semanas)

| Sub-módulo | Esfuerzo |
|------------|----------|
| Fumigaciones rebuild | 3-5 días |
| Cierre del Día automático | 5-8 días |
| Resumen Diario PDF | 3-5 días |
| Matriz Continuidad | 3-5 días |

### FASE 5 — Centralización y Polish (2-3 semanas)

| Tarea | Esfuerzo |
|-------|----------|
| Regenerar types.ts + limpiar top 50 `any` | 3 días |
| Refactorizar Chat.tsx (1 → 6 archivos) | 2 días |
| Portal Cliente mobile + fix query | 3 días |
| Tutoriales por Rol (v1 básico) | 5 días |
| Limpiar 126 console.log | 1 día |

### FASE 6 — Adopción por Equipos (8-12 semanas)

| Equipo | Semana | Módulos |
|--------|--------|---------|
| Oficina (Jose + secretarias) | 1-2 | Productos, Compras v3, Lista Precios |
| Almacén (jefes + almacenistas) | 3-4 | AlmacenTablet, Inventario, Recepciones |
| Choferes + Vendedores | 5-8 | ChoferPanel, VendedorPanel, Pedidos |
| Clientes piloto | 9-12 | Portal Cliente (3-5 clientes primero) |

**TOTAL ESTIMADO: 6-9 meses hasta adopción completa.**

---

## G) RECOMENDACIÓN HONESTA

### 1. ¿Por dónde empezar PRIMERO?
`gmail-api` verify_jwt. Son 15 minutos. Luego Bug #2 (devoluciones inventario). Es el que más daño acumula con el tiempo.

### 2. ¿Cuál es el bug que si NO se arregla, NO se debe lanzar adopción?
Bug #1 (devoluciones no reversan inventario). Si ALMASA empieza a operar con el sistema y devuelve mercancía a un proveedor, el inventario quedará inflado permanentemente. Todas las decisiones de compra basadas en ese inventario serán incorrectas.

### 3. ¿Cuál es el GAP arquitectónico más impactante?
CPP sin gastos asociados. Sin esto, cada vez que Jose vea un margen de 15%, el real puede ser 8% después de flete y cuadrilla. Las decisiones de precio se toman con datos incompletos.

### 4. Entre #29 (Anticipos) y #30 (Combustible), ¿cuál construir PRIMERO?
**#30 Combustible.** Razón: es gasto diario, afecta a toda la flota (14+ vehículos), no hay NINGÚN control hoy. Anticipos son menos frecuentes y menores en monto.

### 5. ¿El sistema está al 70%, 80% o 90% de listo para adopción real?
**78%.** Datos: 27 de 30 módulos existen (90%), pero completitud promedio es 82%, hay 6 bugs abiertos de integridad de datos, 3 módulos no existen, y el CPP no incluye gastos reales. Para adopción de oficina (Fase 6, equipo 1) está más cerca del 85% — los bugs críticos se pueden cerrar en 2-3 semanas.

### 6. ¿Hay algún módulo que esté funcionando y NO debamos tocar?
- **Dashboard** — 92%, funciona bien, déjalo
- **Respaldos** — 95%, perfecto como está
- **Asistencia + ZK** — 88%, funcional, no tocar hasta que haya problema real
- **Cotizaciones** — 85%, funciona para el flujo actual

### 7. ¿Hay funcionalidad duplicada que unificar?
Sí, 3 casos:
1. **Wizard OC legacy vs v3** — Unificar en v3 cuando esté al 100%
2. **RegistrarRecepcionDialog vs AlmacenRecepcionSheet** — Eliminar el legacy
3. **Proveedores classic vs v3** — Unificar cuando v3 madure
4. **Fumigaciones.tsx vs AlmacenFumigacionesTab** — Misma data, dos UIs sin lock

### 8. ¿Cuánto tiempo realista hasta la PRIMERA fase de adopción?
**4-6 semanas.** 2-3 semanas para cerrar los 6 bugs + 1-2 semanas de testing + 1 semana de capacitación oficina. La primera fase es oficina (Jose + secretarias) con Productos + Compras + Lista de Precios.

---

## H) RESUMEN EJECUTIVO — Para Josan

1. ALMASA-OS tiene 201,779 líneas de código, 70 tablas, 20 RPCs, 53 edge functions y 28 módulos funcionando. Es un sistema ENORME.

2. La auditoría encontró 6 bugs reales y 14 gaps arquitectónicos entre lo que tienes hoy y lo que dice la Biblia.

3. El bug más grave: las devoluciones a proveedor no descuentan del inventario. Cada devolución infla tu stock y te hace creer que tienes más mercancía de la que realmente hay.

4. El gap más valioso: el costo promedio no incluye flete, cuadrilla ni aduana. Tus márgenes reales son menores de lo que el sistema reporta.

5. Lo más fuerte: el módulo de Almacén Tablet (20,000 líneas, QR scanner, firma digital, GPS) y el Dashboard (27 KPIs en tiempo real). Son de nivel enterprise.

6. Lo más débil: Fumigaciones (medio construido), Control de Combustible (no existe), y Compensaciones (no existe). Son hoyos operativos sin cobertura digital.

7. Para que oficina (tú + secretarias) arranque a usar el sistema: 4 a 6 semanas arreglando bugs y capacitando.

8. Para que TODO el equipo (almacén, choferes, vendedores, clientes) esté operando: 6 a 9 meses.

9. Mi impresión: el sistema es impresionantemente ambicioso y está más avanzado de lo que cualquiera pensaría — pero necesita cerrar bugs de integridad de datos antes de que la operación real confíe en él.

10. Mañana mismo: cambiar `verify_jwt = true` en gmail-api (15 min) y empezar el fix de devoluciones + inventario (4 horas).
