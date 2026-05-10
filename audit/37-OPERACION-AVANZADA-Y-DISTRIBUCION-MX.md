# Operación Avanzada y Distribución MX — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** 18 gaps operativos críticos + compliance SAT obligatorio  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** Operamos a nivel enterprise, facturamos como PYME. 18 módulos, $0 licencia.

---

## 1. Diagnóstico

ALMASA-OS cubre operación básica (M01-M22). Pero hay 18 gaps críticos:

**Riesgos legales INMEDIATOS:**
- Carta Porte 3.1: multas $19,700-$112,650 MXN por traslado sin complemento
- Contabilidad electrónica SAT: multas $1,810-$36,740 MXN por incumplimiento
- PLD/Antilavado: multas hasta 65,000 UMA ($7.5M MXN) si aplica

**Riesgos comerciales:**
- Sin EDI = imposible vender a Walmart/Soriana/Chedraui
- Sin GS1/GTIN = productos no escaneables en cadenas
- Sin cadena fría = imposible expandir a refrigerados

**14 vehículos propios** que transitan vías federales = Carta Porte 3.1 OBLIGATORIO.

---

## 2. Tesis

ALMASA-OS implementa los 18 módulos que SAP/Oracle cobran $30K-1M USD/año, con $0 de licencia adicional. Mismo nivel, costo PYME.

---

## 3. Los 18 Módulos

### M1 — WMS Móvil + Barcode

App móvil para almacenistas con lectura códigos GS1/GTIN, picking dirigido, geofencing bodega, verificación 2 firmas digital.

```sql
CREATE TABLE wms_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bodega_id UUID NOT NULL,
  bin_location TEXT, -- 'B1-P3-E2' (Bodega1-Pasillo3-Estante2)
  producto_id UUID NOT NULL REFERENCES productos(id),
  lote_id UUID REFERENCES inventario_lotes(id),
  tipo TEXT CHECK (tipo IN (
    'recepcion', 'picking', 'put_away', 'transfer', 'conteo', 'ajuste'
  )),
  cantidad NUMERIC NOT NULL,
  escaneado_gtin TEXT,
  escaneado_por UUID NOT NULL,
  verificado_por UUID, -- segunda firma
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  dentro_geofence BOOLEAN,
  modo_offline BOOLEAN DEFAULT false,
  synced BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bin_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bodega_id UUID NOT NULL,
  codigo TEXT NOT NULL UNIQUE, -- 'B1-P3-E2'
  tipo TEXT CHECK (tipo IN ('estante', 'piso', 'frio', 'granel')),
  zona_abc TEXT CHECK (zona_abc IN ('A', 'B', 'C')),
  capacidad_kg NUMERIC,
  ocupado_kg NUMERIC DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Integración LA CORONA (/audit/26): cada movimiento auditado, anti-robo extendido.

**Esfuerzo:** 4-5 semanas

---

### M2 — Complex Pricing & Rebates

Extiende /audit/23 con tier pricing, promotional pricing, vendor rebates, effective dating.

```sql
CREATE TABLE vendor_rebates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id),
  tipo TEXT CHECK (tipo IN ('volumen', 'crecimiento', 'mix', 'fidelidad')),
  porcentaje NUMERIC,
  monto_fijo NUMERIC,
  periodo_inicio DATE,
  periodo_fin DATE,
  meta_volumen NUMERIC,
  volumen_actual NUMERIC DEFAULT 0,
  estado TEXT CHECK (estado IN ('activo', 'cumplido', 'vencido')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Dashboard rentabilidad por cliente × producto × mes.

**Esfuerzo:** 2-3 semanas

---

### M3 — Backorder Management

```sql
CREATE TABLE backorders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_detalle_id UUID NOT NULL,
  producto_id UUID NOT NULL REFERENCES productos(id),
  cliente_id UUID NOT NULL,
  cantidad_faltante NUMERIC NOT NULL,
  cantidad_asignada NUMERIC DEFAULT 0,
  prioridad INTEGER DEFAULT 0,
  fecha_esperada_stock DATE,
  estado TEXT CHECK (estado IN (
    'pendiente', 'parcial', 'asignado', 'cancelado_tiempo', 'cancelado_cliente'
  )) DEFAULT 'pendiente',
  notificado_cliente BOOLEAN DEFAULT false,
  dias_max_espera INTEGER DEFAULT 14,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Auto-asignación cuando llega stock. Comunicación automática al cliente.

**Esfuerzo:** 1-2 semanas

---

### M4 — Wave/Batch Picking + Directed Put-Away

```sql
CREATE TABLE wave_pickings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  bodega_id UUID NOT NULL,
  pedidos_ids UUID[] NOT NULL,
  total_lineas INTEGER,
  total_bultos INTEGER,
  ruta_picking_optimizada JSONB,
  asignado_a UUID,
  estado TEXT CHECK (estado IN ('planificado', 'en_proceso', 'completado')),
  tiempo_inicio TIMESTAMPTZ,
  tiempo_fin TIMESTAMPTZ,
  tiempo_minutos INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Reduce 25-40% tiempo picking. Curva ABC: productos rápidos cerca puerta.

**Esfuerzo:** 2-3 semanas

---

### M5 — EDI Integration (Trading Partners Grandes)

```sql
CREATE TABLE edi_trading_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL, -- 'Walmart MX', 'Soriana', 'Chedraui'
  edi_id TEXT, -- identificador EDI del partner
  protocolo TEXT CHECK (protocolo IN ('AS2', 'SFTP', 'VAN', 'API')),
  endpoint_url TEXT,
  credenciales_encrypted TEXT,
  documentos_soportados TEXT[], -- ['850', '810', '856', '846']
  mapeo_skus JSONB, -- {almasa_sku: partner_sku}
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE edi_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES edi_trading_partners(id),
  tipo_documento TEXT NOT NULL, -- '850 PO', '810 Invoice', '856 ASN', '846 Inventory'
  direccion TEXT CHECK (direccion IN ('inbound', 'outbound')),
  contenido_raw TEXT,
  contenido_parsed JSONB,
  estado TEXT CHECK (estado IN ('recibido', 'procesado', 'error', 'enviado', 'confirmado')),
  error_detalle TEXT,
  pedido_vinculado_id UUID,
  factura_vinculada_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Permite ALMASA convertirse en proveedor ANTAD. Reduce 90% costos transacción.

**Esfuerzo:** 6-8 semanas (cuando ALMASA quiera vender a cadenas)

---

### M6 — B2B Portal con Live Inventory

Portal web para clientes mayoristas con catálogo en tiempo real, stock disponible, precios contractuales, reorden 1-click, sugerencias IA.

Extiende /audit/28 Portal Cliente VIP con inventario en vivo + carrito multi-bodega.

**Esfuerzo:** 3-4 semanas (extiende portal existente)

---

### M7 — Shipping API Integration

```sql
CREATE TABLE shipping_carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL, -- 'DHL', 'FedEx', 'UPS', 'Estafeta', 'Paquetexpress'
  api_url TEXT,
  api_key_encrypted TEXT,
  servicios_disponibles TEXT[],
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE shipping_cotizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID,
  carrier_id UUID REFERENCES shipping_carriers(id),
  servicio TEXT,
  precio NUMERIC,
  dias_estimados INTEGER,
  tracking_number TEXT,
  label_url TEXT,
  estado TEXT CHECK (estado IN ('cotizado', 'confirmado', 'en_transito', 'entregado')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Rate shopping automático. Para envíos fuera de flotilla propia.

**Esfuerzo:** 2-3 semanas

---

### M8 — Multi-Warehouse Optimization

Stock visibility B1, B2, terceros en tiempo real. Transfer ordering inteligente. Fulfillment desde bodega óptima.

```sql
CREATE TABLE transfer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bodega_origen_id UUID NOT NULL,
  bodega_destino_id UUID NOT NULL,
  producto_id UUID NOT NULL,
  cantidad NUMERIC NOT NULL,
  motivo TEXT, -- 'rebalanceo', 'agotado_destino', 'consolidacion'
  sugerido_por TEXT CHECK (sugerido_por IN ('ia', 'manual')),
  estado TEXT CHECK (estado IN ('sugerido', 'aprobado', 'en_transito', 'recibido')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Esfuerzo:** 2 semanas

---

### M9 — Carta Porte 3.1 Completo

**EL MÓDULO MÁS URGENTE. Multas activas HOY.**

```
FLUJO CARTA PORTE 3.1:

┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Crear   │───→│ Validar  │───→│ Timbrar  │───→│ Imprimir │
│ Datos   │    │ Catálogos│    │ con PAC  │    │ PDF+XML  │
│ Traslado│    │ SAT      │    │          │    │ al chofer│
└─────────┘    └──────────┘    └──────────┘    └──────────┘
     │                              │
     ▼                              ▼
┌─────────┐                   ┌──────────┐
│ Datos:  │                   │ Guardar  │
│ Origen  │                   │ en BD +  │
│ Destino │                   │ Storage  │
│ Mercancía│                  │ con hash │
│ Vehículo│                   └──────────┘
│ Chofer  │
│ Permiso │
└─────────┘
```

```sql
CREATE TABLE carta_porte_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo CFDI
  tipo_cfdi TEXT CHECK (tipo_cfdi IN ('traslado', 'ingreso')) NOT NULL,
  -- traslado: mercancía propia, vehículo propio
  -- ingreso: si ALMASA presta servicio de transporte
  
  -- Versión
  version_carta_porte TEXT DEFAULT '3.1',
  
  -- Vinculación
  ruta_id UUID REFERENCES rutas(id),
  folio_fiscal TEXT,
  
  -- Transporte
  tipo_transporte TEXT DEFAULT '01', -- 01 = Autotransporte Federal
  permiso_sict TEXT, -- número permiso SICT
  tipo_permiso TEXT, -- 'TPAF01' Autotransporte Federal
  
  -- Vehículo (de /audit/17)
  vehiculo_id UUID REFERENCES vehiculos(id),
  config_vehicular TEXT, -- c_ConfigAutotransporte SAT
  placa_vm TEXT,
  anio_modelo INTEGER,
  peso_bruto_vehicular NUMERIC, -- NOM-012
  
  -- Chofer
  chofer_id UUID,
  chofer_rfc TEXT,
  chofer_licencia TEXT,
  chofer_residencia_fiscal TEXT DEFAULT 'MEX',
  
  -- Origen(es)
  origenes JSONB NOT NULL,
  -- [{
  --   rfc: 'AMA700701GI8',
  --   nombre: 'ABARROTES LA MANITA SA DE CV',
  --   cp: '15850',
  --   fecha_hora_salida: '2026-05-10T06:00:00',
  --   estado: 'CMX',
  --   municipio: '017',
  --   localidad: '01',
  --   domicilio: 'Melchor Ocampo #59'
  -- }]
  
  -- Destino(s)
  destinos JSONB NOT NULL,
  -- [{
  --   rfc: 'XAXX010101000', -- público general o RFC cliente
  --   nombre: 'Don Pepe Abarrotes',
  --   cp: '14000',
  --   fecha_hora_llegada: '2026-05-10T14:00:00',
  --   distancia_recorrida: 25 -- km
  -- }]
  
  -- Mercancías
  mercancias JSONB NOT NULL,
  -- [{
  --   bienes_transportados: '15071001', -- fracción arancelaria
  --   descripcion: 'Aceite vegetal',
  --   cantidad: 100,
  --   clave_unidad: 'XBX', -- cajas
  --   peso_kg: 2500,
  --   pedimento: '24 47 3674 1234567', -- si importado
  --   material_peligroso: false
  -- }]
  
  total_mercancias INTEGER,
  peso_bruto_total NUMERIC,
  unidad_peso TEXT DEFAULT 'KGM',
  
  -- Régimen aduanero (si aplica)
  regimen_aduanero TEXT,
  -- 'Definitiva', 'Temporal', 'Tránsito', etc. (hasta 10 tipos)
  
  -- Logística inversa (devoluciones)
  es_logistica_inversa BOOLEAN DEFAULT false,
  
  -- Timbrado
  cfdi_xml_url TEXT,
  cfdi_pdf_url TEXT,
  cfdi_uuid TEXT,
  cfdi_hash_sha256 TEXT,
  timbrado_en TIMESTAMPTZ,
  timbrado_por TEXT, -- PAC
  
  -- Validación
  validacion_resultado TEXT CHECK (validacion_resultado IN (
    'valido', 'errores_corregibles', 'errores_criticos'
  )),
  validacion_errores JSONB,
  
  -- Estado
  estado TEXT CHECK (estado IN (
    'borrador', 'validado', 'timbrado', 'en_ruta',
    'entregado', 'cancelado', 'error_timbrado'
  )) DEFAULT 'borrador',
  
  -- Auditoría
  generado_por UUID,
  generado_en TIMESTAMPTZ DEFAULT now(),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_carta_porte_ruta ON carta_porte_documentos(ruta_id);
CREATE INDEX idx_carta_porte_fecha ON carta_porte_documentos(generado_en DESC);

-- Catálogos SAT auto-actualizables
CREATE TABLE sat_catalogos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogo TEXT NOT NULL, -- 'c_TipoPermiso', 'c_ConfigAutotransporte', etc.
  clave TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  vigente_desde DATE,
  vigente_hasta DATE,
  metadata JSONB,
  UNIQUE(catalogo, clave)
);

-- Cron: actualizar catálogos SAT mensualmente
```

**Edge Function — Generar y Timbrar:**

```typescript
// supabase/functions/carta-porte-generar/index.ts

export async function generarCartaPorte(rutaId: string) {
  const ruta = await getRutaConDetalles(rutaId);
  
  // 1. Validar contra catálogos SAT
  const validacion = await validarContraCatalogosSAT(ruta);
  if (validacion.errores_criticos.length > 0) {
    return { estado: 'errores_criticos', errores: validacion.errores_criticos };
  }
  
  // 2. Construir XML Carta Porte 3.1
  const xml = construirXMLCartaPorte31({
    tipo: 'traslado',
    vehiculo: ruta.vehiculo,
    chofer: ruta.chofer,
    origenes: [{ ...COMPANY_DATA, fecha_hora: ruta.fecha_hora_inicio }],
    destinos: ruta.entregas.map(e => ({
      rfc: e.cliente.rfc || 'XAXX010101000',
      nombre: e.cliente.nombre,
      cp: e.sucursal.codigo_postal,
      fecha_hora: e.hora_estimada,
      distancia: e.distancia_km
    })),
    mercancias: ruta.productos.map(p => ({
      bienes_transportados: p.fraccion_arancelaria || '15071001',
      descripcion: p.nombre,
      cantidad: p.cantidad,
      peso_kg: p.peso_total,
      pedimento: p.pedimento_numero
    }))
  });
  
  // 3. Timbrar con PAC (Facturama)
  const timbrado = await timbrarConPAC(xml);
  
  // 4. Guardar en BD + Storage
  await guardarCartaPorte(rutaId, xml, timbrado);
  
  // 5. Generar PDF para chofer
  await generarPDFCartaPorte(timbrado);
  
  return { estado: 'timbrado', uuid: timbrado.uuid };
}
```

**ALERTA LEGAL:**
- Art. 84-IV CFF: multa $19,700-$112,650 MXN por traslado sin Carta Porte
- Art. 30-A CFF: multa hasta $97,330 MXN por documento incorrecto
- Aplica a TODO traslado por vías federales
- Excepción ÚNICA: traslado intramunicipal sin usar vía federal

**Esfuerzo:** 4-5 semanas (PRIORIDAD #1)

---

### M10 — Complementos SAT 2026

```sql
CREATE TABLE complementos_sat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID REFERENCES facturas(id),
  tipo_complemento TEXT CHECK (tipo_complemento IN (
    'pagos_20',              -- Complemento Pagos 2.0 rev B
    'comercio_exterior_11',  -- Comercio Exterior 1.1
    'carta_porte_31',        -- Carta Porte 3.1
    'nomina_12',             -- Nómina 1.2
    'hidrocarburos',         -- Hidrocarburos abril 2026
    'ine',                   -- INE
    'donatarias',            -- Donatarias
    'otro'
  )),
  version TEXT,
  xml_complemento TEXT,
  validado BOOLEAN DEFAULT false,
  errores_validacion JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Auto-actualización catálogos SAT. Validación previa al timbrado.

**Esfuerzo:** 2-3 semanas

---

### M11 — PLD / Antilavado

```sql
CREATE TABLE pld_operaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT CHECK (tipo IN (
    'efectivo_mayor_100k',
    'transferencia_mayor_umbral',
    'operacion_inusual',
    'operacion_preocupante',
    'cliente_pep' -- Persona Expuesta Políticamente
  )),
  monto NUMERIC NOT NULL,
  moneda TEXT DEFAULT 'MXN',
  cliente_id UUID,
  cliente_nombre TEXT,
  descripcion TEXT,
  fecha_operacion DATE NOT NULL,
  reportada_sspld BOOLEAN DEFAULT false,
  fecha_reporte DATE,
  xml_reporte_url TEXT,
  registrado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pld_clientes_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  identificacion_tipo TEXT, -- 'INE', 'pasaporte', 'cedula'
  identificacion_numero TEXT,
  identificacion_url TEXT,
  verificado BOOLEAN DEFAULT false,
  verificado_por UUID,
  fecha_verificacion DATE,
  pep BOOLEAN DEFAULT false, -- Persona Expuesta Políticamente
  lista_negra_match BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Umbral LFPIORPI: $1,000,000 MXN/mes acumulado efectivo. Reportes XML al SSPLD.

**Esfuerzo:** 3-4 semanas

---

### M12 — Códigos GS1 / GTIN + Migración 2D

```sql
ALTER TABLE productos ADD COLUMN gtin TEXT;
ALTER TABLE productos ADD COLUMN gtin_tipo TEXT CHECK (gtin_tipo IN ('GTIN-13', 'GTIN-12', 'GTIN-8'));
ALTER TABLE productos ADD COLUMN gs1_verified BOOLEAN DEFAULT false;
ALTER TABLE productos ADD COLUMN codigo_2d_url TEXT; -- QR/DataMatrix

CREATE TABLE gs1_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefijo_empresa TEXT, -- asignado por GS1 México
  membresia_activa BOOLEAN DEFAULT true,
  fecha_vencimiento_membresia DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

GS1 México membresía: $630 MXN/mes. Transición código 2D enero 2026.

**Esfuerzo:** 1-2 semanas

---

### M13 — Proveedor ANTAD Ready

Compliance checklist para vender a cadenas grandes. Requiere M5 (EDI) + M12 (GS1).

**Esfuerzo:** 2 semanas (después de M5 y M12)

---

### M14 — Cadena de Frío + COFEPRIS

```sql
CREATE TABLE cadena_frio_sensores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID REFERENCES vehiculos(id),
  bodega_id UUID,
  sensor_id TEXT UNIQUE NOT NULL,
  tipo TEXT CHECK (tipo IN ('vehiculo', 'bodega', 'contenedor')),
  temperatura_min_permitida NUMERIC,
  temperatura_max_permitida NUMERIC,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cadena_frio_lecturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id TEXT NOT NULL,
  temperatura NUMERIC NOT NULL,
  humedad NUMERIC,
  timestamp_lectura TIMESTAMPTZ NOT NULL,
  dentro_rango BOOLEAN GENERATED ALWAYS AS (
    temperatura >= (SELECT temperatura_min_permitida FROM cadena_frio_sensores WHERE sensor_id = cadena_frio_lecturas.sensor_id) AND
    temperatura <= (SELECT temperatura_max_permitida FROM cadena_frio_sensores WHERE sensor_id = cadena_frio_lecturas.sensor_id)
  ) STORED,
  alerta_generada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

NOM-251-SSA1-2009. Telemetría IoT. Alertas desviación térmica.

**Esfuerzo:** 4-5 semanas (cuando ALMASA expanda refrigerados)

---

### M15 — Mermas / Desperdicio Alimentario

```sql
CREATE TABLE mermas_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id),
  lote_id UUID REFERENCES inventario_lotes(id),
  cantidad NUMERIC NOT NULL,
  unidad TEXT,
  valor_perdido NUMERIC,
  razon TEXT CHECK (razon IN (
    'caducidad', 'dano_transito', 'dano_almacen',
    'robo_confirmado', 'robo_sospechado', 'contaminacion',
    'error_proceso', 'devolucion_cliente', 'donacion', 'otro'
  )),
  destino TEXT CHECK (destino IN (
    'desecho', 'donacion', 'liquidacion', 'devolucion_proveedor'
  )),
  evidencia_urls TEXT[],
  evidencia_hashes TEXT[],
  registrado_por UUID,
  aprobado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

IA predice caducidad. FIFO/FEFO automatizado. Reducción -15% a -30% (McKinsey).

**Esfuerzo:** 2-3 semanas

---

### M16 — Contabilidad Electrónica SAT

```
FLUJO CONTABILIDAD ELECTRÓNICA:

┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│Transacciones│→│ Pólizas  │──→│ Balanza  │──→│ Envío    │
│ operativas│  │ auto-gen │   │ XML auto │   │ Buzón    │
│ del mes  │   │          │   │          │   │ Tributario│
└──────────┘   └──────────┘   └──────────┘   └──────────┘
                                                   │
                                                   ▼
                                              ┌──────────┐
                                              │ Acuse    │
                                              │ SAT      │
                                              │ guardado │
                                              └──────────┘
```

```sql
CREATE TABLE contabilidad_catalogo_cuentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_cuenta TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  codigo_agrupador_sat TEXT NOT NULL, -- Anexo 24
  nivel INTEGER NOT NULL,
  naturaleza TEXT CHECK (naturaleza IN ('deudora', 'acreedora')),
  tipo TEXT CHECK (tipo IN ('activo', 'pasivo', 'capital', 'ingreso', 'egreso')),
  subcuenta_de UUID REFERENCES contabilidad_catalogo_cuentas(id),
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE contabilidad_polizas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo TEXT NOT NULL, -- 'mayo-2026'
  numero_poliza TEXT NOT NULL,
  tipo_poliza TEXT CHECK (tipo_poliza IN ('ingreso', 'egreso', 'diario')),
  fecha DATE NOT NULL,
  concepto TEXT NOT NULL,
  movimientos JSONB NOT NULL,
  -- [{cuenta: '1101', cargo: 5000, abono: 0, concepto: '...'},
  --  {cuenta: '4101', cargo: 0, abono: 5000, concepto: '...'}]
  suma_cargos NUMERIC,
  suma_abonos NUMERIC,
  cuadra BOOLEAN GENERATED ALWAYS AS (suma_cargos = suma_abonos) STORED,
  origen_automatico BOOLEAN DEFAULT true,
  origen_tabla TEXT,
  origen_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE contabilidad_balanzas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo TEXT NOT NULL UNIQUE,
  tipo TEXT CHECK (tipo IN ('mensual', 'cierre_ejercicio')),
  xml_url TEXT,
  xml_hash_sha256 TEXT,
  enviada_sat BOOLEAN DEFAULT false,
  fecha_envio DATE,
  acuse_url TEXT,
  acuse_hash TEXT,
  estado TEXT CHECK (estado IN (
    'generando', 'validando', 'lista_envio', 'enviada', 'aceptada', 'rechazada'
  )),
  validacion_errores JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Reglas SAT (CFF Art. 28, Regla 2.8.1.1 RMF 2026):**
- Catálogo cuentas: mínimo 2 niveles, código agrupador SAT obligatorio
- Balanza mensual: día 3 del 2do mes posterior (PM)
- Balanza cierre: antes 20 abril año siguiente
- Pólizas: on-demand cuando SAT requiere
- Envío: Buzón Tributario con e.firma

Integración /audit/36 M8 Portal Contadora: auto-export XML.

**Esfuerzo:** 4-5 semanas (PRIORIDAD #2)

---

### M17 — APIs Bancarias Directas

```sql
CREATE TABLE bancos_api_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco TEXT NOT NULL, -- 'BBVA', 'Banco Base', 'Santander'
  tipo_api TEXT CHECK (tipo_api IN (
    'bbva_enterprise', 'banco_base', 'stp_directo',
    'syncfy_agregador', 'prometeo', 'fintoc'
  )),
  endpoint_url TEXT,
  credenciales_encrypted TEXT,
  webhook_url TEXT,
  clabe_recepcion TEXT, -- CLABE única para cobros
  activo BOOLEAN DEFAULT true,
  ultimo_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE conciliacion_automatica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_config_id UUID NOT NULL REFERENCES bancos_api_config(id),
  movimiento_banco_id TEXT, -- ID del banco
  fecha DATE NOT NULL,
  monto NUMERIC NOT NULL,
  concepto TEXT,
  referencia TEXT,
  tipo TEXT CHECK (tipo IN ('abono', 'cargo')),
  match_tipo TEXT CHECK (match_tipo IN (
    'pago_cliente', 'pago_proveedor', 'nomina',
    'transferencia_interna', 'gasto_operativo', 'sin_match'
  )),
  match_referencia_id UUID,
  conciliado BOOLEAN DEFAULT false,
  conciliado_auto BOOLEAN DEFAULT false,
  conciliado_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

BBVA APIs Empresariales: pagos, consultas, cobros, CoDi. SPEI con CLABE única por cliente. Webhooks tiempo real. Reduce cierre mes de 5-10 → 1-2 días.

**Esfuerzo:** 3-4 semanas (PRIORIDAD #3)

---

### M18 — Tesorería Avanzada (Multi-Bank)

Hub centralizado tesorería. Saldos consolidados tiempo real. Forecast cash flow con IA. Pagos masivos. Cobranza SPEI/CoDi. Integración M11 PLD.

Extiende /audit/20 Tesorería con multi-bank connectivity estilo SAP.

**Esfuerzo:** 3-4 semanas

---

## 4. Ventajas Competitivas (20)

| # | Ventaja | Competencia MX | ALMASA-OS |
|---|---------|---------------|-----------|
| 1 | Carta Porte 3.1 nativo | Aspel cobra extra | Incluido |
| 2 | EDI integrado | No existe en Aspel/CONTPAQi | Nativo |
| 3 | Contabilidad SAT auto | CONTPAQi manual | Automático |
| 4 | APIs bancarias | No existe | BBVA + Banco Base |
| 5 | Anti-robo 7 capas + WMS | No existe | LA CORONA |
| 6 | Cadena fría IoT | No existe en PYMEs | Integrada |
| 7 | ANTAD ready | Imposible con Aspel | Out-of-box |
| 8 | Mermas IA | No existe | -15% a -30% |
| 9 | PLD compliance | ALDDA $$ | Integrado $0 |
| 10 | GS1/GTIN nativo | Manual | Auto |
| 11 | Backorders auto | No existe | Nativo |
| 12 | Wave picking | SAP WMS $$$$ | Incluido |
| 13 | Shipping multi-carrier | No existe | APIs |
| 14 | Multi-warehouse IA | SAP EWM $$$$ | Incluido |
| 15 | vs Aspel SAE | Sin EDI/APIs/IA | Todo integrado |
| 16 | vs CONTPAQi | Sin EDI/frio/IA | Todo integrado |
| 17 | vs Coconut Control | Genérico | Abarrotes MX |
| 18 | vs SAP Business One | $30K-100K/año | $0 |
| 19 | vs Oracle NetSuite | $30K-200K/año | $0 |
| 20 | vs Dynamics 365 | No MX-específico | MX nativo |

---

## 5. Arquitectura Técnica

**Tablas nuevas:** ~25 principales + ~15 soporte.

**Edge Functions nuevas:**
- `carta-porte-generar` — genera XML 3.1
- `carta-porte-timbrar` — timbra con PAC
- `sat-balanza-generar` — balanza mensual XML
- `sat-catalogos-sync` — auto-actualizar catálogos
- `banco-webhook-handler` — recibe movimientos bancarios
- `edi-inbound` / `edi-outbound` — procesamiento EDI
- `iot-temperatura-sensor` — lecturas cadena fría
- `pld-reporte-sspld` — genera reporte antilavado

**Cron jobs:**
- Auto-actualizar catálogos SAT (mensual)
- Generar balanza día 1 del mes
- Sync bancos cada 15 min
- Forecast mermas diario
- Validar Carta Porte antes de rutas

**Integraciones externas:**
- PAC (Facturama/SenHub) para timbrado
- GS1 México API
- SAT Buzón Tributario
- BBVA + Banco Base APIs
- Sensores IoT temperatura (cuando aplique)

---

## 6. Roadmap Implementación

### CRÍTICO (Mes 1-2)
- **M9 Carta Porte 3.1** — multas activas HOY
- **M16 Contabilidad Electrónica SAT** — obligatorio
- **M17 APIs Bancarias** — reduce cierre mes

### ALTO (Mes 3-4)
- M11 PLD/Antilavado
- M10 Complementos SAT 2026
- M1 WMS Móvil + Barcode

### MEDIO (Mes 5-6)
- M2 Complex Pricing
- M3 Backorder Management
- M4 Wave/Batch Picking
- M12 GS1/GTIN

### ESTRATÉGICO (Mes 7-12)
- M5 EDI (cuando venda a cadenas)
- M6 B2B Portal Live
- M13 ANTAD Ready
- M14 Cadena Frío (cuando expanda refrigerados)
- M15 Mermas IA
- M7 Shipping API
- M8 Multi-Warehouse
- M18 Tesorería Multi-Bank

**Tiempo total:** 12 meses completo  
**Inversión:** GS1 ~$630/mes + APIs bancarias según banco + PAC existente

---

## 7. KPIs de Éxito

| KPI | Actual | Meta |
|-----|--------|------|
| Multas Carta Porte | Riesgo $97K/doc | 0 multas |
| Cierre mes contable | 5-10 días | 1-2 días |
| Mermas | Sin medir | -15% a -30% |
| Anti-robo + mermas recuperados | $0 | $250-650K/año |
| ANTAD ready | No | Sí (vender Walmart) |
| Conciliación bancaria auto | 0% | 100% |
| Productos con GTIN | 0% | 100% |
| Backorders resueltos auto | 0% | 80% |

---

## 8. Gaps Cubiertos

| Gap | Módulo | Estado |
|-----|--------|--------|
| F — WMS Móvil + Barcode | M1 | ✅ |
| O — Complex Pricing | M2 | ✅ |
| P — Backorder Management | M3 | ✅ |
| Q — Wave/Batch Picking | M4 | ✅ |
| R — EDI Integration | M5 | ✅ |
| S — B2B Portal Live | M6 | ✅ |
| T — Shipping API | M7 | ✅ |
| U — Multi-warehouse | M8 | ✅ |
| V — Carta Porte 3.1 | M9 | ✅ URGENTE |
| W — Complementos SAT | M10 | ✅ |
| Z — PLD/Antilavado | M11 | ✅ |
| AA — GS1/GTIN | M12 | ✅ |
| DD — ANTAD Ready | M13 | ✅ |
| HH — Cadena Frío | M14 | ✅ |
| II — Mermas IA | M15 | ✅ |
| KK — Contabilidad SAT | M16 | ✅ URGENTE |
| MM — APIs Bancarias | M17 | ✅ |
| NN — Tesorería Multi-Bank | M18 | ✅ |

---

## 9. Conexión con otros documentos

### Conexiones cruzadas:
- /audit/07 Facturación (CFDI + complementos)
- /audit/08 Inventario (WMS + mermas + multi-warehouse)
- /audit/14 Rutas (Carta Porte vinculada a ruta)
- /audit/17 Flota (vehículos en Carta Porte)
- /audit/20 Tesorería (APIs bancarias extienden)
- /audit/22 Productos (GS1/GTIN)
- /audit/26 Sistema Inteligente (anti-robo + WMS)
- /audit/28 Portales (B2B portal extiende)
- /audit/29 Divisas (multi-bank USD)
- /audit/30 Importaciones (pedimentos en Carta Porte)
- /audit/33 Cierres (contabilidad SAT cierra mes)
- /audit/36 Gestión (portal contadora recibe XML)

### Principios aplicados:
- **#4 CPP real:** mermas + WMS = costo verdadero
- **#6 Doble Unidad:** Carta Porte maneja kg + bultos
- **#8 Investigar antes de actuar:** investigación SAT exhaustiva
- **#11 El sistema todo lo ve:** WMS + anti-robo + IoT

---

## 10. Recomendación final

18 módulos que elevan ALMASA-OS de "ERP PYME bueno" a "ERP enterprise MX completo". Carta Porte 3.1 y Contabilidad Electrónica son URGENTES (multas activas).

**Prioridad absoluta:**
1. **Carta Porte 3.1** — evitar multas $97K/documento
2. **Contabilidad Electrónica** — cumplimiento CFF Art. 28
3. **APIs Bancarias** — cierre mes 1-2 días

**vs competencia MX:**
- Aspel SAE: no tiene 15 de 18 módulos
- CONTPAQi: no tiene 14 de 18
- SAP Business One: $30K-100K/año
- Oracle NetSuite: $30K-200K/año
- **ALMASA-OS: $0 + GS1 $630/mes**

Operamos a nivel enterprise, facturamos como PYME.

---

*ALMASA-OS · Operación Avanzada y Distribución MX · v1.0*  
*Generado el 10 de mayo de 2026*  
*18 módulos enterprise. $0 licencia. Compliance SAT nativo.*
