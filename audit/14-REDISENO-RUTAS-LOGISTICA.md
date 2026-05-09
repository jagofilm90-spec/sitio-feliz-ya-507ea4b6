# Rediseño de Rutas y Logística — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría de logística + decisiones operativas + metodología "Pensar como Oracle"  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** El último kilómetro decide la utilidad real.

---

## 1. La filosofía

Una promesa cumplida en mayoreo no es solo "el producto llegó". 
Es: "el producto llegó a tiempo, al cliente correcto, con la 
cantidad correcta, con la firma correcta, sin daños, y sabemos 
exactamente cuánto nos costó hacerlo".

ALMASA tiene 14 vehículos, choferes asignados, ayudantes internos 
y externos. Cada ruta cruza varias colonias, varios clientes, varios 
horarios. Si el sistema no rastrea costo real de cada entrega, 
ALMASA puede estar perdiendo dinero con clientes que parecen 
rentables.

> Principio rector: "Una ruta sin costo real distribuido no es 
> una ruta optimizada, es un misterio costoso."

Este documento define:
- Cómo se planean rutas (manual + IA)
- Cómo se cargan camiones (multi-persona)
- Cómo se entregan pedidos (con evidencia)
- Cómo se manejan incidencias (sistema formal)
- Cómo se distribuyen costos (50% peso + 50% valor)
- Cómo se mide utilidad REAL por pedido

---

## 2. Estado actual de logística

ALMASA-OS Rutas es uno de los módulos MÁS MADUROS del sistema:

- **26 archivos** en /components/rutas (~10,691 líneas)
- **6 archivos** en /components/chofer (~1,242 líneas)
- **39 campos** en tabla rutas
- **21 campos** en tabla entregas
- **14 campos** en tabla carga_productos

| Capacidad | Estado | Detalle |
|-----------|--------|---------|
| Tabla rutas (39 campos) | ✅ Completo | Personas, vehículo, carga, firmas, km |
| Tabla entregas (21 campos) | ✅ Completo | Pedido→ruta, orden, firma, papeles |
| Tabla carga_productos | ✅ Completo | Producto→lote→entrega con FK movimiento |
| Zonas geográficas | ✅ Configurables | nombre, es_foranea, region, cercanas[] |
| Crear ruta manual | ✅ PlanificadorRutas (948 lín) | Admin arma noche anterior |
| IA suggest routes | ✅ Edge function | Google Maps optimizeWaypoints |
| Drag & drop pedidos→ruta | ✅ Completo | Filtros y orden |
| Multi-persona ruta | ✅ ÚNICO | Chofer + almacenista + ayudantes int + ext |
| Ayudantes externos | ✅ Tabla propia | tarifa_por_viaje |
| Mapa global clientes | ✅ MapaGlobalSucursales | Todos los clientes visibles |
| Mapa en vivo ruta | ✅ MapaRutaEnVivo | GPS chofer real time |
| GPS schedule-aware | ✅ | Lun-Vie 8am-8pm, 30s |
| Firmas (3 contextos) | ✅ Canvas | Almacenista carga, chofer carga, cliente entrega |
| Evidencia carga | ✅ Storage | carga_evidencias bucket |
| Kilometraje | ✅ | Inicial, final, recorridos |
| Sellos numerados | ✅ | lleva_sellos, numero_sello_salida |
| Posponer ruta | ✅ Dialog | Reagendar completo |
| Reasignar personal | ✅ Dialog | Cambiar chofer/ayudante |
| Notificaciones push | ✅ useRouteNotifications | Al chofer |
| Print template PDF | ✅ RutaPrintTemplate | Imprimir ruta |
| Devolución en ruta | ❌ Bug #1B | No existe |
| Sistema incidencias | ❌ NO existe | Sin bitácora formal |
| Costos de ruta | ❌ NO existe | Sin utilidad real por pedido |
| Offline chofer | 🟡 GPS sí, entregas no | Service Worker pendiente |
| Carga conectada báscula | 🟡 Falta integración | Alineado con /audit/12 |

**Conclusión:** Módulo enterprise-grade. 4 brechas específicas a cerrar.

**Hallazgo:** ALMASA tiene capacidades que Oracle/SAP NO tienen 
(IA suggest, multi-persona, ayudantes externos, sellos numerados).

---

## 3. Estándar Oracle / SAP / NetSuite

Los grandes ERPs manejan logística con 7 conceptos:

### Concepto 1 — Ruta = Conjunto de Paradas Ordenadas
No solo "vehículo va de A a B". Es A → B → C → D con orden óptimo.

### Concepto 2 — Optimización de Orden
Algoritmo "Traveling Salesman". Minimiza km y tiempo.

### Concepto 3 — Asignación Inteligente
Pedido → Ruta basado en zona, capacidad, horario, prioridad.

### Concepto 4 — Ventanas de Entrega
Cliente acepta entrega 9-12 o 14-17. Sistema respeta.

### Concepto 5 — Tracking Tiempo Real
Cliente puede ver "tu pedido viene". Admin ve "todos los choferes".

### Concepto 6 — Evidencia en Entrega
ePOD: foto + firma + GPS + timestamp.

### Concepto 7 — Incidencia y Reagendamiento
Cliente no estaba: reagendar. Vehículo falla: redistribuir.

### Estrategias específicas

**Oracle Transportation Management:** AI route optimization, 
geofencing, driver scoring, fuel optimization.

**SAP Transportation Management:** Freight orders, tendering, 
visibility maps, cost calculation engine.

**NetSuite WMS / Delivery:** Pick/Pack/Ship, mobile delivery 
app, customer notifications.

---

## 4. Por qué ALMASA-OS gana

| Dimensión | Oracle/SAP | ALMASA-OS | Ganador |
|-----------|-----------|-----------|---------|
| Planificación rutas | ✅ | ✅ | EMPATE |
| Optimización orden | ✅ | ✅ Google Maps | EMPATE |
| IA sugerencia rutas | 🟡 | ✅ ÚNICO | ALMASA |
| Multi-persona ruta | 🟡 | ✅ ÚNICO | ALMASA |
| Ayudantes externos | ❌ | ✅ ÚNICO | ALMASA |
| Mapa en vivo | ✅ | ✅ | EMPATE |
| GPS tracking | ✅ | ✅ schedule-aware | ALMASA |
| Firma carga + entrega | ✅ | ✅ 3 contextos | EMPATE |
| Sellos numerados | 🟡 | ✅ | ALMASA |
| Kilometraje tracking | ✅ | ✅ | EMPATE |
| Posponer ruta | ✅ | ✅ | EMPATE |
| Reasignar personal | ✅ | ✅ | EMPATE |
| Zonas geográficas | ✅ | ✅ con cercanía | ALMASA |
| Devolución en ruta | ✅ | ❌ → planeado | ORACLE |
| Sistema incidencias | ✅ | ❌ → planeado | ORACLE |
| Costos integrados | ✅ | ❌ → planeado | ORACLE |
| Offline chofer | 🟡 | 🟡 | EMPATE |
| Costo licencia | $$$$ | $0 | ALMASA |

**Marcador final (post-implementación):**
ALMASA gana: 6 dimensiones (incluyendo 4 ÚNICOS)
Oracle gana: 3 dimensiones
Empate: 9 dimensiones

ALMASA tiene 4 ventajas únicas que Oracle/SAP NO modelan:
1. IA suggest routes con Google Maps
2. Multi-persona configurable (chofer + almacenista + ayudantes)
3. Ayudantes externos con tarifa por viaje
4. Sellos numerados de seguridad

---

## 5. Las 4 Brechas Críticas

### Brecha 1 — Costos de Ruta y Utilidad Real por Pedido (CRÍTICO)

**Problema:** ALMASA sabe cuánto VENDIÓ. NO sabe cuánto COSTÓ ENTREGAR. 
Sin esto, no sabe utilidad real por cliente. Puede estar perdiendo 
dinero con clientes "rentables en papel".

**Solución:**

```sql
-- Tabla de costos por ruta
CREATE TABLE ruta_costos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id UUID NOT NULL UNIQUE REFERENCES rutas(id),
  
  -- Costos directos
  gasolina_litros NUMERIC,
  gasolina_precio_litro NUMERIC,
  gasolina_costo NUMERIC GENERATED ALWAYS AS 
    (gasolina_litros * gasolina_precio_litro) STORED,
  
  casetas_costo NUMERIC DEFAULT 0,
  viaticos_chofer NUMERIC DEFAULT 0,
  viaticos_ayudantes NUMERIC DEFAULT 0,
  costo_ayudante_externo NUMERIC DEFAULT 0,
  multas_costo NUMERIC DEFAULT 0,
  otros_costos NUMERIC DEFAULT 0,
  notas_otros TEXT,
  
  -- Costos prorrateados (calculados)
  sueldo_proporcional_chofer NUMERIC,
  sueldo_proporcional_ayudantes NUMERIC,
  depreciacion_vehiculo NUMERIC,
  mantenimiento_prorrateado NUMERIC,
  
  -- Total
  costo_total NUMERIC GENERATED ALWAYS AS (
    COALESCE(gasolina_costo, 0) + COALESCE(casetas_costo, 0) +
    COALESCE(viaticos_chofer, 0) + COALESCE(viaticos_ayudantes, 0) +
    COALESCE(costo_ayudante_externo, 0) + COALESCE(multas_costo, 0) +
    COALESCE(otros_costos, 0) + COALESCE(sueldo_proporcional_chofer, 0) +
    COALESCE(sueldo_proporcional_ayudantes, 0) +
    COALESCE(depreciacion_vehiculo, 0) + COALESCE(mantenimiento_prorrateado, 0)
  ) STORED,
  
  -- Distribución
  distribucion_completada BOOLEAN DEFAULT false,
  distribuido_por UUID,
  distribuido_en TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de costos distribuidos por pedido
CREATE TABLE pedido_costos_logistica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL UNIQUE REFERENCES pedidos(id),
  ruta_id UUID NOT NULL REFERENCES rutas(id),
  
  -- Pesos en la distribución
  peso_pedido_kg NUMERIC NOT NULL,
  peso_total_ruta_kg NUMERIC NOT NULL,
  peso_porcentaje NUMERIC GENERATED ALWAYS AS 
    (peso_pedido_kg / NULLIF(peso_total_ruta_kg, 0) * 100) STORED,
  
  valor_pedido NUMERIC NOT NULL,
  valor_total_ruta NUMERIC NOT NULL,
  valor_porcentaje NUMERIC GENERATED ALWAYS AS 
    (valor_pedido / NULLIF(valor_total_ruta, 0) * 100) STORED,
  
  -- Costo asignado (50% peso + 50% valor)
  costo_total_ruta NUMERIC NOT NULL,
  costo_logistica_pedido NUMERIC GENERATED ALWAYS AS (
    (costo_total_ruta * 0.5 * peso_pedido_kg / NULLIF(peso_total_ruta_kg, 0)) +
    (costo_total_ruta * 0.5 * valor_pedido / NULLIF(valor_total_ruta, 0))
  ) STORED,
  
  -- Override manual si aplica
  costo_override NUMERIC,
  motivo_override TEXT,
  
  calculado_en TIMESTAMPTZ DEFAULT now(),
  calculado_por UUID
);

-- RPC para distribuir costos de una ruta
CREATE OR REPLACE FUNCTION distribuir_costos_ruta(p_ruta_id UUID)
RETURNS TABLE (
  pedido_id UUID,
  cliente_nombre TEXT,
  peso_kg NUMERIC,
  valor NUMERIC,
  costo_logistica NUMERIC,
  utilidad_bruta NUMERIC,
  utilidad_real NUMERIC,
  margen_real_pct NUMERIC
) AS $$
DECLARE
  v_costo_total NUMERIC;
  v_peso_total NUMERIC;
  v_valor_total NUMERIC;
  v_num_pedidos INTEGER;
BEGIN
  SELECT costo_total INTO v_costo_total 
  FROM ruta_costos WHERE ruta_id = p_ruta_id;
  
  SELECT 
    SUM(p.peso_total_kg),
    SUM(p.precio_real_total),
    COUNT(*)
  INTO v_peso_total, v_valor_total, v_num_pedidos
  FROM pedidos p
  JOIN entregas e ON e.pedido_id = p.id
  WHERE e.ruta_id = p_ruta_id;
  
  IF v_num_pedidos = 1 THEN
    INSERT INTO pedido_costos_logistica (
      pedido_id, ruta_id, peso_pedido_kg, peso_total_ruta_kg,
      valor_pedido, valor_total_ruta, costo_total_ruta
    )
    SELECT 
      p.id, p_ruta_id, p.peso_total_kg, p.peso_total_kg,
      p.precio_real_total, p.precio_real_total, v_costo_total
    FROM pedidos p
    JOIN entregas e ON e.pedido_id = p.id
    WHERE e.ruta_id = p_ruta_id;
  ELSE
    INSERT INTO pedido_costos_logistica (
      pedido_id, ruta_id, peso_pedido_kg, peso_total_ruta_kg,
      valor_pedido, valor_total_ruta, costo_total_ruta
    )
    SELECT 
      p.id, p_ruta_id, p.peso_total_kg, v_peso_total,
      p.precio_real_total, v_valor_total, v_costo_total
    FROM pedidos p
    JOIN entregas e ON e.pedido_id = p.id
    WHERE e.ruta_id = p_ruta_id;
  END IF;
  
  UPDATE ruta_costos 
  SET distribucion_completada = true,
      distribuido_en = now()
  WHERE ruta_id = p_ruta_id;
  
  RETURN QUERY
  SELECT 
    pcl.pedido_id,
    c.nombre AS cliente_nombre,
    pcl.peso_pedido_kg,
    pcl.valor_pedido,
    pcl.costo_logistica_pedido,
    p.precio_real_total - p.costo_producto_total AS utilidad_bruta,
    p.precio_real_total - p.costo_producto_total - pcl.costo_logistica_pedido AS utilidad_real,
    ((p.precio_real_total - p.costo_producto_total - pcl.costo_logistica_pedido) / 
     NULLIF(p.precio_real_total, 0) * 100) AS margen_real_pct
  FROM pedido_costos_logistica pcl
  JOIN pedidos p ON p.id = pcl.pedido_id
  JOIN clientes c ON c.id = p.cliente_id
  WHERE pcl.ruta_id = p_ruta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vista de utilidad real por pedido
CREATE VIEW vw_utilidad_real_pedido AS
SELECT 
  p.id AS pedido_id,
  p.folio,
  c.nombre AS cliente,
  p.precio_real_total AS venta,
  p.costo_producto_total AS costo_producto,
  COALESCE(pcl.costo_logistica_pedido, 0) AS costo_logistica,
  p.precio_real_total - p.costo_producto_total AS utilidad_bruta,
  p.precio_real_total - p.costo_producto_total - 
    COALESCE(pcl.costo_logistica_pedido, 0) AS utilidad_real,
  ((p.precio_real_total - p.costo_producto_total - 
    COALESCE(pcl.costo_logistica_pedido, 0)) / 
    NULLIF(p.precio_real_total, 0) * 100) AS margen_real_pct
FROM pedidos p
JOIN clientes c ON c.id = p.cliente_id
LEFT JOIN pedido_costos_logistica pcl ON pcl.pedido_id = p.id
WHERE p.status = 'entregado';
```

**Distribución 50/50:**

```
50% del costo distribuido por PESO (consumo real gasolina/depreciación)
50% del costo distribuido por VALOR (tamaño del cliente)

Caso especial: ruta foránea con 1 solo pedido = 100% al pedido
```

**Insight esperado después de 3 meses:**
- Identificar clientes con margen real < 5% (subsidio)
- Identificar rutas con costo desproporcionado
- Decidir pedido mínimo, flete obligatorio, re-zonificación

**Esfuerzo:** 2-3 semanas  
**Prioridad:** CRÍTICA  
**Alineado con:** Principio #4 (CPP real con gastos asociados)

### Brecha 2 — Sistema Formal de Incidencias

**Problema:** Hoy chofer llama por teléfono. Anotaciones a mano. 
Sin trazabilidad. Sin estadísticas. Sin aprendizaje organizacional.

**Escenarios reales:**
- Camión se descompone
- Accidente vial menor
- Asalto / robo
- Desvío forzado por bloqueo
- Cliente cerrado / no estaba
- Producto dañado en transit
- Multas de tránsito

**Solución:**

```sql
CREATE TYPE tipo_incidencia AS ENUM (
  'mecanica',
  'accidente',
  'robo',
  'desvio_forzado',
  'cliente_no_estaba',
  'producto_danado',
  'multa_transito',
  'demora_carga',
  'falla_sistema',
  'otro'
);

CREATE TABLE incidencias_ruta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id UUID NOT NULL REFERENCES rutas(id),
  reportado_por UUID NOT NULL,
  tipo tipo_incidencia NOT NULL,
  
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  ubicacion_descrita TEXT,
  
  descripcion TEXT NOT NULL,
  entregas_afectadas UUID[],
  
  foto_urls TEXT[],
  fotos_hashes TEXT[],
  
  accion_tomada TEXT,
  reasignar_ruta_id UUID,
  
  costo_estimado NUMERIC,
  
  estado TEXT DEFAULT 'abierta' 
    CHECK (estado IN ('abierta', 'en_proceso', 'cerrada')),
  responsable_resolucion UUID,
  resuelto_en TIMESTAMPTZ,
  resolucion_notas TEXT,
  
  reportado_en TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION sumar_costo_incidencia()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.costo_estimado > 0 THEN
    UPDATE ruta_costos 
    SET multas_costo = multas_costo + NEW.costo_estimado
    WHERE ruta_id = NEW.ruta_id AND NEW.tipo = 'multa_transito';
    
    UPDATE ruta_costos 
    SET otros_costos = otros_costos + NEW.costo_estimado
    WHERE ruta_id = NEW.ruta_id AND NEW.tipo != 'multa_transito';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**App chofer - flujo de reporte:**

1. Botón rojo siempre visible: "Reportar incidencia"
2. Tap → tipo (icons grandes): mecánica, accidente, robo, etc.
3. Foto obligatoria con hash automático
4. GPS automático
5. Descripción de voz (opcional)
6. Push automático a admin
7. Admin puede reasignar ruta o tomar acción

**Reportes posibles:**
- Incidencias por chofer (mes)
- Incidencias por tipo (frecuencia)
- Costo total de incidencias por ruta
- Mapa de calor (zonas con más incidencias)

**Esfuerzo:** 2 semanas  
**Prioridad:** IMPORTANTE  
**Alineado con:** /audit/12 (Evidencia + hashes)

### Brecha 3 — Offline Chofer (Service Worker)

**Problema:** Chofer entra a colonia sin señal. Hoy: no puede 
registrar entrega → pierde firma + foto + GPS.

**Solución:** Service Worker + IndexedDB (mismo patrón que vendedor).

```typescript
// chofer-offline-queue.ts
interface OfflineEntrega {
  id: string;
  entrega_id: string;
  firma_base64: string;
  firma_hash: string;
  foto_base64: string;
  foto_hash: string;
  gps_lat: number;
  gps_lng: number;
  timestamp_local: string;
  status: 'pendiente_sync' | 'sincronizado' | 'error';
}

// Al perder conexión:
// 1. Guardar en IndexedDB
// 2. Mostrar "Pendiente sync" con icono
// 3. Cuando vuelve conexión: sync automático
// 4. Verificar hash al subir (integridad)
```

**Esfuerzo:** 1-2 semanas  
**Prioridad:** IMPORTANTE  
**Alineado con:** /audit/10 Principios Dispositivos

### Brecha 4 — Devolución en Ruta (Bug #1B)

**Problema:** Cliente recibe 48 sacos pero rechaza 2 (manchados). 
Hoy NO se puede registrar. Inventario y facturación quedan 
desfasados.

**Solución:** Ya documentada en Bug #1B / pendiente de implementar.

Componentes nuevos:
- DevolucionRutaDialog en app chofer
- Tabla devoluciones_ruta con motivo, fotos, evidencia
- Trigger para regresar producto a inventario al cierre de ruta
- Generación automática de nota de crédito

**Esfuerzo:** 2-3 semanas  
**Prioridad:** CRÍTICA  
**Alineado con:** Bug #1B documentado

---

## 6. Conexión con Báscula (rediseño /audit/12)

Carga de camión actualmente NO conecta con sistema de pesada 
(básculas industriales). Debe integrarse:

**Flujo unificado:**

```
1. Almacenista crea sesión_pesada (báscula seleccionada)
2. Pesa lote por lote (carga camión)
3. Sistema valida cada pesada vs capacidad báscula
4. Al cerrar sesión:
   - Decide cobrar real / redondear / ajustar
   - Foto inteligente si aplica regla
5. Sistema vincula sesion_pesada → ruta → entregas
6. Comisión vendedor se calcula sobre venta REAL post-pesada
```

**Esfuerzo:** Junto con báscula (Brecha 2 de /audit/12)

---

## 7. Roadmap

| Mes | Entregas |
|-----|----------|
| Mayo (resto) | /audit/14 generado |
| Julio | Brecha 4: Devolución en ruta (Bug #1B) |
| Agosto | Brecha 1: Costos de ruta + utilidad real |
| Septiembre | Brecha 2: Sistema formal de incidencias |
| Septiembre | Brecha 3: Offline chofer (Service Worker) |
| Octubre | Integración carga ↔ báscula |

**Tiempo total:** 4-5 meses  
**Inversión:** $0 software (solo desarrollo)

---

## 8. Decisiones de Negocio Pendientes

### Decisión 1 — Cálculo de sueldo proporcional
- Sueldo diario / 8 horas x horas ruta?
- Incluir prestaciones (IMSS, vacaciones)?

### Decisión 2 — Depreciación vehículo
- Cuánto depreciar por año?
- Considerar valor de mercado o tabla SAT?

### Decisión 3 — Mantenimiento prorrateado
- Promedio anual de gastos / km recorridos x km ruta?
- O sistema más sofisticado?

### Decisión 4 — Umbral de margen para alerta
- Si margen real < 5% → alerta?
- Qué hacer con esos pedidos?

### Decisión 5 — Quién aprueba override de costo
- Si admin quiere ajustar costo distribuido manualmente
- Solo Jose? Contadora también?

### Decisión 6 — Frecuencia de cálculo
- Al cerrar ruta automático?
- Cron nocturno?

---

## 9. Conexión con Biblia v1.1 y otros documentos

### Biblia v1.1 - Principios afectados:
- Principio #4 (CPP real con gastos asociados): costos de ruta
- Principio #5 (Utilidad en tres niveles): utilidad real por pedido
- Principio #2 (AirDrop digital): flujo entrega-firma-evidencia

### Conexiones cruzadas:
- /audit/08-INVENTARIO: lotes salen via carga_productos
- /audit/12-EVIDENCIA: fotos con hash, GPS, firmas válidas
- /audit/13-PEDIDOS: comisiones sobre venta real, HOLD por crédito
- /audit/10-DISPOSITIVOS: offline chofer pendiente

### Nuevo Principio Transversal Propuesto — VISIBILIDAD DE COSTOS
"Toda actividad operativa debe registrar su costo real. 
Sin costo registrado, no hay decisión informada posible."

---

## 10. Recomendación final

ALMASA-OS Rutas es uno de los módulos más maduros y diferenciados 
del sistema. Tiene 4 ventajas únicas sobre Oracle/SAP que NO se 
pueden replicar fácilmente.

Las 4 brechas son específicas y de alto valor:
1. COSTOS DE RUTA — descubrir clientes "trampa" rentables aparente
2. SISTEMA INCIDENCIAS — gestión profesional de problemas reales
3. OFFLINE CHOFER — no perder datos por falta de señal
4. DEVOLUCIÓN EN RUTA — completar ciclo de pedidos rechazados

**Orden estricto:**
1. JULIO 2026: Brecha 4 (devolución en ruta) - Bug #1B
2. AGOSTO 2026: Brecha 1 (costos + utilidad real) - alto valor
3. SEPTIEMBRE 2026: Brecha 2 (incidencias) + Brecha 3 (offline)
4. OCTUBRE 2026: Integración carga ↔ báscula

Una vez completas las 4 brechas, ALMASA-OS Rutas será **superior 
a Oracle Transportation Management para mayoreo de abarrotes**, 
con costo $0 y ventajas únicas no replicables.

---

*ALMASA-OS · Rediseño de Rutas y Logística · v1.0*  
*Generado el 10 de mayo de 2026*  
*El último kilómetro decide la utilidad real.*
