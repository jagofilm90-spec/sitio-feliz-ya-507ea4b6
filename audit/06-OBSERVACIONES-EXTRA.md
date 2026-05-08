# AUDITORÍA ALMASA-OS — 06 OBSERVACIONES EXTRA
**Fecha**: 8 mayo 2026

---

## Patrones curiosos

1. **Lovable genera commits con mensaje "Changes"** — De los ~100 commits del último mes, ~60% dicen solo "Changes". Los commits descriptivos son los hechos desde Claude Code. Esto hace que el git log sea casi inútil para rastrear qué cambió cuándo.

2. **El archivo más grande NO es código de negocio** — `types.ts` con 7,504 líneas es el más grande. Pero es auto-generado por Supabase. El archivo de negocio más grande es `Empleados.tsx` con 3,126 líneas — un monolito que debería ser 5-6 archivos.

3. **El build necesita 4GB de RAM** — `NODE_OPTIONS=--max-old-space-size=4096` en el script de build. Esto es señal de un bundle demasiado grande (201K líneas sin code splitting significativo).

4. **339 migraciones SQL** — Un número muy alto para un proyecto de ~1 año. Promedio de casi 1 migración por día. Muchas son micro-cambios (agregar 1 columna) en vez de migraciones consolidadas.

---

## Decisiones arquitectónicas que llaman la atención

1. **Capacitor 7.4 para iOS/Android** — El sistema está preparado para apps nativas. GPS background, push notifications, camera scanner — todo implementado con Capacitor. Esto es ambicioso y correcto para choferes/vendedores.

2. **Gmail OAuth full client** — No usan un servicio de email externo (SendGrid, Resend solo para 2 funciones). El sistema tiene un cliente de email COMPLETO con inbox, compose, reply, forward. Esto es raro en un ERP — pero para ALMASA (donde pedidos llegan por email a `pedidos@almasa.com.mx`) es brillante.

3. **IndexedDB offline queue** — El vendedor puede capturar pedidos sin internet. Se sincronizan al reconectar. Esto demuestra entendimiento profundo del caso de uso (vendedores en campo sin señal).

4. **ZKTeco biométrico integrado** — Los check-ins vienen de dispositivos físicos y se mapean a empleados. Edge function `zk-attendance` recibe los datos. Integración hardware real.

5. **IA en 7+ lugares** — Extracción de tarjeta circulación, parseo de emails a pedidos, sugerencia de rutas, normalización de catálogo, análisis de expedientes, parseo de CSF, auto-fill de datos fiscales. No es decorativo — cada uso resuelve un problema operativo real.

---

## Funcionalidades a medio implementar

1. **Lecaroz** — Sistema completo para un cliente específico (`cotizaciones_lecaroz`, `tandas_lecaroz`, `email_log_lecaroz`, 3 rutas dedicadas). Es un mini-módulo vertical dentro del ERP. Funcional pero acoplado — si Lecaroz se va, queda código muerto.

2. **Remisiones** — Carpeta `src/components/remisiones/` con 2 archivos. Parece un inicio de módulo que no se completó.

3. **Rentabilidad** — `/rentabilidad` existe como ruta con 1 componente. Probablemente placeholder para el análisis que la Biblia pide.

4. **Diseños de camioneta** — `/disenos-camioneta` es una ruta pública. Parece un tool de diseño de branding vehicular. Funcionalidad curiosa que no es core del ERP.

5. **`PedidosPorAutorizarTab.tsx`** — 1,133 líneas posiblemente dead code. No se importa en `Pedidos.tsx` actual pero el archivo existe completo.

---

## Oportunidades de optimización

1. **Dashboard 27 queries** — `Promise.all()` con 27 queries cada 60 segundos es brutal. Solución: un RPC `get_dashboard_kpis()` que haga todo server-side en 1 call.

2. **Proveedores v3 N+1** — `get_proveedor_score` se llama por cada proveedor en la lista. Solución: un RPC batch `get_proveedores_scores(ids[])`.

3. **types.ts regenerar** — Un `npx supabase gen types` eliminaría 500+ de los 1,154 `as any`. Es la mejora de DX con mejor ROI.

4. **Code splitting** — 201K líneas en un bundle. Lazy loading de rutas (`React.lazy`) reduciría el bundle inicial ~60%.

5. **Refactorizar top 5 monolitos** — Solo partiendo los 5 archivos >2,000 líneas en sub-componentes se mejoraría dramáticamente la mantenibilidad.

---

## Cosas que el dueño cree que no existen pero SÍ existen

1. **El CPP se calcula automáticamente** — Trigger `trg_actualizar_costo_promedio` existe desde enero 2026. Funciona cada vez que un lote cambia.

2. **Chat real-time con presencia** — No es solo mensajería. Tiene: 4 tipos de conversación, adjuntos, read receipts, indicador de online, broadcast.

3. **POS Mostrador** — `AlmacenVentasMostradorTab` es un punto de venta completo con carrito, IVA/IEPS, cambio, nota de venta imprimible.

4. **AI Route Optimization** — `SugerirRutasAIDialog` (806 líneas) llama a una edge function que sugiere rutas óptimas.

5. **Cumpleaños widget** — El dashboard muestra cumpleaños del día. Pequeño detalle de cultura laboral.

---

## Cosas que el dueño cree que existen pero NO existen

1. **Control de Combustible** — Cero. Solo un campo informativo `tipo_combustible`.
2. **Compensaciones/Adelantos** — Cero. Ni tabla ni UI.
3. **Productos Auxiliares** — No como módulo separado. `solo_uso_interno` flag es lo más cercano.
4. **Historial de Fumigaciones** — Solo última fecha. El histórico se sobreescribe.
5. **Factura detail view** — El botón "Ver detalle" en Facturas.tsx no hace nada (handler vacío).

---

## Preguntas abiertas

1. **¿El trigger `trg_actualizar_costo_promedio` sigue activo en producción?** — Existe en migraciones pero no puedo verificar si fue droppeado en alguna migración posterior o si Supabase lo desactivó. Solo se puede confirmar con `SELECT tgname FROM pg_trigger WHERE tgrelid = 'inventario_lotes'::regclass`.

2. **¿Las 14 edge functions sin verify_jwt son intencionales?** — Algunas (OAuth callbacks) necesitan ser públicas. Pero `gmail-api` debería ser privada. ¿Hay un proxy o middleware que no estoy viendo?

3. **¿Lovable maneja las migraciones automáticamente?** — 339 migraciones sugieren auto-generación. ¿Se aplican automáticamente al deploy o hay un paso manual?

4. **¿Cuántos usuarios activos tiene el sistema hoy?** — Sin acceso a `profiles` count ni `device_tokens` count, no sé si hay 1 usuario (Jose) o 20.

5. **¿El Edge Function `resumen-diario` está scheduled?** — Existe el código pero ¿hay un cron job que lo ejecute? Sin acceso a Supabase Dashboard no puedo verificar.

---

## Bug #1B — Devolución cliente: NO es bug, es funcionalidad faltante

### Diagnóstico (8 mayo 2026)

Inicialmente clasificado como bug, después del audit profundo se descubrió que es **funcionalidad faltante completa**, no un fix.

### Flujo real en operación

1. Chofer regresa de ruta
2. Cliente le devolvió mercancía (rota o no)
3. Chofer entrega los bultos al almacén
4. Almacenista decide qué hacer:
   - Bultos arreglables → entran al stock como recuperables
   - Después se arreglan → pasan a stock vendible
   - Lo irrecuperable → baja por merma

### Por qué la solución actual NO funciona

**Diseño incorrecto:** ConciliacionDetalleDialog (secretaria) intentaba decidir si reingresaba al inventario. Eso es decisión del almacén, no de secretaría.

**Conceptos revueltos:**
- Devolución administrativa (secretaria) ≠ Reingreso físico (almacén)
- Son dos momentos, dos personas, dos lugares diferentes

### Diseño correcto (para sesión futura)

**PASO 1 — Conciliación administrativa (secretaria):**
- Solo registra que el cliente devolvió X bultos
- Ajusta el pedido (cliente ya no debe esos)
- Marca como "pendiente recepción almacén"
- NO toca inventario

**PASO 2 — Recepción de devoluciones (almacenista):**
- Pantalla nueva: "Devoluciones pendientes"
- Almacenista recibe físicamente, inspecciona
- Por cada devolución decide:
  - Cuántos al stock (recuperables)
  - Cuántos a merma (irrecuperables)
- Sistema actualiza inventario_lotes
- Sistema marca devolución como "procesada"

### Hallazgos técnicos clave

- carga_productos.lote_id existe (trazabilidad del lote original)
- Cadena: devoluciones.entrega_id → entregas → carga_productos.lote_id
- devoluciones.reingresado_a_inventario existe pero nadie lo activa
- pedidos_detalles NO tiene producto_id directo, requiere JOIN

### Estimación

- Tiempo: 4-6 horas en sesión dedicada
- Componentes nuevos: 2-3 archivos
- RPC: registrar_reingreso_devolucion_cliente
- Pantalla almacén: NUEVA

### Estado: PAUSADO hasta sesión dedicada

Bug #1A (proveedor) sí se cerró con éxito.
Bug #1B requiere construcción de funcionalidad, no fix.
