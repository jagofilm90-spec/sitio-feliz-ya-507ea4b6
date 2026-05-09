# Rediseño de RH / Empleados / ZKTC — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría de RH + decisiones operativas + metodología "Pensar como Oracle"  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** Personas correctas, datos correctos, contadora feliz.

---

## 1. La filosofía

ALMASA tiene 30+ empleados. Vendedores en campo, choferes en ruta, 
almacenistas en bodega, secretarias en oficina, contadora externa.
Cada uno trabaja DIFERENTE.

La nómina la procesa la CONTADORA externamente. ALMASA-OS NO calcula 
ISR ni IMSS ni genera CFDI 4.0 nómina. Su responsabilidad es:
- Capturar datos del empleado
- Registrar asistencia (con modelo correcto por rol)
- Calcular horas trabajadas y extras
- Manejar incapacidades, vacaciones, permisos
- Calcular comisiones (ya en /audit/13)
- EXPORTAR datos limpios a contadora cada periodo

> Principio rector: "Sistema RH operativo, no fiscal. La contadora 
> no debe inventar datos: debe procesar los que el sistema le entrega."

---

## 2. Estado actual de RH

ALMASA-OS RH es uno de los módulos más completos:

- 17 archivos en /components/empleados (~4,431 líneas)
- Empleados.tsx con 3,126 líneas
- 7 archivos en /components/asistencia (~1,552 líneas)
- 42 campos en tabla empleados
- 6 tablas de soporte (asistencia, zk_mapeo, vacaciones, actas, sueldos, docs_pendientes)
- generarContratoPDF.ts (987 líneas)
- 3 edge functions (analyze-employee-file-bundle, delete-user, gmail-api)

| Capacidad | Estado | Detalle |
|-----------|--------|---------|
| Tabla empleados (42 campos) | ✅ Completo | Identidad, laboral, bancario, emergencia |
| Onboarding wizard | ✅ EmpleadoWizard | 314 líneas |
| Datos personales (CURP, RFC, NSS) | ✅ Completo | Captura completa |
| Documentos digitales | ✅ Storage + IA | analyze-employee-file-bundle |
| Contrato laboral PDF | ✅ 987 líneas | Con firma digital |
| Aviso de privacidad | ✅ PDF auto | Generación automática |
| Firma digital contrato | ✅ Canvas | FirmaContratoFlow + Addendum |
| Expediente digital con IA | ✅ ÚNICO | Edge function analiza expediente |
| Asistencia diaria (ZKTeco) | ✅ Funcional | Datos llegan a BD |
| Mapeo ZK→Empleado | ✅ Manual | ZkMappingPanel |
| Premio asistencia | ✅ Calculado | Semanal según dias_laborales |
| Reportes asistencia | ✅ 3 tipos | Semanal, quincenal, mensual |
| Vacaciones | ✅ Workflow | Solicitud, aprobación, masiva |
| Actas administrativas | ✅ Con firma | PDF con testigos |
| Historial de sueldo | ✅ Completo | Antes/después/quien cambió |
| Foto empleado | ✅ Storage | Upload + crop |
| Proceso de baja | ✅ Checklist | ProcesoBaja.tsx (204 líneas) |
| Dar acceso al sistema | ✅ Dialog | Crea auth.user vinculado |
| Comisiones vendedores | 🟡 Frontend | Ya en /audit/13 |
| Horas extras | ❌ NO existe | Solo entrada en ruta |
| Permisos especiales | ❌ NO existe | Sin tabla |
| Incapacidades IMSS | ❌ NO existe | Sin captura |
| Evaluaciones desempeño | ❌ NO existe | Sin tabla ni UI |
| Capacitación tracking | ❌ NO existe | Sin sistema |
| Bonos formales | ❌ NO existe | Solo premio asistencia |
| Cálculo finiquito legal | ❌ NO existe | PDF sin cálculo |
| Export automático contadora | ❌ NO existe | Hoy manual |

**Conclusión:** Base sólida. 6 brechas a cerrar.

---

## 3. Estándar Oracle / SAP / NetSuite

**Oracle HCM Cloud:** Worker lifecycle, compensation plans, absence management, performance.
**SAP SuccessFactors:** Employee Central, time off, recruiting, learning, compensation.
**NetSuite SuitePeople:** Employee Center autoservicio, time tracking, mobile app.

7 conceptos universales:
1. Employee Master Data centralizado
2. Time and Attendance automático
3. Absence Management con workflow
4. Position Management con histórico
5. Compensation Tracking (sueldo + bonos + comisiones)
6. Performance Management
7. Exit Management completo

---

## 4. Por qué ALMASA-OS gana

| Dimensión | Oracle/SAP | ALMASA-OS | Ganador |
|-----------|-----------|-----------|---------|
| Empleado master data | ✅ | ✅ 42 campos | EMPATE |
| Onboarding wizard | ✅ | ✅ | EMPATE |
| Contrato digital PDF | ✅ | ✅ 987 lín | ALMASA |
| Aviso privacidad | ✅ | ✅ | EMPATE |
| Firma digital | ✅ | ✅ canvas | EMPATE |
| Expediente IA analysis | ❌ | ✅ ÚNICO | ALMASA |
| Biométrico ZKTeco | 🟡 | ✅ integrado | ALMASA |
| Asistencia automática | ✅ | ✅ | EMPATE |
| Premio asistencia | 🟡 | ✅ ÚNICO MX | ALMASA |
| Reportes asistencia | ✅ | ✅ 3 tipos | EMPATE |
| Vacaciones workflow | ✅ | ✅ | EMPATE |
| Actas administrativas | ✅ | ✅ con firma | EMPATE |
| Histórico sueldos | ✅ | ✅ | EMPATE |
| Proceso baja | ✅ | ✅ checklist | EMPATE |
| Horas extras | ✅ | ❌ → planeado | ORACLE |
| Incapacidades IMSS | ✅ | ❌ → planeado | ORACLE |
| Evaluación desempeño | ✅ | ❌ → planeado | ORACLE |
| Cálculo finiquito | ✅ | 🟡 → planeado | ORACLE |
| Nómina interna | ✅ | ❌ contadora externa | ORACLE |
| Export contadora | 🟡 | ❌ → planeado | ALMASA (post-impl) |
| Modelos diferenciados | 🟡 | ❌ → diseñado | ALMASA (post-impl) |
| Costo licencia | $$$$ | $0 | ALMASA |

**Marcador final (post-implementación):**
ALMASA gana: 6 dimensiones (incluyendo expediente IA, premio asistencia, modelos diferenciados ÚNICOS)
Oracle gana: 5 dimensiones
Empate: 9 dimensiones

ALMASA tendrá ventajas únicas:
1. IA analysis de expediente automático
2. ZKTeco realmente integrado (no manual)
3. Premio de asistencia mexicano (ley)
4. Modelos diferenciados por rol (bodega/ruta/campo)

---

## 5. Las 6 Brechas Críticas

### Brecha 1 — Modelos de Asistencia Diferenciados (CRÍTICO)

**Realidad operativa de ALMASA:**

3 tipos de empleados con realidades distintas:

```
MODELO A — BODEGA / OFICINA
   - Almacenistas, secretarias, contadora, admin
   - Entran y salen del mismo lugar
   - ZKTeco registra ENTRADA y SALIDA
   - Horas trabajadas = salida - entrada - 1h comida

MODELO B — RUTA
   - Choferes, ayudantes de carga
   - Entran a bodega, salen a ruta
   - NO regresan a bodega
   - ZKTeco registra solo ENTRADA
   - GPS rastrea ruta
   - Horas trabajadas = (última entrega + 1h traslado) - entrada

MODELO C — VENDEDOR CAMPO
   - Vendedores
   - Van directo a clientes desde casa
   - Sin ZKTeco
   - GPS marca inicio (primer cliente)
   - Horas trabajadas = (último cliente + 30min) - primer cliente
```

**Por qué es crítico:** Hoy ALMASA NO tiene registro de salida 
real de choferes. Si demandan, ley mexicana presume horas 
trabajadas a favor del empleado.

**Modelo de datos:**

```sql
ALTER TABLE empleados ADD COLUMN modelo_asistencia TEXT 
  CHECK (modelo_asistencia IN (
    'bodega_oficina',
    'ruta',
    'vendedor_campo'
  )) DEFAULT 'bodega_oficina';

ALTER TABLE empleados ADD COLUMN traslado_post_ruta_minutos INTEGER DEFAULT 60;
ALTER TABLE empleados ADD COLUMN traslado_post_cliente_minutos INTEGER DEFAULT 30;

CREATE TABLE asistencia_jornadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  fecha DATE NOT NULL,
  modelo_aplicado TEXT NOT NULL,
  
  -- Datos según modelo
  hora_entrada_zk TIMESTAMPTZ,    -- A y B
  hora_salida_zk TIMESTAMPTZ,     -- A solo
  primer_gps_cliente TIMESTAMPTZ, -- C
  ultimo_gps_cliente TIMESTAMPTZ, -- C
  ultimo_gps_entrega TIMESTAMPTZ, -- B
  
  -- Cálculos
  horas_trabajadas NUMERIC,
  horas_normales NUMERIC,
  horas_extras NUMERIC,
  horas_extras_dobles NUMERIC,
  horas_extras_triples NUMERIC,
  
  -- Aprobación
  extras_aprobadas BOOLEAN DEFAULT false,
  aprobadas_por UUID,
  aprobadas_en TIMESTAMPTZ,
  motivo_extras TEXT,
  
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(empleado_id, fecha)
);
```

**Esfuerzo:** 2-3 semanas  
**Prioridad:** ALTA (legal)

### Brecha 2 — Horas Extras con Workflow de Aprobación

**Problema:** Hoy ZKTeco solo registra premio de asistencia.
NO calcula horas extras según LFT México.

**LFT México:**
- Jornada legal: 8 horas/día (algunas regiones 7.5)
- Primeras 9 hrs/semana extras → DOBLES
- Después → TRIPLES

**Solución:** Cálculo automático + aprobación admin.

```sql
CREATE OR REPLACE FUNCTION calcular_horas_extras_periodo(
  p_empleado_id UUID,
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS TABLE (
  fecha DATE,
  horas_normales NUMERIC,
  horas_extras_dobles NUMERIC,
  horas_extras_triples NUMERIC,
  monto_pago_extras NUMERIC,
  estado TEXT
) AS $$
DECLARE
  v_sueldo_hora NUMERIC;
  v_acumulado_extras_semana NUMERIC := 0;
BEGIN
  -- Obtener sueldo por hora
  SELECT (sueldo_bruto / 30 / 8) INTO v_sueldo_hora
  FROM empleados WHERE id = p_empleado_id;
  
  -- Iterar jornadas en periodo
  -- Lógica de cálculo según LFT
  -- Primeras 9 hrs extras semana = doble
  -- Después = triple
  -- ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Workflow aprobación:**
1. Sistema detecta extras automáticamente
2. Estado: pendiente_aprobacion
3. Admin recibe notificación
4. Admin aprueba/rechaza con motivo
5. Solo aprobadas van al export contadora

**Esfuerzo:** 1-2 semanas  
**Prioridad:** ALTA (legal)

### Brecha 3 — Incapacidades IMSS

**Problema:** Empleado va al IMSS, le dan incapacidad. Hoy 
nadie lo registra formalmente. Días extras se pagan mal.

**Solución:**

```sql
CREATE TYPE tipo_incapacidad AS ENUM (
  'enfermedad_general',
  'accidente_trabajo',
  'maternidad',
  'cuidado_familiar',
  'paternidad'
);

CREATE TABLE incapacidades_imss (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias_incapacidad INTEGER GENERATED ALWAYS AS 
    (fecha_fin - fecha_inicio + 1) STORED,
  
  tipo tipo_incapacidad NOT NULL,
  folio_imss TEXT,
  ramo_seguro TEXT,
  
  -- Documento
  documento_url TEXT,
  documento_hash_sha256 TEXT,
  
  -- Subsidio
  subsidio_imss_calculado NUMERIC,
  pagado_almasa BOOLEAN DEFAULT false,
  
  registrado_por UUID NOT NULL,
  registrado_en TIMESTAMPTZ DEFAULT now(),
  notas TEXT
);
```

**Reglas:**
- Días de incapacidad NO cuentan como faltas
- IMSS paga subsidio (60% del sueldo desde día 4)
- ALMASA puede complementar (decisión empresa)
- Aparece en export a contadora

**Esfuerzo:** 1 semana  
**Prioridad:** IMPORTANTE

### Brecha 4 — Evaluaciones de Desempeño

**Problema:** Sin evaluación formal = sin historial =
argumento débil para despidos/ascensos.

**Solución simple:**

```sql
CREATE TYPE periodo_evaluacion AS ENUM (
  'semestral_q1_q2', 'semestral_q3_q4', 'anual'
);

CREATE TABLE evaluaciones_desempeno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  evaluador_id UUID NOT NULL REFERENCES empleados(id),
  
  periodo periodo_evaluacion NOT NULL,
  ano_evaluacion INTEGER NOT NULL,
  
  -- Competencias evaluadas (JSONB flexible)
  competencias JSONB NOT NULL,
  
  -- Cualitativo
  fortalezas TEXT,
  areas_mejora TEXT,
  meta_proximo_periodo TEXT,
  comentarios_empleado TEXT,
  
  -- Score final
  score_total NUMERIC GENERATED ALWAYS AS (
    (SELECT AVG((value->>'score')::numeric) 
     FROM jsonb_each(competencias))
  ) STORED,
  
  -- Firmas
  firma_evaluador TEXT,
  firma_evaluador_fecha TIMESTAMPTZ,
  firma_empleado TEXT,
  firma_empleado_fecha TIMESTAMPTZ,
  
  pdf_url TEXT,
  pdf_hash_sha256 TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Periodicidad:** 1-2 veces al año por empleado.

**Esfuerzo:** 1-2 semanas  
**Prioridad:** NICE

### Brecha 5 — Cálculo de Finiquito Legal

**Problema:** ProcesoBaja.tsx genera PDF pero sin cálculos legales.
Contadora calcula manualmente → errores → demandas.

**Solución:**

```sql
CREATE OR REPLACE FUNCTION calcular_finiquito_legal(
  p_empleado_id UUID,
  p_fecha_baja DATE,
  p_motivo_baja TEXT  -- 'voluntaria', 'justificada', 'injustificada'
)
RETURNS JSONB AS $$
DECLARE
  v_resultado JSONB;
  v_sueldo_diario NUMERIC;
  v_anos_servicio NUMERIC;
  v_dias_vacaciones_pendientes INTEGER;
  v_dias_aguinaldo_proporcional INTEGER;
BEGIN
  -- Calcular cada componente legal
  -- 1. Sueldo proporcional últimos días
  -- 2. Vacaciones no disfrutadas (LFT Art 79)
  -- 3. Prima vacacional (LFT Art 80)
  -- 4. Aguinaldo proporcional (LFT Art 87)
  
  -- Si despido injustificado (LFT Art 50):
  -- - 3 meses de sueldo
  -- - 20 días por cada año servido
  -- - Prima de antigüedad (12 días/año, máx 2 SMG)
  
  -- Construir JSON con desglose
  v_resultado := jsonb_build_object(
    'sueldo_proporcional', 0,
    'vacaciones_pendientes', 0,
    'prima_vacacional', 0,
    'aguinaldo_proporcional', 0,
    'indemnizacion_3_meses', 0,
    'indemnizacion_20_dias_por_ano', 0,
    'prima_antiguedad', 0,
    'total', 0
  );
  
  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Genera PDF con desglose** que contadora valida y procesa pago.

**Esfuerzo:** 2 semanas  
**Prioridad:** IMPORTANTE (riesgo legal)

### Brecha 6 — Export Automático a Contadora

**Problema:** Hoy contadora pide datos por WhatsApp / email.
Manual = errores. ALMASA pierde tiempo cada periodo.

**Solución:**

```sql
CREATE TABLE exports_nomina (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  generado_por UUID NOT NULL,
  generado_en TIMESTAMPTZ DEFAULT now(),
  
  archivo_url TEXT NOT NULL,
  archivo_hash_sha256 TEXT,
  
  empleados_incluidos INTEGER,
  total_dias_trabajados INTEGER,
  total_horas_extras NUMERIC,
  total_comisiones NUMERIC,
  
  enviado_email BOOLEAN DEFAULT false,
  enviado_a TEXT,
  enviado_en TIMESTAMPTZ,
  notas TEXT
);
```

**Workflow:**
1. Cron mensual/quincenal genera export
2. Email automático a contadora
3. Histórico queryable
4. Contadora confirma recibo

**Esfuerzo:** 1 semana  
**Prioridad:** ALTA (proceso recurrente)

---

## 6. Roadmap

| Mes | Entregas |
|-----|----------|
| Mayo (resto) | /audit/15 generado |
| Julio | Brecha 1: Modelos asistencia diferenciados |
| Julio | Brecha 2: Horas extras con aprobación |
| Agosto | Brecha 3: Incapacidades IMSS |
| Agosto | Brecha 6: Export automático contadora |
| Septiembre | Brecha 5: Cálculo finiquito legal |
| Octubre | Brecha 4: Evaluaciones desempeño |

**Tiempo total:** 5-6 meses  
**Inversión:** $0 software (solo desarrollo)

---

## 7. Decisiones de Negocio Pendientes

### Decisión 1 — Tiempo de traslado post-ruta
- 1 hora estándar para choferes? Ajustable por ruta?

### Decisión 2 — Quién aprueba horas extras
- Solo Jose? Gerente almacén también?

### Decisión 3 — Complemento ALMASA al subsidio IMSS
- ALMASA paga 100% durante incapacidad? Solo lo que IMSS no cubre?

### Decisión 4 — Frecuencia evaluaciones
- Semestral (Q2 + Q4) o solo anual?

### Decisión 5 — Periodicidad export contadora
- Quincenal? Mensual? Configurable por contadora?

### Decisión 6 — Revisar modelo asistencia por empleado
- Asignación inicial: tú lo defines empleado por empleado?

---

## 8. Conexión con Biblia v1.1 y otros documentos

### Biblia v1.1 - Principios afectados:
- Principio #1 (Privacidad por rol): empleado ve solo sus datos
- Principio #5 (Utilidad en tres niveles): comisiones reales
- Principio #10 (Users Before Perfection): MVP primero

### Conexiones cruzadas:
- /audit/11-ROLES-SEGURIDAD: deprovisioning automático (urgente)
- /audit/13-PEDIDOS: comisiones server-side
- /audit/12-EVIDENCIA: hashes en documentos personales
- /audit/14-RUTAS: GPS chofer alimenta cálculo de horas (Modelo B)

---

## 9. Recomendación final

ALMASA-OS RH es uno de los módulos más maduros: 17 archivos, 
4,431 líneas + Empleados.tsx 3,126. Tiene capacidades únicas:
- IA análisis de expediente
- ZKTeco realmente integrado
- Premio asistencia mexicano
- Contrato PDF con firma digital de 987 líneas

Las 6 brechas son específicas y de alto valor:
1. MODELOS ASISTENCIA — solución a realidad operativa única
2. HORAS EXTRAS — protección legal
3. INCAPACIDADES IMSS — completar tracking
4. EVALUACIONES — historial profesional
5. FINIQUITO LEGAL — protección legal
6. EXPORT CONTADORA — automatización proceso recurrente

**Orden estricto:**
1. JULIO 2026: Modelos asistencia + Horas extras (legal)
2. AGOSTO 2026: Incapacidades + Export contadora
3. SEPTIEMBRE 2026: Finiquito legal
4. OCTUBRE 2026: Evaluaciones

Una vez completas las 6 brechas, ALMASA-OS RH será **superior 
a Oracle HCM para PYMES mexicanas con contadora externa**, con 
costo $0 y ventajas únicas (IA expediente, ZKTeco integrado, 
modelos diferenciados por rol).

---

*ALMASA-OS · Rediseño de RH / Empleados / ZKTC · v1.0*  
*Generado el 10 de mayo de 2026*  
*Personas correctas, datos correctos, contadora feliz.*
