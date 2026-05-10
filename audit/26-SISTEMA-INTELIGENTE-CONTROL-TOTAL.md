# Sistema Inteligente y Control Total — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Realidad operativa carga a lomo + necesidad control total  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** El sistema que todo lo ve. La báscula es la verdad.

---

## 1. La filosofía

Este es el documento más importante de ALMASA-OS. Resuelve el 
problema operacional MÁS PROFUNDO: libre acceso a mercancía sin 
conciliación cerrada del círculo.

ALMASA es distribuidora donde la operación es 100% manual:
- Carga A LOMO (a hombros, sin tarimas, sin montacargas)
- Báscula solo para productos vendidos por kg (a veces)
- Productos por unidad nunca pasan por báscula
- Mismo equipo carga y regresa
- Hoja de salida sin precios

> Principio rector: "El sistema todo lo ve. La báscula es la 
> verdad para productos de peso variable. La hoja de salida es 
> el contrato de transferencia. El cliente confirma el cierre. 
> IA detecta patrones que humanos olvidan."

---

## 2. La Realidad Operativa Real

### Flujo Operativo

1. Vendedor en RUTA crea pedidos (unidad o peso)
2. Día asignado: pedidos van a almacén para cargar
3. Almacenista identifica productos del pedido
4. Ayudantes + chofer cargan A LOMO de bodega
5. Si producto es por KG: pasan por báscula
6. Si producto es por UNIDAD: cuentan bultos
7. Suben a camioneta, acomodan por filas
8. Hoja de salida (sin precios) firmada por chofer
9. Camión sale a ruta

### Implicaciones para Control

Si mismo equipo carga y regresa = riesgo de colusión.
Compensamos con:
1. Cliente confirma cantidad (QR/WhatsApp post-entrega)
2. IA detecta patrones (mismo equipo + misma diferencia)
3. Inventario ciego mensual con Josan presente
4. Conciliación automática del círculo completo
5. Báscula con foto automática (productos por kg)

---

## 3. Sistema 1 — Conciliación Automática del Círculo

### Los 9 Momentos del Círculo

```sql
CREATE TABLE conciliacion_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id),
  
  -- MOMENTO 1: Pedido creado en ruta
  cantidad_pedida JSONB NOT NULL,
  vendedor_id UUID,
  pedido_creado_en TIMESTAMPTZ,
  pedido_gps_lat NUMERIC,
  pedido_gps_lng NUMERIC,
  
  -- MOMENTO 2: Asignado a camión-ruta
  camion_ruta_id UUID,
  asignado_en TIMESTAMPTZ,
  
  -- MOMENTO 3: Preparado en bodega
  cantidad_preparada JSONB,
  preparado_por UUID,
  preparado_en TIMESTAMPTZ,
  
  -- MOMENTO 4: Pesado o contado
  cantidad_verificada JSONB,
  metodo_verificacion TEXT CHECK (metodo_verificacion IN ('bascula', 'conteo')),
  bascula_fotos_urls TEXT[],
  bascula_pesos_capturados JSONB,
  conteo_bultos INTEGER,
  verificado_en TIMESTAMPTZ,
  
  -- MOMENTO 5: Cargado al camión
  cantidad_cargada JSONB,
  cargado_por_almacenista UUID,
  cargado_a_chofer_id UUID,
  cargado_a_vehiculo_id UUID,
  cargado_en TIMESTAMPTZ,
  carga_fotos_urls TEXT[],
  
  -- MOMENTO 6: Hoja de salida firmada (CONTRATO)
  hoja_salida_pdf_url TEXT,
  hoja_salida_hash_sha256 TEXT,
  almacenista_firma_url TEXT,
  chofer_firma_url TEXT,
  hoja_firmada_en TIMESTAMPTZ,
  
  -- MOMENTO 7: Entregado al cliente
  cantidad_entregada JSONB,
  entregado_en TIMESTAMPTZ,
  entrega_fotos_urls TEXT[],
  entrega_firma_cliente_url TEXT,
  entrega_gps_lat NUMERIC,
  entrega_gps_lng NUMERIC,
  entrega_recibido_por TEXT,
  
  -- MOMENTO 8: Confirmación cliente (CRÍTICO)
  cantidad_confirmada_cliente JSONB,
  confirmado_via TEXT CHECK (confirmado_via IN (
    'qr_post_entrega', 'whatsapp_24h', 'llamada_aleatoria', 'portal_cliente'
  )),
  confirmado_en TIMESTAMPTZ,
  cliente_reporto_diferencia BOOLEAN DEFAULT false,
  
  -- MOMENTO 9: Cierre del día
  cantidad_devuelta JSONB,
  motivo_devolucion TEXT,
  cerrado_en TIMESTAMPTZ,
  
  -- ESTADO CONCILIACIÓN
  estado_conciliacion TEXT CHECK (estado_conciliacion IN (
    'pendiente', 'conciliado_perfecto', 'discrepancia_menor',
    'discrepancia_mayor', 'investigacion_activa', 'resuelto'
  )) DEFAULT 'pendiente',
  
  diferencias_detectadas JSONB,
  alerta_generada BOOLEAN DEFAULT false,
  alerta_severidad TEXT,
  conciliado_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Función conciliación automática:** Compara todos los momentos. Alerta si discrepancia >2%. Notifica admin si >5%.

**Dashboard:** Pedidos cerrados %, discrepancias menores/mayores, patrones IA por chofer/almacenista.

**Esfuerzo:** 4 semanas  
**Prioridad:** CRÍTICA #1

---

## 4. Sistema 2 — Anti-Robo Adaptado (7 Capas)

### Capa 1 — Báscula Inteligente (Productos KG)

```sql
CREATE TABLE bascula_pesajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id),
  producto_id UUID REFERENCES productos(id),
  cantidad_pedida_kg NUMERIC NOT NULL,
  peso_real_kg NUMERIC NOT NULL,
  diferencia_kg NUMERIC GENERATED ALWAYS AS 
    (peso_real_kg - cantidad_pedida_kg) STORED,
  diferencia_pct NUMERIC GENERATED ALWAYS AS 
    (ABS(peso_real_kg - cantidad_pedida_kg) / 
     NULLIF(cantidad_pedida_kg, 0) * 100) STORED,
  foto_bascula_url TEXT NOT NULL,
  foto_bascula_hash_sha256 TEXT NOT NULL,
  almacenista_id UUID NOT NULL,
  dentro_tolerancia BOOLEAN GENERATED ALWAYS AS 
    (ABS((peso_real_kg - cantidad_pedida_kg) / 
     NULLIF(cantidad_pedida_kg, 0) * 100) <= 2) STORED,
  requiere_autorizacion BOOLEAN GENERATED ALWAYS AS 
    (ABS((peso_real_kg - cantidad_pedida_kg) / 
     NULLIF(cantidad_pedida_kg, 0) * 100) > 2) STORED,
  autorizado_por UUID,
  motivo_diferencia TEXT,
  pesado_en TIMESTAMPTZ DEFAULT now()
);
```

### Capa 2 — Conteo de Bultos (Productos Unidad)

```sql
CREATE TABLE conteo_bultos_carga (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id),
  producto_id UUID REFERENCES productos(id),
  cantidad_pedida INTEGER NOT NULL,
  cantidad_contada INTEGER NOT NULL,
  foto_monton_url TEXT,
  foto_hash_sha256 TEXT,
  almacenista_id UUID NOT NULL,
  chofer_id UUID,
  coincide BOOLEAN GENERATED ALWAYS AS 
    (cantidad_contada = cantidad_pedida) STORED,
  contado_en TIMESTAMPTZ DEFAULT now()
);
```

### Capa 3 — Hoja de Salida Digital (Contrato)

```sql
CREATE TABLE hojas_salida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_hoja TEXT UNIQUE NOT NULL,
  camion_ruta_id UUID REFERENCES rutas(id),
  vehiculo_id UUID REFERENCES vehiculos(id),
  chofer_id UUID,
  ayudantes_ids UUID[],
  pedidos_ids UUID[],
  total_pedidos INTEGER,
  total_bultos INTEGER,
  total_clientes INTEGER,
  pdf_url TEXT NOT NULL,
  pdf_hash_sha256 TEXT NOT NULL,
  qr_codigo_url TEXT,
  almacenista_firma_url TEXT NOT NULL,
  almacenista_firmado_en TIMESTAMPTZ NOT NULL,
  almacenista_id UUID NOT NULL,
  chofer_firma_url TEXT NOT NULL,
  chofer_firmado_en TIMESTAMPTZ NOT NULL,
  estado TEXT CHECK (estado IN (
    'preparada', 'firmada', 'en_ruta', 'completada', 'reconciliada'
  )) DEFAULT 'preparada',
  salida_en TIMESTAMPTZ,
  retorno_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

PDF SIN PRECIOS: solo producto, cantidad, cliente.

### Capa 4 — GPS + Geofence en Ruta

```sql
CREATE TABLE alertas_desviacion_ruta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id UUID NOT NULL REFERENCES rutas(id),
  chofer_id UUID NOT NULL,
  momento TIMESTAMPTZ DEFAULT now(),
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  distancia_de_ruta_metros NUMERIC,
  severidad TEXT CHECK (severidad IN ('baja', 'media', 'alta')),
  notificado_admin BOOLEAN DEFAULT false,
  justificacion_chofer TEXT,
  resuelto BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Capa 5 — Verificación Cliente Post-Entrega

```sql
CREATE TABLE verificaciones_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id),
  cliente_id UUID NOT NULL,
  metodo TEXT CHECK (metodo IN (
    'qr_papel', 'whatsapp_automatico', 'llamada_random', 'portal_cliente'
  )),
  enviado_en TIMESTAMPTZ,
  respondido BOOLEAN DEFAULT false,
  respondido_en TIMESTAMPTZ,
  cantidades_confirmadas JSONB,
  cliente_reporto_diferencia BOOLEAN DEFAULT false,
  diferencia_detectada JSONB,
  investigacion_activa BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Capa 6 — IA Detección Patrones

```sql
CREATE TABLE score_confianza_empleado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  fecha_calculo DATE NOT NULL,
  factor_conciliacion_perfecta NUMERIC,
  factor_devoluciones_normales NUMERIC,
  factor_quejas_clientes NUMERIC,
  factor_inventario_ciego NUMERIC,
  factor_desviaciones_ruta NUMERIC,
  factor_combustible_eficiencia NUMERIC,
  factor_verificaciones_cliente NUMERIC,
  factor_antiguedad NUMERIC,
  score_total NUMERIC,
  cambio_vs_mes_anterior NUMERIC,
  patrones_detectados JSONB,
  investigacion_recomendada BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Score < 60 = alta sospecha. 60-75 = media. 75-90 = normal. >90 = excelente.
**VISIBLE SOLO A JOSAN.** Tono cordial mexicano: investigar antes de acusar.

### Capa 7 — Inventario Ciego con Josan

```sql
CREATE TABLE inventario_ciego_josan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  productos_seleccionados UUID[],
  resultados JSONB,
  diferencias_total NUMERIC,
  alertas_generadas INTEGER,
  realizado_con_josan BOOLEAN DEFAULT true,
  fotos_evidencia TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Sistema selecciona random. Equipo cuenta SIN saber lo del sistema.

**Esfuerzo total anti-robo:** 6 semanas  
**Prioridad:** CRÍTICA #2

---

## 5. Sistema 3 — Agente IA Operativo

Asistente personal IA. Saludo matutino, procesamiento inbox, detección anomalías, conversacional con tools.

```sql
CREATE TABLE agente_ia_conversaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  contexto JSONB,
  mensajes JSONB,
  acciones_ejecutadas JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Saludo matutino 7am:** Resumen operación, alertas críticas, buenas noticias, recomendaciones IA.

**Conversacional:** "Cuántos pedidos pendientes?" → respuesta + acciones.

**Esfuerzo:** 5 semanas  
**Prioridad:** ALTA

---

## 6. Sistema 4 — WhatsApp Business API

Cliente envía pedido por WhatsApp → IA parsea → confirmación emoji → pedido creado.

```sql
CREATE TABLE whatsapp_pedidos_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number TEXT NOT NULL,
  whatsapp_message_id TEXT UNIQUE,
  cliente_id UUID REFERENCES clientes(id),
  tipo_mensaje TEXT CHECK (tipo_mensaje IN ('texto', 'audio', 'imagen', 'documento')),
  texto_original TEXT,
  audio_url TEXT,
  audio_transcripcion TEXT,
  productos_detectados JSONB,
  confianza_pct NUMERIC,
  pedido_borrador_id UUID,
  enviado_confirmacion BOOLEAN DEFAULT false,
  cliente_confirmo BOOLEAN,
  pedido_creado_id UUID REFERENCES pedidos(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Esfuerzo:** 6-8 semanas  
**Prioridad:** ALTA COMERCIAL

---

## 7. Sistema 5 — Voz a Pedido

Vendedor captura por voz (manos libres, manejando). Whisper transcribe + Claude parsea.

```sql
CREATE TABLE voice_orders_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL,
  audio_url TEXT NOT NULL,
  audio_duracion_seg NUMERIC,
  audio_hash_sha256 TEXT,
  transcripcion TEXT,
  pedido_estructurado JSONB,
  pedido_creado_id UUID REFERENCES pedidos(id),
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  capturado_en TIMESTAMPTZ DEFAULT now()
);
```

**Esfuerzo:** 3-4 semanas  
**Prioridad:** IMPORTANTE

---

## 8. Sistema 6 — Reconocimiento Imagen Producto

Vendedor foto estante cliente → Claude Vision detecta productos → sugiere pedido automático.

```sql
CREATE TABLE inventarios_visuales_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL,
  cliente_sucursal_id UUID,
  vendedor_id UUID,
  fecha_foto TIMESTAMPTZ DEFAULT now(),
  fotos_urls TEXT[],
  fotos_hash_sha256 TEXT[],
  productos_detectados JSONB,
  productos_faltantes JSONB,
  pedido_sugerido_id UUID,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Esfuerzo:** 5 semanas  
**Prioridad:** ALTA

---

## 9. Por qué nadie tiene esto

| Sistema | Oracle | SAP | NetSuite | ALMASA-OS |
|---------|--------|-----|----------|-----------|
| Conciliación 9 momentos | 🟡 | 🟡 | ❌ | ✅ ÚNICO |
| Báscula con foto+hash | ❌ | ❌ | ❌ | ✅ ÚNICO |
| Hoja salida sin precios | ❌ | ❌ | ❌ | ✅ ÚNICO MX |
| Score confianza empleado | ❌ | ❌ | ❌ | ✅ ÚNICO |
| Verificación QR cliente | ❌ | ❌ | ❌ | ✅ ÚNICO |
| Inventario ciego con dueño | ❌ | ❌ | ❌ | ✅ ÚNICO |
| Agente IA operativo | 🟡 | 🟡 | ❌ | ✅ ÚNICO |
| WhatsApp Business pedidos | ❌ | ❌ | ❌ | ✅ ÚNICO |
| Voz a pedido | ❌ | ❌ | ❌ | ✅ ÚNICO |
| Reconocimiento imagen | ❌ | ❌ | ❌ | ✅ ÚNICO |
| **TOTAL ÚNICOS** | 0 | 0 | 0 | **10** |

---

## 10. Roadmap

### Trimestre 1 (Junio-Agosto 2026)
- Conciliación automática 9 momentos (4 sem)
- Báscula inteligente productos kg (3 sem)
- Hoja de salida digital con firmas (2 sem)
- Verificación cliente QR (2 sem)

### Trimestre 2 (Septiembre-Noviembre 2026)
- Score confianza empleado (1 sem)
- Inventario ciego con Josan (1 sem)
- WhatsApp Business API (6 sem)
- Voz a pedido (3 sem)

### Trimestre 3 (Diciembre 2026 - Febrero 2027)
- Agente IA operativo (5 sem)
- Reconocimiento imagen producto (5 sem)

**Tiempo total:** 9 meses  
**Inversión:** ~$300/mes APIs + ~$15K MXN inicial

---

## 11. Decisiones de Negocio Pendientes

### Decisión 1 — Tablet en báscula
- Una por bodega? Bluetooth o foto manual?

### Decisión 2 — Verificación cliente QR
- 100% pedidos o 30% random?

### Decisión 3 — Score empleado
- Visible solo a Josan. Umbral acción?

### Decisión 4 — WhatsApp Business
- Empezar certificación Meta YA? (~$1K USD)

### Decisión 5 — Inventario ciego frecuencia
- Mensual o trimestral?

### Decisión 6 — Política investigación
- Tono cordial mexicano siempre
- Conversación, no acusación

---

## 12. Conexión con todo

### Conexiones cruzadas:
- /audit/08 Inventario (báscula reconciliada)
- /audit/12 Evidencia (hashes SHA-256)
- /audit/13 Pedidos (conciliación cierra círculo)
- /audit/14 Rutas (GPS + geofence)
- /audit/17 Flota (combustible vs km)
- /audit/18 Clientes (verificación + QR)
- /audit/19 Dashboard (alertas IA centralizadas)
- /audit/25 Correos (WhatsApp + email parsers)

### Nuevo Principio Maestro #11 — EL SISTEMA TODO LO VE
"ALMASA-OS observa cada movimiento. La báscula es la verdad. 
La hoja de salida es contrato digital. El cliente confirma 
el cierre. IA detecta patrones. Tono cordial: investigar 
antes de acusar."

---

## 13. Recomendación final

Este es el documento más importante de ALMASA-OS. Resuelve 
libre acceso sin conciliación con realismo total: respeta 
carga a lomo, sin tarimas, mismo equipo. Agrega tecnología 
en puntos críticos.

**Implementación:**
1. JUN-AGO 2026: Conciliación + Báscula + Hoja salida
2. SEP-NOV: Score + WhatsApp + Voz
3. DIC-FEB 2027: Agente IA + Reconocimiento imagen

**10 sistemas únicos.** Oracle 0, SAP 0, NetSuite 0.

ALMASA-OS = el sistema que todo lo ve.

---

*ALMASA-OS · Sistema Inteligente y Control Total · v1.0*  
*Generado el 10 de mayo de 2026*  
*El sistema que todo lo ve. La báscula es la verdad.*
