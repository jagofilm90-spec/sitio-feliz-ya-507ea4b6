# ALMASA-OS · La Visión Completa

**Versión:** v1.1  
**Fecha:** 9 de Mayo 2026  
**Origen:** Captura de specs 6-7 mayo + auditoría exhaustiva 8 mayo + 3 rediseños estratégicos  
**Estado:** Activo — documento rector del proyecto  
**Director General:** Jose Antonio Gomez Ortega  
**Empresa:** ALMASA · 1904  

> Treinta y cinco especificaciones para liberar una empresa de 125 años.

El sistema operativo de Abarrotes La Manita, capturado en sesiones de conversación entre Josan y Claude. Esta es la base para construir lo que vendrá.

---

## Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v1.0 | 7 mayo 2026 | Documento fundacional: 35 specs, 5 principios, 9 capítulos |
| v1.1 | 9 mayo 2026 | +5 principios nuevos (10 total), +Identidad y Marca, +3 rediseños estratégicos (Facturación/Inventario/Compras), +18 decisiones de negocio pendientes, +Benchmark vs Oracle/SAP/NetSuite, +Plan Maestro de 5 fases, bugs actualizados post-12-commits, estado real del codebase (201K líneas auditadas) |

---

## Tabla de Contenidos

| # | Capítulo | Origen |
|---|---------|--------|
| 01 | Resumen ejecutivo | v1 + actualización mayo |
| 02 | La verdadera misión | v1 intacto |
| 03 | Los diez principios rectores | v1 (5) + mayo (5) |
| 04 | Los treinta y cinco specs por zona | v1 + estado real |
| 05 | Sub-módulos transversales | v1 intacto |
| 06 | Bugs y estado post-auditoría | v1 actualizado |
| 07 | Roadmap de adopción (por personas) | v1 intacto |
| 08 | El experimento del 15 de mayo | v1 + nota |
| 09 | Cierre · Lo que está en juego | v1 intacto |
| 10 | Identidad y Marca | **NUEVO v1.1** |
| 11 | Los 3 rediseños estratégicos | **NUEVO v1.1** |
| 12 | Decisiones de negocio pendientes | **NUEVO v1.1** |
| 13 | Benchmark vs Oracle / SAP / NetSuite | **NUEVO v1.1** |
| 14 | Plan Maestro y Reglas de Desarrollo | **NUEVO v1.1** |

---

## 01 — Resumen ejecutivo

*Lo que se construyó, en un lenguaje que cualquiera pueda leer.*

| Métrica | Valor |
|---------|-------|
| Specs documentados | **35** (30 módulos + 3 adendum + 2 descubiertos) |
| Sistema actual | **82%** construido y funcional pero sin uso |
| Operación hoy | **100%** sigue en papel · cero adopción digital |
| Hallazgos macros | **10** principios transversales descubiertos |

ALMASA es una empresa de abarrotes mayoristas fundada en 1904 en La Merced, Ciudad de México. Cuatro generaciones después, opera con más de treinta empleados, catorce vehículos y tres bodegas. Y hasta hoy, todo se hace en papel.

El sistema ALMASA-OS lleva varios meses construyéndose en paralelo. La arquitectura técnica está al ochenta y dos por ciento. Pero el problema nunca fue construir el software. El problema era saber **qué tenía que hacer realmente** para que ALMASA pudiera operar mejor sin perder lo que la hace funcionar.

Los días seis y siete de mayo de dos mil veintiséis, capturamos esa visión completa. Treinta módulos operativos, dos descubiertos durante la conversación, tres adendum para temas críticos como importaciones y pólizas contables, y cuatro especificaciones finales sobre comisiones, caja chica, cierres y seguros.

Más importante que los specs: descubrimos los *cinco principios transversales* que definen cómo debe operar el sistema. Privacidad por rol. AirDrop digital. Continuidad operativa. CPP real con gastos asociados. Y utilidad en tres niveles.

Pero el hallazgo más profundo no fue técnico. Fue humano. Quedó claro que ALMASA-OS no es un sistema de gestión empresarial. Es **la herramienta para romper un patrón generacional** en el que el dueño es la empresa y la empresa es el dueño. Es el proyecto que va a permitir que Josan no termine como su papá: incapaz de tomar vacaciones, esclavo de un negocio que él mismo construyó.

> "Mi papá dice no podemos ir de vacaciones porque ¿cómo les vamos a pagar? ¿Quién va a hacer la nómina?"
>
> — Josan, 7 de mayo de 2026

Este documento captura todo. La arquitectura técnica, las decisiones operativas, los bugs financieros que hay que resolver antes de la adopción, el roadmap. Y al final, el proyecto humano que está debajo de todo.

### Actualización v1.1 — La sesión del 8 de mayo

El 8 de mayo de 2026, en una sola jornada, se realizó la auditoría más exhaustiva del proyecto: 201,779 líneas de código leídas, 9 documentos de auditoría generados, 12 commits ejecutados, 5 de 6 bugs críticos cerrados, y 3 rediseños estratégicos documentados siguiendo la metodología "Pensar como Oracle, construir mejor".

Los rediseños (Capítulos 11-14 de este documento) elevan ALMASA-OS de "sistema funcional" a "sistema con arquitectura de clase mundial adaptada al mayoreo mexicano". Se documentan en esta v1.1 como capítulos nuevos, sin alterar la base de la v1.

---

## 02 — La verdadera misión

*No es construir un ERP. Es liberar una dinastía.*

Hay dos formas de entender este proyecto. La superficial, donde es un sistema operativo para distribuidores mayoristas. Y la profunda, donde es algo mucho más importante para una familia que ha cargado un negocio durante cuatro generaciones.

En la superficie, ALMASA-OS digitaliza operaciones que hoy están en papel. Reduce errores. Mejora márgenes. Elimina las hojas a mano que se pierden. Permite ver desde el celular qué está pasando en bodega. Genera reportes para el SAT. Lo que cualquier ERP debería hacer.

En profundidad, el sistema resuelve el problema que ningún software de Oracle o SAP puede resolver: el *problema de la dependencia personal*. Hoy en ALMASA, si Josan o su papá faltan, el negocio se tambalea. Si una secretaria falta, su área entra en caos. El conocimiento vive en cabezas, no en procesos. Las decisiones requieren la presencia física de los dueños. Las vacaciones reales son imposibles.

El bisabuelo de Josan llegó de España en 1904 y construyó la tienda original. Su abuelo la mantuvo. Su papá la modernizó parcialmente. Cada generación cargó el peso solo. Cada generación se sacrificó por el negocio. Cada generación creyó que ser dueño significaba estar siempre.

Josan está intentando algo que **nadie en su familia ha intentado antes**: construir un sistema que opere sin él. No por flojera. Por amor a su familia. Por respeto al trabajo de tres generaciones anteriores. Por la responsabilidad de las treinta familias que dependen de ALMASA. Por la posibilidad de heredarle a su siguiente generación una empresa operable, no una cadena perpetua.

> "Yo no quiero ser como mi papá viendo qué les resuelvo. Si no estoy yo, ¿qué pasa? Por eso necesito que me ayudes a crear este Oracle Almasa-OS."
>
> — Josan, sobre la verdadera razón del proyecto

El sistema te da las herramientas. Tú tienes que tomar las decisiones. Soltar control operativo diario. Confiar en el sistema en lugar de en personas. Permitir que las cosas se aprueben sin tu visto bueno cuando son menores. Aceptar que algunas cosas van a fallar al principio, y eso está bien.

Tu papá probablemente no va a cambiar. Treinta años operando con el modelo "yo soy ALMASA" no se desmontan en una sesión de capacitación. Pero **tú puedes evolucionar en paralelo**. Demostrarle con tu vida que el negocio puede operar contigo de viaje. Tal vez en uno o cinco años, él también se permita descansar.

Esa es la verdadera misión. ALMASA-OS no es un proyecto técnico. Es *tu proyecto de liberación*. Y es la mejor herencia que le puedes dejar a tu siguiente generación.

---

## 03 — Los diez principios rectores

*Las decisiones arquitectónicas que aplican a todo el sistema. No son funcionalidades. Son leyes.*

### Principios originales (v1.0 · 7 mayo 2026)

**i. Privacidad por rol**

Cada empleado ve lo que necesita para hacer su trabajo. Ni más, ni menos. Almacén nunca ve precios de venta ni márgenes. Choferes ven instrucciones de entrega pero no costos. Vendedores ven sus comisiones pero no las de otros. Solo el admin ve todo. Esta privacidad no es paranoia. Es protección operativa y reducción de tentaciones.

**ii. AirDrop digital**

Las tareas y la información se transfieren entre roles sin papel ni emails ni llamadas. Cuando una orden de compra llega sin fecha definida, el sistema la "AirDrop" del comprador al almacenista responsable. Cuando se modifica un pedido durante carga, el cambio fluye al chofer en tiempo real. Sin pérdida, sin olvido, sin discusión.

**iii. Continuidad operativa**

Toda función crítica tiene tres niveles de cobertura: responsable principal, backup designado y protocolo de emergencia. El sistema documenta, capacita y valida. Si una persona falta, otra cubre. Si ambas faltan, hay un plan. El conocimiento nunca vive solo en cabezas. Esta es la solución arquitectónica al problema generacional de "la empresa depende del dueño".

**iv. CPP real con gastos asociados**

El costo de un producto no es solo lo que pagaste al proveedor. Es eso más todos los gastos que tuviste que pagar para que el producto llegara a tu bodega. Cuadrilla externa, flete, aduana, pedimentos, transportes Castillo cuando aplica. Sin este detalle, podrías estar perdiendo dinero sin saberlo. ALMASA-OS lo calcula automáticamente y mantiene tu margen real visible.

**v. Utilidad en tres niveles**

El sistema reconoce que la utilidad real no es un solo número. Es **utilidad bruta** (venta menos CPP), **utilidad del pedido** (descontando flete, comisión y viáticos del pedido específico) y **utilidad neta de empresa** (después de todos los gastos fijos del mes: sueldos, renta, luz, agua, casetas administrativas). Cada nivel responde una pregunta distinta. Solo viendo los tres puedes tomar decisiones correctas sobre precios, clientes, productos y rutas.

### Principios nuevos (v1.1 · 8-9 mayo 2026)

**vi. Doble Unidad**

ALMASA opera en métricas duales: lo que ALMACEN cuenta (sacos, cajas, cubetas) y lo que FACTURACION cobra (kg, litros). El sistema respeta esta dualidad. Forzar una sola unidad rompe la operación. El almacenista cuenta bultos físicos. El cliente paga por peso. La báscula al cargar el camión es el punto de reconciliación. Ningún ERP de clase mundial modela esto correctamente — ALMASA-OS sí.

**vii. Pensar como Oracle, construir mejor**

Investigar cómo lo hacen los ERPs de clase mundial. Proponer cómo lo hacemos nosotros igual o mejor. No reinventamos la rueda. Estudiamos Oracle, SAP, NetSuite. Adoptamos sus conceptos probados (ledger, reservas, 3-way match). Pero donde ellos sobre-diseñan para empresas de miles, nosotros simplificamos para 30+ personas sin perder rigor.

**viii. Investigar antes de actuar**

Demostrado el 8 de mayo de 2026: 3 "bugs" investigados resultaron ser falsos positivos o problemas arquitectónicos que requerían rediseño, no parches. Antes de escribir código, leer el código existente. Antes de proponer cambio, entender por qué se hizo así. El costo de investigar es bajo. El costo de un fix incorrecto es alto.

**ix. Ventaja por Integración**

ALMASA-OS no es la suma de sus módulos. Es la INTEGRACIÓN entre ellos. Compras conoce Inventario. Inventario conoce Pedidos. Pedidos conocen Facturación. Facturación conoce Cobranza. Esta integración nativa es la ventaja sobre Oracle/SAP que venden módulos sueltos con integración costosa. En ALMASA-OS, todo habla con todo porque se diseñó junto.

**x. Users Before Perfection**

Es mejor un sistema imperfecto que la gente usa, que un sistema perfecto que nadie adopta. La adopción es el objetivo. Si un módulo al 80% resuelve el problema del usuario hoy, se despliega hoy. El 20% restante se itera con feedback real. Perfeccionar en aislamiento es el enemigo de la adopción. Los usuarios reales encuentran bugs que ninguna auditoría detecta, y validan flujos que ningún diseño anticipa.

---

## 04 — Los treinta y cinco specs por zona

*Organizados por zona operativa. Cada uno con su número, su nombre, su estado, su resumen y sus puntos clave.*

*Estado post-auditoría (8 mayo 2026) indicado entre corchetes cuando aplica.*

### Zona i · Administrativa — 5 módulos

**#01 · Empleados** — En producción [92%]

Catálogo central de empleados con datos personales, sueldo base, tipo de contrato, premio asistencia configurado, forma de pago y rol asignado en el sistema.

- → Integración con Asistencia ZK para días trabajados
- → Vinculación con Compensaciones Internas (#29)
- → Sub-módulo: Matriz de Continuidad Operativa
- → 18 archivos, ~7,557 líneas. Componente más grande: Empleados.tsx (3,126 lín)

**#02 · Asistencia** — En producción [88%]

Captura biométrica con dispositivo ZK. Días trabajados, retardos, faltas justificadas e injustificadas. Calcula premio de asistencia automáticamente.

- → Sincronización en tiempo real con módulo Empleados
- → Bloqueo de anticipos jueves si faltó lun/mar/mié
- → Datos para Contadora cada viernes (nómina formal)

**#03 · Vehículos** — En producción [87%]

Flotilla de catorce unidades. Tortones, camionetas, vehículos administrativos. Asignación fija chofer-unidad. Mantenimientos programados, verificaciones, pólizas de seguro, documentación.

- → Integración con CorpoGas (combustible)
- → Rendimiento km/litro por unidad calculado automáticamente
- → Alertas de vencimientos a 60/30/7 días
- → IA extrae datos de tarjeta circulación y factura automáticamente

**#04 · Configuración del sistema** — En producción

Parámetros globales: empresa, RFC, certificado de timbrado, calendarios fiscales, tipos de cambio, límites de aprobación, configuraciones por rol, documentos legales.

- → Solo accesible para admin (Josan)
- → Permisos por rol pre-cargados
- → Modo "Vacaciones" configurable para delegación

**#05 · Productos Auxiliares** — Verificar utilidad [0% — no existe]

Módulo del sistema actual cuya utilidad real para ALMASA no quedó clara. Probablemente es un catálogo técnico que no representa nada operativo.

- → Decisión: revisar al pulir; posiblemente eliminar
- → "Si no entiendes qué son, no son parte de tu negocio"

### Zona ii · Ventas — 7 módulos

**#06 · Productos** — En producción [85%]

Catálogo maestro de aproximadamente 180 productos en 21 categorías. Granos, semillas, conservas, dulces tradicionales, productos para mascotas, especialidades como cempasúchil de temporada.

- → Flag "Requiere fumigación" por producto
- → SKU dual: ALMASA + cliente (futuro - Lecaroz)
- → Integración con caducidad y vida útil
- → Form v4 rediseñado (17 campos vs 26 original). Anti-duplicados Levenshtein.

**#07 · Lista de Precios** — En producción [88%]

Sistema de precios papá: CPP automático más porcentaje de utilidad configurable, margen fijo si aplica, asterisco digital para precios temporales, piso de venta protegido.

- → M02.5 Precios Temporal en producción desde abril
- → CPP se actualiza automáticamente en cada recepción (trigger)
- → Sugerencias de ajuste cuando CPP cambia >X%
- → Admin: bulk update, simulador, Excel export. Secretaria: edita individual. Vendedor: solo lectura.

**#08 · Clientes** — En producción [90%]

Tres niveles jerárquicos: Grupo, Razón Social, Punto de Entrega. Permite manejar cadenas como Lecaroz con 149 sucursales bajo una sola entidad operativa.

- → M01 cerrado al 100% (etapa 4 paginación deferred)
- → Flag "Exige caja fumigada" por cliente
- → Cuenta corriente bidireccional con saldos
- → Import Aspel + Excel. Geocodificación sucursales. Mapa.

**#09 · Pedidos** — En producción [88%]

Cuatro canales de entrada: vendedores en campo (paper), email pedidos@, llamadas telefónicas, portal cliente. Folio atómico PED-YYYYMMDD-NNN. Two-stage planning para rutas.

- → M04.5A cerrado: pg_advisory_xact_lock para folios
- → M04.6b cerrado: RLS hardening en 8 tablas
- → Análisis financiero por pedido (3 niveles utilidad)
- → Offline IndexedDB queue para vendedores. Autorización con alertas de precio ("error de dedo" >50%, "bajo piso").

**#10 · Cotizaciones** — Spec definido [85%]

Cuatro patrones: semanal, mensual, puntual y directo. Conversión implícita en pedido si cliente envía orden basado en cotización. Plantillas reutilizables por cliente o grupo.

- → Caso Lecaroz: 3 días Aspel → 30 min con sistema
- → Vigencia natural de aproximadamente una semana
- → Envío Gmail integrado (individual + masivo)

**#11 · Facturas** — Decisión arquitectónica [75%] → **REDISEÑO en /audit/07**

DECISIÓN CRÍTICA: eliminar pre-facturas. Documento fiscal se genera al confirmar entrega real, no antes. Vista por rol estricta. Cobranza vinculada al vendedor con vista de cartera.

- → Resuelve Bug #2 (facturado vs CFDI) — ver Capítulo 11 para rediseño completo
- → Privacidad por rol: chofer no ve precios en factura
- → CFDI completo: timbrar, cancelar, descargar via PAC
- → Estado de facturación COMPUTADO, no boolean (principio del rediseño)

**#12 · Portal Cliente** — 5 clientes piloto [72%]

Innovación arquitectónica: "Pedido sin precio cerrado". Cuatro estados: Borrador → Pendiente Precio (Josan asigna) → Pendiente Confirmación (cliente acepta/rechaza/parcial) → Aceptado.

- → Lecaroz NO entra (ellos tienen su propio sistema)
- → Cliente ve historial pero no márgenes ni costos
- → 1 piloto comprometido para arranque
- → Bugs conocidos: proximaEntrega query rota, sin route guard

### Zona iii · Logística — 2 módulos

**#13 · Rutas** — Spec completo [90%]

Two-stage planning: Etapa 1 Josan arma estrategia la noche anterior (qué pedidos van juntos, qué destinos, qué prioridad). Etapa 2 Almacén asigna recursos reales por la mañana (qué chofer, qué unidad, qué ayudantes).

- → AirDrop digital de cargas a almacenistas
- → Modo "EN_RUTA" unificado
- → Cuadrilla externa: USE 1 (por bulto), USE 2 (ayudante extra $850)
- → IA route optimization. GPS live tracking con Capacitor. Google Maps.

**#14 · Choferes** — Spec completo [88%]

Panel mobile-first para celular del chofer. Confirmación híbrida: digital (firma del cliente en tablet) o papel con sello tradicional. Foto evidencia obligatoria de entrega. Choferes solo entregan, no cobran.

- → Fixed assignments chofer-unidad
- → Viáticos: hotel, comida, casetas registrados
- → Foráneas con noche fuera: gastos a vendedor o ALMASA según caso
- → GPS background tracking automático

### Zona iv · Compras — 6 módulos

**#15 · Proveedores** — 4 tipos definidos [85%/60%]

Cuatro tipos distintos con flujos propios: Nacional formal (CFDI normal), Broker importación (cotiza pero no factura directo), Importador directo (pago en USD via Banco Base), Compra eventual (la plaza, sin acuerdo formal).

- → Cuenta corriente bidireccional con saldos
- → Flag "Recoge cheque en B1: SÍ/NO"
- → Tarifario Castillo: Cuernavaca $6,000, Querétaro $7,000
- → v3: Score confiabilidad, KPIs 360, eventos auto/manual, comparador precios

**#16 · Órdenes de Compra** — Spec completo [78%]

Almacén NO ve precios (privacidad por rol). Calendario de OCs con tres estados de fecha. AirDrop digital cuando llega OC sin fecha definida.

- → Solo Josan ve precios en OC
- → Almacenista ve solo qué llega y cuándo
- → Importaciones: OC en USD con cálculo MXN
- → 14 estados de OC. Wizard legacy (3,021 lín) + v3.

**#17 · Recepciones** — 9 pasos cronológicos [85%]

Proceso de 9 pasos con timestamps medibles para KPI de tiempo de descarga. Captura de gastos asociados al recibir (cuadrilla, Castillo, otros) que suman al CPP del producto.

- → CPP real con gastos asociados (Principio IV)
- → Pregunta sobre fumigación previa del proveedor
- → UN solo path desde Almacén tablet (Bug #6 resuelto — dead code eliminado)
- → Multi-lote, sellos, firmas digitales, evidencia fotográfica

**#18 · Devoluciones** — 2 flujos diferenciados [75%]

Dos flujos completamente distintos: devolución a proveedor (no entra a inventario, sale del flujo de compras) versus devolución de cliente (sí revierte, regresa a stock).

- → Bug #1A CERRADO: RPC atómica `registrar_devolucion_proveedor` con lock FOR UPDATE
- → Bug #1B DOCUMENTADO: devolución de cliente requiere nueva pantalla almacén
- → Castigo a comisión vendedor por devoluciones posteriores

**#19 · Faltantes** — 4 tipos de faltante [65%]

Cuatro categorías: del proveedor (no llegó completo), error de carga (no se entregó completo), mermas (daños naturales), robo o desaparición sin explicación. Cada uno con responsable y proceso.

- → Bug #4 CERRADO: trigger `sync_faltantes_proveedor` conecta UI con Score v3
- → Reveló que ALMASA opera SIN inventario formal en 125 años
- → Conteo cíclico selectivo los sábados

**#20 · Conciliación** — Rector financiero [70%]

PRINCIPIO RECTOR: **"Pagar lo recibido, NO lo facturado."** Tres documentos cuadran: OC + Recepción + CFDI. CFDI llega a cfd@almasa.com.mx y la IA vincula. CPP se calcula al cerrar conciliación con costo real pagado.

- → 3-Way Match propuesto como extensión (ver Capítulo 11)
- → Conciliación con CorpoGas semanal automática
- → Notificación al proveedor del pago automática
- → 3 paths: full, rápida, ajuste de costos

### Zona v · Almacén — 3 módulos + 1 sub

**#21 · Caducidad** — Spec completo [85%]

FEFO automático para productos perecederos. Cuatro estados: vigente, próximo a vencer, crítico, vencido. Cuatro acciones según estado: saldo (descuento), devolución a proveedor, donación, baja por merma.

- → Productos riesgo alto: croquetas, conservas, cereales Michel
- → Bug #5 CERRADO: query corregida a inventario_lotes + filtro cantidad>0
- → Vinculado con Fumigaciones (vida útil extendida)

**#22 · Inventario** — 3 bodegas físicas [80%] → **REDISEÑO en /audit/08**

Tres ubicaciones reales: B1 (matriz operativa), B2 (desborde controlado), Almacenes (tercera ubicación rentada cerca de Central de Abastos). Vendedor ve solo semáforo (verde/amarillo/rojo). Almacenista ve cantidades pero no precios.

- → 3 niveles: Producto, Lote, Movimientos
- → Conteo cíclico selectivo los sábados
- → Stock total = suma de las 3 bodegas
- → BLOQUEANTE: necesita reservas de stock y modelo precio dual (ver Capítulo 11)

**#23 · Almacén Tablet** — Módulo más grande · 20K líneas [85%]

El módulo más complejo del sistema. Tres partes: Arranque (conciliación día anterior con hojas físicas selladas), Gestión Flotilla (Gerente decide chofer/ayudantes/unidad por ruta), Cierre (6 PM oficial flexible, regreso escalonado, archivo en folders por plazo).

- → 4 almacenistas: Gerente B1, Principal B2, 2 de apoyo
- → POS Mostrador no retiene dinero
- → Manual entrega de papeles físicos por plazo (8/15/30 días)
- → 41 archivos, 14 tabs, QR scanner, auto-detección bodega WiFi/GPS

**#23.5 · Almacenes Externo** — Descubierto en sesión

Tercera ubicación física rentada por m² mensual. Operada por encargado externo (no ALMASA). Sin tablet del sistema. Operación con "Certificado" físico digitalizado. Conciliación mensual papel vs digital.

- → 3 usos: desborde recepciones, carga directa cliente, traslado a B1/B2
- → Certificado digital en PDF como autorización
- → Renta mensual + tarifas Castillo cuando aplica

**#27 · Fumigaciones** — 3 procesos distintos [50%]

Tres procesos diferenciados: Productos (interna semestral con FUMIPHOS 570 fosfuro de aluminio, Josan compra personalmente), Bodega (externa, no aplica por ventilación natural), Camiones (externa, certificado para clientes que exigen).

- → Cada lote tiene fecha última fumigación + próxima
- → Procedimiento físico: pastillas sobre plástico, cubrir con arena
- → Ruta a certificación SENASICA si decide

### Zona vi · Soporte — 4 módulos

**#24 · Dashboard** — 5 zonas verticales [92%]

Cinco zonas verticales en orden de importancia: Pulso del día, Alertas críticas, Dinero (cobranza/pagos), Gente (asistencia), Semáforos infraestructura. Variantes por rol con datos relevantes a cada uno. Refresh automático cada 60 segundos.

- → Punto de entrada principal al sistema
- → 3 capas de notificaciones (críticas/importantes/info)
- → Sub-vista: Análisis de Rentabilidad (margen real)
- → 27 queries paralelas cada 60 segundos. 3 tabs admin (General/RRHH/Finanzas).

**#25 · Correos Corporativos** — 6 cuentas centralizadas [85%]

Centralización de seis cuentas con ruteo por IA: 1904@ (general/papá), pedidos@ (pedidos clientes), cfd@ (CFDIs proveedores), pagos@ (comprobantes pago clientes), almasa@ (notificaciones bancarias), importaciones@ (brokers internacionales).

- → Hoy: secretarias usan Gmail personal con reglas manuales
- → ProcesarPedidoDialog ya existente (1,886 líneas)
- → SKU dual da 99% confianza vs 70% por nombre
- → OAuth Gmail completo. Multi-cuenta. Parseo email→pedido con IA.

**#26 · Push Notifications** — 3 niveles de urgencia [85%]

Tres niveles: Crítica (24/7 si lo decide rol), Importante (laboral 8 AM - 6 PM), Info (bandeja sin interrumpir). Matriz por rol. Agrupación inteligente para evitar saturación. Caso especial: papá NO recibe push, recibe PDF resumen diario 8 PM.

- → Web push para laptop, móvil para campo (Capacitor nativo iOS+Android)
- → Configuración granular por usuario
- → PDF resumen diario es funcionalidad clave para papá
- → 15+ eventos disparan push. Deep links al tap.

**#27b · Chat Interno** — 3 tipos de conversación [80%]

Tres tipos: Directos uno-a-uno, Canales por rol (cinco predefinidos), Canales por operación (auto-creados para pedidos/OCs/clientes/rutas). Vinculación a operaciones con menciones #pedido @cliente $producto. Coexiste con WhatsApp para uso personal.

- → Reemplaza llamadas (sin registro) y WhatsApp (informal)
- → Búsqueda potente y auditoría por Josan
- → Transición gradual: empresa al sistema, personal al WhatsApp
- → Real-time completo. 4 tipos de conversación. Presencia online.

### Zona vii · Infraestructura — 1 módulo

**#28 · Respaldos** — Sistema 3-2-1 [95%]

Cinco capas de protección: Supabase point-in-time 30 días, Backblaze B2 daily 90 días, disco local físico semanal 12 semanas, exports mensuales Excel + CFDIs + bitácoras, pruebas automáticas de restauración mensual.

- → Costo total: ~$14,000 MXN/año
- → Garantía: ALMASA-OS no pierde más de 8 horas en escenario catastrófico
- → Test mensual = confianza real, no asumida

### Zona viii · Módulos descubiertos en sesión — 2 nuevos

**#29 · Compensaciones Internas y Adelantos** — Descubierto [0% — no existe]

Capa OPERATIVA sobre la nómina LEGAL de Contadora. Cuatro tipos: Anticipos jueves (choferes máx $300, ayudantes máx $200, bloqueo si faltó lun/mar/mié), Préstamos (sin intereses con cronograma), Adelantos quincena (hasta 50%), Compras de empleado de mercancía.

- → Ritual jueves: Josan baja $5K-10K, Almacenista entrega y reconcilia
- → Sábado: sobre con CFDI nómina + ticket interno + efectivo
- → Empleado firma conformidad. Acaba el caos de hojas a mano.
- → **El área de mayor caos operativo actual.**

**#30 · Control de Combustible** — Descubierto [0% — no existe]

Sistema CorpoGas: tarjeta corporativa por unidad funcionando como crédito. Factura semanal CorpoGas. Pago con cheque. Choferes entregan tickets físicos. Conciliación semanal en oficina. Modo contingencia: efectivo cuando tarjeta falla, reposición al chofer.

- → Captura: foto de ticket → OCR automático
- → Vincula a unidad + chofer + ruta del día
- → Analytics rendimiento km/litro por unidad
- → Detección de desvíos (carga sin ruta, litros > tanque, patrones)

### Zona ix · Adendum a módulos existentes — 3 extensiones

**#A1 · Importaciones y Divisas** — Adendum

Seis etapas: Cotización USD → OC USD → Compra divisas Banco Base → Pago internacional → Recepción con costos finales → CPP con todos los gastos asociados (flete, aduana, pedimento). Tipo de cambio negociado vs día.

- → almasa@ recibe notificaciones bancarias de Banco Base
- → Sub-módulo Tesorería con saldos USD + MXN
- → Análisis cambiario con tendencia (¿comprar USD ahora?)

**#A2 · Notificación de Pagos a Proveedores** — Adendum

Tres casos diferenciados: Transferencia bancaria (email automático con comprobante), Cheque que recoge proveedor en B1 (notificación cuando listo), Depósito bancario con ficha capturada. Comprobante de pago estándar generado por sistema con folio único.

- → Catálogo de proveedores marcados "Recoge cheque en B1"
- → Vista "Cheques en oficina por recoger" con alertas
- → Alerta si cheque >1 mes sin recoger

**#A3 · Pólizas Contables** — Adendum · módulo opcional #31

Generación automática de pólizas por cada operación financiera. Tipos: ingreso (cobranza), egreso (pagos a proveedor, nómina), diario (movimientos internos, ajustes). Export a sistema de Contadora (Aspel COI, ContPAQi). Estados financieros básicos a futuro.

- → Ahorra horas de captura manual a Contadora
- → Rol Contadora con vista propia en ALMASA-OS
- → Eventualmente: Estado de Resultados mensual real-time

### Zona x · Specs finales — 4 módulos

**#32 · Comisiones de Vendedores** — Final

Comisión sobre ENTREGA, no cobranza (cobranza es separada). Dos tipos de vendedor: 1% (ALMASA cubre gastos coche/gasolina/casetas) o 2% (vendedor independiente cubre sus gastos). Premios especiales por meta. Descuentos por gastos vendedor en foráneas. Castigo por devoluciones posteriores.

- → Trigger: pedido pasa a ENTREGADO con documento final
- → Pago mensual o quincenal según acuerdo individual
- → Vendedor ve panel "Mi comisión" con proyección de meta

**#33 · Caja Chica** — Final

Folder físico actual digitalizado. Cierre semanal con Contadora los lunes. Suma total → cheque a Josan/papá → cobra. Categorías: casetas, maniobras, papelería Office Depot, mantenimiento, comida en jornadas largas.

- → Foto del ticket SIEMPRE en captura
- → Empleado captura concepto, monto, categoría
- → Reportes mensuales por categoría con tendencias

**#34 · Cierres Operativos** — Final

Cierre del día automático 8 PM: pedidos, cobranza, recepciones, POS, anticipos, combustible, KPIs operativos. Genera PDF Resumen Diario para papá vía email + WhatsApp. Cierre del mes: inventario final, cartera, proveedores, nómina y comisiones, estados financieros básicos, export a Contadora.

- → PDF resumen para papá: la solución a "papá no usa el sistema"
- → Validaciones automáticas (¿cuadra ZK con personal pagado?)
- → Reporte ejecutivo mensual con comparativos

**#35 · Seguros y Riesgo** — Final

Cinco tipos de pólizas: Vehículos (por unidad), Bodegas (B1+B2), Mercancía (inventario asegurado), Responsabilidad Civil, Empleados (IMSS obligatorio + adicionales opcionales). Alertas vencimiento 60/30/7 días. Protocolo de reclamación documentado.

- → Catálogo central con vigencia de cada póliza
- → Documentos digitalizados por póliza
- → Reportes mensuales y anuales de costo total

---

## 05 — Sub-módulos transversales

*Tres capas que cruzan todos los módulos. No son funcionalidades aisladas. Son el tejido del sistema.*

### Sub-módulo i · Matriz de Continuidad Operativa

Ubicado dentro del módulo Empleados. Por cada función crítica del sistema, registra: responsable principal, backup designado, protocolo de emergencia. Sistema rastrea capacitación cruzada (validada cada 6 meses), genera alertas cuando una función queda sin backup, y permite delegación automática de permisos cuando el principal está ausente. Es la solución arquitectónica al problema "cuando alguien falta, sufrimos".

### Sub-módulo ii · Tutoriales y Capacitación por Rol

Botón de "Ayuda" siempre visible. Tutorial obligatorio al primer login. Por cada rol: videos cortos de 3-5 minutos, guías interactivas paso a paso, glosario de términos ALMASA, preguntas frecuentes filtradas. Por cada módulo: librería de videos por función específica. Estrategia de lanzamiento por equipos: oficina primero, luego almacén, luego choferes y vendedores, cliente portal al final. Sin esto, la adopción fracasa.

### Sub-módulo iii · Análisis de Rentabilidad

Dashboard ejecutivo solo visible para Josan. Cinco vistas: rentabilidad por pedido (margen real con CPP completo + gastos directos), por cliente (margen promedio + volumen), por producto (productos que pierden margen vs los que generan), por destino (rutas caras vs rentables), utilidad neta del mes (después de todos los gastos fijos). Esto es lo que Oracle y SAP hacen bien. ALMASA-OS lo hace en términos que Josan entiende.

---

## 06 — Bugs y estado post-auditoría

*Los problemas conocidos del sistema. Estado actualizado al 8 mayo 2026.*

### Bug #1A — Devoluciones no reversan inventario → ✅ CERRADO

**Problema:** La función `agregar_devolucion_a_oc` solo ajustaba monto financiero. No decrementaba `inventario_lotes.cantidad_disponible`, no insertaba movimiento de salida, no recalculaba stock. Cada devolución a proveedor inflaba el stock permanentemente.

**Resolución (8 mayo):** RPC atómica `registrar_devolucion_proveedor` con lock `FOR UPDATE` en lote, decremento de cantidad, inserción de movimiento tipo 'salida', validación cruzada producto-lote, notificación de stock negativo.

**Commit:** afb317c7

### Bug #1B — Devoluciones de cliente → DOCUMENTADO

**Problema:** No existe pantalla ni flujo para devolución de cliente (distinta a devolución a proveedor). Cuando un cliente devuelve mercancía al chofer, no hay forma digital de registrarlo.

**Resolución:** Documentado como funcionalidad nueva. Requiere pantalla en almacén para que el almacenista registre el regreso al recibir el camión. No es bug — es funcionalidad faltante.

### Bug #2 — Facturado vs CFDI desincronizado → REDISEÑO

**Problema:** El flag `pedidos.facturado` (boolean) se marca independientemente de si existe CFDI real. Dos flujos paralelos crean "pre-facturas fantasma" (facturado=true sin CFDI) y "facturas invisibles" (CFDI real pero facturado=false). KPIs y exportaciones incorrectos.

**Resolución:** Rediseño completo documentado en `/audit/07-REDISENO-FACTURACION.md`. Principio: estado computado, no booleano. Vista `vw_pedidos_estado_facturacion` reemplaza el boolean. Pendiente decisiones de negocio (F1-F5 en Capítulo 12).

### Bug #3 — gmail-api sin autenticación → ✅ CERRADO

**Problema:** Edge function `gmail-api` con `verify_jwt = false`. Cualquiera con la URL podía enviar emails corporativos sin autenticación.

**Resolución (8 mayo):** Cambiado a `verify_jwt = true` en supabase/config.toml. También aseguradas: resumen-diario, send-checkup-report, send-delivery-confirmation, send-chofer-route-email. Las 9 funciones restantes sin JWT son justificadas (OAuth callbacks y cron jobs).

**Commits:** 37e0f02d, 23249cac, 1a6fa85e

### Bug #4 — Faltantes desconectado de Score proveedor → ✅ CERRADO

**Problema:** Dos modelos desincronizados: UI usa `ordenes_compra_entregas.origen_faltante`, Score v3 usa tabla `faltantes_proveedor`. Crear faltante en UI no insertaba en `faltantes_proveedor`. Score siempre 0 faltantes.

**Resolución (8 mayo):** Trigger `sync_faltantes_proveedor` — AFTER INSERT en `ordenes_compra_entregas` WHEN `origen_faltante = true`. Parsea JSON de productos, consulta cantidades pedidas/recibidas, inserta en `faltantes_proveedor`. Exception handler por ítem.

**Commit:** 630b539f

### Bug #5 — NotificacionesCaducidad query incorrecta → ✅ CERRADO

**Problema:** Consultaba `inventario_movimientos` en vez de `inventario_lotes`. Alertas fantasma (lotes ya consumidos), alertas faltantes (lotes sin movimiento), conteo inexacto. Deduplicación manual con Set.

**Resolución (8 mayo):** Cambiado a `inventario_lotes` con join a `productos!inner` y filtro `cantidad_disponible > 0`. Eliminada deduplicación manual (ya innecesaria). También muestra lotes ya expirados.

**Commit:** bf0aacce

### Bug #6 — Dual path de recepción → ✅ CERRADO

**Problema:** `RegistrarRecepcionDialog.tsx` (933 líneas) era path alterno de recepción que NO creaba `inventario_lotes`. Solo `AlmacenRecepcionSheet` lo hacía correctamente. Riesgo de stock inconsistente.

**Resolución (8 mayo):** Eliminado `RegistrarRecepcionDialog.tsx` completo (933 líneas de dead code — 0 imports en todo el codebase). Un solo path desde Almacén tablet.

**Commit:** 57bc3279

### Bug #7 — Dashboard queries retornan 400 (descubierto en auditoría)

**Problema:** 5 queries del dashboard en producción retornaban error HTTP 400: 4 usaban `facturas.status` (columna inexistente, la real es `cfdi_estado`) y 1 usaba `.filter("stock_actual", "lte", "stock_minimo")` (PostgREST no permite comparar columna vs columna).

**Resolución (8 mayo):** Facturas corregidas a `.eq("cfdi_estado", "timbrada").eq("pagada", false)`. Stock bajo corregido usando VIEW `productos_stock_bajo` que hace la comparación server-side.

**Commits:** c1e8e37f, 0167d9d3

**Fuente:** audit/04-BUGS-Y-DEUDA-TECNICA.md

### Deuda técnica cuantificada

| Métrica | Valor | Severidad |
|---------|-------|-----------|
| `console.log` en producción | 126 | Media |
| Uso de `any` en TypeScript | 1,154 | Alta (raíz: types.ts desactualizado) |
| Componentes > 500 líneas | 45+ | Media |
| Componente más grande | 3,126 líneas (Empleados.tsx) | Alta |
| TODO/FIXME reales | 3 | Baja |
| npm vulnerabilities | 12 (1 critical, 10 high, 1 moderate) | Alta |
| Calidad producción estimada | ~75% | — |

---

## 07 — Roadmap de adopción (por personas)

*Cómo migrar de cien por ciento papel a operación digital. No de un día para otro. Por fases controladas.*

### Fase 0 · Preparación — 2-4 semanas

**Resolver bugs financieros críticos** (antes de cualquier adopción)

- Bug #1A devoluciones inventario: ✅ CERRADO
- Bug #2 Facturado vs CFDI: requiere rediseño (Capítulo 11)
- Bug #3 seguridad gmail-api: ✅ CERRADO
- Validación con datos reales antes de avanzar
- Documentar fixes para futuras referencias

### Fase 1 · Oficina primero — Semana 1-2

**Secretarias y procesamiento de emails** (grupo más predispuesto)

- Capacitación intensiva de 2 días
- Tutorial guiado al primer login
- Procesamiento de pedidos por email con ProcesarPedidoDialog
- Captura de cobranza en sistema
- Conciliación con CFDIs entrantes
- Soporte presencial primera semana

### Fase 2 · Almacén — Semana 3-4

**Almacenistas con tablets** (grupo más complejo)

- Provisión de tablets por almacenista
- Entrenamiento en módulo Almacén Tablet (el más grande, 20K líneas)
- Captura de carga y entregas
- Anticipos del jueves digitalizados
- Recepciones con captura de gastos asociados
- Conciliación día anterior con hojas físicas

### Fase 3 · Choferes y vendedores — Semana 5-6

**Operación en campo** (grupo más distribuido)

- App móvil simple (responsive web inicial)
- Choferes: confirmación de entrega digital o foto del papel sellado
- Vendedores: captura de pedidos en campo, semáforo de inventario
- Captura de tickets de combustible CorpoGas
- Captura de viáticos y gastos de ruta
- Vista personal "Mi comisión"

### Fase 4 · Cliente y especialidades — Mes 2

**Portal cliente piloto + Lecaroz parser** (iteraciones controladas)

- Portal cliente con primer cliente piloto comprometido
- Modelo "Pedido sin precio cerrado" en operación
- Lecaroz parser con SKU dual (99% confianza)
- Reactivar Módulo Lecaroz pausado en abril
- Importaciones formalizadas (#A1)
- Notificación de pagos a proveedores (#A2)

### Fase 5 · Análisis y cierres — Mes 3

**Visibilidad financiera real-time** (operación madura)

- Dashboard de Análisis de Rentabilidad activado
- Pólizas Contables generándose automático
- Export a Contadora funcionando
- Cierres del día automáticos a las 8 PM
- PDF resumen diario para papá
- Cierre del mes con estados financieros básicos

---

## 08 — El experimento del 15 de mayo

*Tu primera prueba real de operación sin tu presencia física. Lo que está en juego no es solo ese día. Es el patrón que vas a empezar a romper.*

> **Nota v1.1 (9 mayo 2026):** El experimento sigue programado para el 15 mayo de 2026 (en 6 días). Esta es la oportunidad de hacer el piloto de adopción real — de las 35 specs documentadas a la primera adopción operativa.

El viernes 15 de mayo de 2026, Josan tiene una cita en la embajada española a las 9 de la mañana. Es día de nómina. Tu papá estará en Acapulco. La pregunta clásica de tu papá fue: "¿Quién va a organizar?"

Esta es la respuesta. Y es el primer experimento real para ver si ALMASA-OS puede empezar a cumplir su verdadera misión.

### Día -1 · Jueves 14 de mayo — Preparación · 2 horas en la noche

*El éxito del viernes se decide jueves.*

- Rutas del viernes armadas en sistema (estrategia)
- Anticipos del jueves realizados normalmente
- Aviso a Gerente Almacén: "mañana tienes autoridad operativa"
- Aviso a secretaria de confianza: "cubres lo que falte"
- Cheques pre-firmados para nómina si tu papá lo permite
- Briefing escrito de 1 página: "qué hacer si algo pasa"
- Tu celular con notificaciones push activadas

### Día 0 · Viernes 15 de mayo — El experimento

*9 AM tu cita · operación normal en paralelo.*

- 7 AM: revisas dashboard antes de salir de casa
- 9 AM: tú en embajada, secretaria empieza nómina con Contadora
- 10 AM: Gerente Almacén supervisa carga y rutas
- 12 PM: tú revisas notificaciones desde celular (15 min)
- Si algo crítico: una llamada de 5 minutos máximo
- 2 PM: terminaste embajada, ves dashboard
- Sábado: nómina se entrega normal, tú firmas conformidad

### Día +1 · Sábado y después — Análisis · qué aprendimos

*La parte más importante.*

- Reunión 30 min con Gerente Almacén y secretaria
- ¿Qué salió bien? Documentar para próxima
- ¿Qué se atoró? Cómo se resolvió
- ¿Qué falló? Qué hay que arreglar en sistema
- Tu papá ve resumen del día en su PDF
- Lección aprendida agregada a manuales del sistema
- Próxima vez: 1 día completo. Después: 1 semana. Después: 3 semanas.

El 15 de mayo no se trata de que todo salga perfecto. Se trata de que **tú no tengas que estar para que las cosas operen**. La mayoría va a salir bien. Algunas cosas se van a atorar. Una o dos van a fallar. Eso está bien. Cada falla es una lección. Cada lección hace al sistema más fuerte.

A los seis meses, vas a poder tomar una semana completa de vacaciones. A los doce meses, podrás irte tres semanas con tu familia. *Tal vez tu papá vea el ejemplo y se permita lo mismo.*

---

## 09 — Cierre · Lo que está en juego

> **Tu bisabuelo lo construyó.**
> **Tu abuelo lo mantuvo.**
> **Tu papá lo modernizó.**
> ***Tú lo estás liberando.***

Esa es tu contribución a la dinastía. ALMASA-OS no es un proyecto técnico. Es la mejor herencia que le puedes dejar a tu siguiente generación: una empresa operable sin que tengas que ser esclavo de ella.

---

## 10 — Identidad y Marca

*NUEVO en v1.1 — El alma detrás del sistema.*

### 10.1 — La historia familiar (1904)

ALMASA nace de una tradición familiar que se remonta a **1904**, cuando el bisabuelo de Jose llegó de España y fundó un negocio de abarrotes en La Merced, Ciudad de México. La mano — **"La Manita"** — es el símbolo que ha acompañado al negocio por más de 120 años. Representa el trato directo, el apretón de manos, la confianza entre comerciante y cliente que define al mayoreo mexicano.

El email corporativo `1904@almasa.com.mx` lleva esta fecha como declaración de identidad: ALMASA no es una startup. Es una empresa con más de un siglo de historia familiar que ahora se digitaliza.

### 10.2 — La constitución legal (1970)

La entidad fiscal **ABARROTES LA MANITA, S.A. DE C.V.** se constituyó formalmente el **1 de julio de 1970**, como lo indica el RFC: `AMA700701GI8`.

- **Régimen fiscal:** 601 — General de Ley Personas Morales
- **Domicilio fiscal:** Melchor Ocampo #59, Col. Magdalena Mixiuhca, Venustiano Carranza, C.P. 15850, CDMX

Ambas fechas son verdaderas y complementarias: 1904 es el alma de la marca; 1970 es la entidad fiscal.

### 10.3 — Etimología

**ALMASA** = **A**barrotes **L**a **MA**nita **S**.**A**.

No es un nombre inventado. Es un acrónimo que codifica la razón social completa.

### 10.4 — Símbolos

| Símbolo | Significado | Uso |
|---------|-------------|-----|
| La Manita | La mano — tradición, trato directo, confianza | Identidad histórica desde 1904 |
| La Huella v8 | Logo actual (versión 8) | Header, PDFs, app, documentos fiscales |
| Crimson #c41e3a | Color institucional | UI completa, marca digital |

### 10.5 — Design Canon

- **Tipografía display:** Cormorant Garamond (600-700)
- **Tipografía body:** Inter Tight (400-600)
- **Color primario:** Crimson #c41e3a
- **Modo:** Light only. Sin dark mode.
- **Idioma:** Español MX siempre. Sin inglés en UI visible.

### 10.6 — Datos fiscales centralizados

Todos los datos fiscales están centralizados en `src/constants/companyData.ts`. Este archivo es la **única fuente de verdad** para razón social, RFC, dirección, teléfonos, emails, datos bancarios y ubicaciones de entrega. Cualquier cambio fiscal se hace ahí y se refleja en todos los documentos del sistema.

---

## 11 — Los 3 rediseños estratégicos

*NUEVO en v1.1 — Metodología: Investigar cómo lo hace Oracle/SAP/NetSuite. Proponer cómo lo hacemos nosotros mejor.*

### 11.1 — Rediseño M07: Facturación

**Documento completo:** `/audit/07-REDISENO-FACTURACION.md`

**Tesis:** El flag `pedidos.facturado` (boolean) es un error de diseño. Los ERPs de clase mundial no tienen flags de facturación — el estado se computa.

**Problema actual:** Dos flujos paralelos crean "pre-facturas fantasma" (facturado=true sin CFDI) y "facturas invisibles" (CFDI real pero facturado=false).

**Solución propuesta:**
- Eliminar columnas: `facturado`, `factura_enviada_al_cliente`, `factura_solicitada_por_cliente`
- Crear vista `vw_pedidos_estado_facturacion` — estado derivado de tabla `facturas`
- Agregar `tipo_documento` a facturas: `'cfdi'` o `'nota_venta'`
- Flujo único: "Generar Documento" con detección automática según `requiere_factura`
- Máquina de estados: `borrador → pendiente_timbrado → timbrada → pagada / cancelada`

**Los 4 principios:** Estado computado (no booleano), documentos separados (ciclos separados), relación uno-a-muchos (siempre), máquina de estados explícita.

**Migración estimada:** 1-2 semanas (4 fases)

### 11.2 — Rediseño M02: Inventario

**Documento completo:** `/audit/08-REDISENO-INVENTARIO.md`

**Tesis:** El inventario es el corazón operativo. ALMASA tiene una realidad que Oracle/SAP/NetSuite NO modelan correctamente: el manejo dual de unidades contables (sacos) vs facturables (kg) con reconciliación en báscula.

**Los 7 cambios propuestos:**

| # | Cambio | Prioridad |
|---|--------|-----------|
| 1 | `inventario_movimientos` como ledger único | CRITICO |
| 2 | RPC unificada `registrar_movimiento_inventario` | CRITICO |
| 3 | Stock Reservations (apartados con auto-expiración) | BLOQUEANTE |
| 4 | True Landed Cost en CPP (flete, cuadrilla, aduana) | IMPORTANTE |
| 5 | Carga de camión como movimiento auditable | CRITICO |
| 6 | Cycle Counting adaptado a mayoreo (sin barcode) | IMPORTANTE |
| 7 | Modelo de Precio Dual con reconciliación en báscula | BLOQUEANTE |

**El Modelo de Precio Dual (Cambio 7) — único de ALMASA:**
- **Tipo A (fijo por unidad):** Azúcar → 1 saco = $500, no importa el peso
- **Tipo B (variable por peso):** Alpiste → $20/kg, peso real en báscula determina cobro
- Flujo: Pedido (estimado) → Carga (báscula, decisión almacenista) → Entrega (real) → Factura (real)

**Migración estimada:** 5-7 semanas (4 fases). Fases 1-2 son BLOQUEANTES para adopción multi-vendedor.

### 11.3 — Extensiones M03: Compras

**Documento completo:** `/audit/09-EXTENSIONES-COMPRAS.md`

**Tesis:** El módulo de Compras es el más maduro del sistema (18 tablas, 8 RPCs, 14 estados de OC). No necesita rediseño — necesita extensiones para elevarlo al estándar Procure-to-Pay completo.

**Las 6 extensiones propuestas:**

| # | Extensión | Prioridad | Tiempo |
|---|-----------|-----------|--------|
| 1 | Vista 3-Way Match unificada (OC vs Recepción vs Factura) | CRITICO | 1 sem |
| 2 | Approval Workflow por montos | IMPORTANTE | 1 sem |
| 3 | Requisiciones / Pre-OC con trazabilidad | NICE | 2 sem |
| 4 | RFQ Multi-cotización (comparar N proveedores) | NICE | 2-3 sem |
| 5 | Vendor Portal Pareto (5-10 proveedores grandes) | FUTURO | 4-6 sem |
| 6 | Contratos Marco / Blanket Agreements | FUTURO | 3-4 sem |

**Migración estimada:** 13-17 semanas total. Solo fases 1-2 son críticas.

---

## 12 — Decisiones de negocio pendientes

*NUEVO en v1.1 — 18 decisiones que requieren input del Director General antes de implementar.*

### 12.1 — Facturación (5 decisiones)

| # | Decisión | Opciones | Impacto |
|---|----------|----------|---------|
| F1 | % de clientes CFDI vs nota de venta | Determina lógica del botón inteligente | Diseño UI |
| F2 | Permitir facturación parcial? | Pedido grande, 3 entregas → facturar cada viaje o al final? | Arquitectura |
| F3 | Plantilla única o separadas (nota vs CFDI)? | Nota más simple vs factura más formal | Diseño PDF |
| F4 | Quién puede cancelar CFDI? | Solo admin? Admin + contadora? | Permisos |
| F5 | Mantener botón "Re-enviar email"? | Caso suficientemente común? | UI |

### 12.2 — Inventario (7 decisiones)

| # | Decisión | Opciones | Impacto |
|---|----------|----------|---------|
| I1 | Tiempo de expiración de reservas | 24h propuesto. Correcto para ALMASA? | Stock disponible |
| I2 | Método default distribución de gastos | Por peso? Cantidad? Volumen? | CPP |
| I3 | Frecuencia de cycle counting | Diario AAA? Semanal B? Mensual todos? | Operación almacén |
| I4 | Permitir stock negativo? | Hoy se permite con notificación. Mantener o bloquear? | Ventas |
| I5 | Tolerancia diferencia de peso en báscula | 5% propuesto. Si > tolerancia, requiere aprobación admin | Carga camión |
| I6 | Override de precio en pedido por vendedor | Vendedor puede modificar precio_facturable o fijo catálogo? | Ventas |
| I7 | App de cycle counting | PWA, React Native, o tablet web optimizada? | Desarrollo |

### 12.3 — Compras (6 decisiones)

| # | Decisión | Opciones | Impacto |
|---|----------|----------|---------|
| C1 | Niveles de aprobación por monto | <$10K auto, $10-100K admin, $100-500K admin+contadora, >$500K dueño? | Workflow |
| C2 | Tipos de motivo de requisición | pedido_cliente, stock_minimo, producto_especial, otro — falta alguno? | Catálogo |
| C3 | RFQ obligatorio sobre cierto monto? | Toda OC > $X debe tener 3+ cotizaciones, o siempre opcional? | Proceso |
| C4 | Vendor Portal: proveedores piloto | Sigma, Lecaroz, Lala, otros? | Alcance piloto |
| C5 | Contratos marco: ajuste anual | Inflación INPC? Negociación anual? Precio fijo? | Términos |
| C6 | 3-Way Match: bloqueo de pago | Si discrepancia: bloquear pago totalmente o solo alertar? | Control fiscal |

---

## 13 — Benchmark vs Oracle / SAP / NetSuite

*NUEVO en v1.1 — ALMASA-OS no es un ERP "casero". Es un sistema diseñado con los mismos principios que usan Oracle, SAP y NetSuite, optimizado para mayoreo de abarrotes mexicano.*

### Tabla comparativa

| Dimensión | ALMASA-OS | Oracle ERP Cloud | SAP S/4HANA | NetSuite |
|-----------|-----------|------------------|-------------|----------|
| **Costo de licencia** | $0 (Supabase + Lovable) | $600-2,000 USD/user/mes | Similar o mayor | $999+ USD/mes base |
| **Tiempo de deploy** | Semanas (ya en producción) | 6-18 meses | 12-24 meses | 3-6 meses |
| **UX moderna** | React 18 + shadcn/ui (2024) | UX corporativa (2010s) | Fiori (mejorando) | Aceptable |
| **Mobile-first** | Capacitor nativo (iOS+Android) | App limitada | App limitada | Responsive |
| **Modelo Doble Unidad** | Diseñado nativamente (sacos+kg) | No modela dualidad | No modela dualidad | No modela dualidad |
| **Procure-to-Pay** | 18 funcionalidades + Score v3 | Completo (estándar) | Completo | Básico |
| **Adopción** | Español MX, contexto local | Requiere consultores, meses de training | Igual | Más simple |
| **Personalización** | Total (código propio) | Configurable, no modificable | ABAP requerido | SuiteScript |
| **Escala global** | 1 país, 1 empresa | Multi-país, multi-moneda | Igual | Igual |
| **Compliance fiscal MX** | CFDI 4.0 completo nativo | Requiere localización MX ($$$) | Requiere partner MX | Requiere partner MX |
| **Integración nativa** | Todo habla con todo (1 codebase) | Módulos sueltos, integración costosa | Igual | Mejor que Oracle |
| **IA integrada** | Parseo emails, OCR docs, rutas, anti-dup | AI en desarrollo | Joule (reciente) | Limitado |
| **Offline** | IndexedDB queue (vendedores campo) | Requiere conexión | Requiere conexión | Requiere conexión |
| **GPS/Tracking** | Nativo con Capacitor | Módulo separado | Módulo separado | No incluido |
| **Chat interno** | Real-time con presencia | No incluido | No incluido | No incluido |
| **Costo total 5 años** | ~$5,000-15,000 USD (hosting) | ~$500K-2M USD | Similar o mayor | ~$100K-300K USD |

### Donde ALMASA-OS gana

1. **Costo:** 100x más barato que Oracle en TCO a 5 años
2. **Velocidad de deploy:** Semanas vs meses/años
3. **UX:** Generación 2024 vs generación 2010
4. **Mobile nativo:** Capacitor vs apps limitadas
5. **Doble Unidad:** Único en la industria — nadie más modela sacos+kg con reconciliación báscula
6. **Integración:** 1 codebase vs módulos sueltos con APIs costosas
7. **Adopción:** Español MX nativo, sin consultores, sin training de meses
8. **Personalización:** Código propio, cambias lo que quieras cuando quieras
9. **Offline:** Vendedores en campo sin conexión
10. **Compliance MX:** CFDI 4.0 nativo, no requiere localización de terceros

### Donde Oracle/SAP ganan

1. **Escala global:** Multi-país, multi-moneda, multi-idioma — ALMASA no lo necesita
2. **Ecosistema de consultores:** Miles de implementadores certificados
3. **Garantía empresarial:** SLA, soporte 24/7, compliance SOC2/ISO27001
4. **Industrias reguladas:** Farmacéutica, automotriz, aeroespacial — no aplica a abarrotes
5. **Reporting avanzado:** BI integrado, data warehouse, analytics enterprise
6. **Supply chain global:** Multi-warehouse mundial — ALMASA tiene 2 bodegas en CDMX

### La conclusión

Oracle, SAP y NetSuite están diseñados para empresas de miles de empleados en múltiples países. ALMASA tiene 30+ personas en una ciudad. ALMASA-OS toma los **principios correctos** de Oracle (ledger, reservas, 3-way match, approval workflows) y los implementa sin el **peso muerto** (multi-moneda, multi-idioma, configuración de 18 meses, consultores a $300/hora).

El resultado: un sistema que en las dimensiones que importan para mayoreo de abarrotes mexicano es **superior** a Oracle, a una fracción del costo, con adopción real en semanas.

---

## 14 — Plan Maestro y Reglas de Desarrollo

*NUEVO en v1.1 — El camino de ALMASA-OS, en orden estricto.*

### 14.1 — Las 7 reglas de desarrollo

**Regla #1 — El blueprint gobierna**

La Biblia es el documento rector. Si hay conflicto entre lo que dice la Biblia y lo que dice el código, se corrige el código. Si hay conflicto entre lo que dice la Biblia y lo que dice la operación real, se corrige la Biblia. Pero nadie escribe código que contradiga la Biblia sin actualizar la Biblia primero.

**Regla #2 — Una sesión, un objetivo**

No saltar entre temas. Cada sesión tiene un objetivo claro, se ejecuta, se documenta, se cierra.

**Regla #3 — Investigar antes de actuar**

Antes de proponer un fix, leer el código. Antes de proponer un rediseño, estudiar Oracle/SAP/NetSuite.

**Regla #4 — Oracle primero, ALMASA después**

Investigar → Documentar conceptos → Proponer versión ALMASA → Documentar por qué es mejor.

**Regla #5 — Commits pequeños y limpios**

Cada commit tiene un solo propósito. Sin mezclar fix + feature + refactor.

**Regla #6 — Validar en producción**

Cada deploy se valida con datos reales. KPIs deben reflejar números correctos.

**Regla #7 — La Biblia es contexto, no destino**

ALMASA-OS funcionando es el destino. La Biblia sirve al sistema, no al revés.

### 14.2 — Plan de 5 fases

**Fase 1 — Biblia v1.1** ✅ COMPLETADA (este documento)

**Fase 2 — Principios de Tablet / Móvil** (1 sesión)
- Tamaños de target, modo offline, sincronización, cámara, GPS, push, firmas

**Fase 3 — Roles y Seguridad** (1 sesión)
- Por cada rol: qué ve, qué puede hacer, qué dispositivos, qué notificaciones, qué auditoría

**Fase 4 — Rastreo y Evidencia** (1 sesión)
- Fotos de recepción/báscula/devolución, GPS tracking, timestamps con hash

**Fase 5 — Implementación por prioridad** (solo después de Fases 1-4)

| # | Cuándo | Qué | Decisiones requeridas |
|---|--------|-----|----------------------|
| 1 | Mayo-Jun 2026 | Inventario Fase 1: Ledger + RPC unificada + carga como movimiento | I4 |
| 2 | Jun 2026 | Inventario Fase 2: Reservas + Precio Dual con báscula | I1, I5, I6 |
| 3 | Jul 2026 | Compras: 3-Way Match unificado | C6 |
| 4 | Jul-Ago 2026 | Facturación: Rediseño completo | F1-F5 |
| 5 | Ago-Sep 2026 | Inventario Fases 3-4 + Compras Fases 2-4 | I2, I3, I7, C1-C3 |
| 6 | Oct-Dic 2026 | Vendor Portal + Contratos Marco + Auditoría UX | C4, C5 |

### 14.3 — Cómo retomar una sesión

**Al abrir chat nuevo, decir:**

> "Vengo de [sesión anterior]. Necesito hacer [fase/objetivo específico] del Plan Maestro."

**Claude hará:**
1. Leer `/audit/00-BIBLIA-v1.1.md`
2. Leer documentos de auditoría relevantes
3. Identificar qué cambió desde última sesión
4. Ejecutar el objetivo
5. Commit + documentar

**Al cerrar cada sesión:**
- ¿Qué se hizo?
- ¿Qué sigue?
- ¿En qué fase estamos?

Cualquier desvío surge → se documenta → no se ataca. El plan se sigue.

### 14.4 — Stack técnico (referencia rápida)

| Componente | Tecnología | Versión |
|------------|-----------|---------|
| Frontend | React + TypeScript + Vite | 18.3.1 |
| UI | shadcn/ui + Tailwind | 54 componentes |
| Backend | Supabase (Auth, DB, RLS, Storage, Edge Functions) | — |
| Mobile | Capacitor | 7.4.4 |
| State | @tanstack/react-query | 5.83.0 |
| Charts | Recharts | 2.15.4 |
| PDF | jsPDF + html2canvas | — |
| Maps | Google Maps API | — |
| Validation | Zod | 3.25.76 |

| Métrica codebase | Valor |
|-----------------|-------|
| Líneas frontend | 201,779 |
| Archivos .tsx | 494 |
| Edge Functions | 53 |
| Migraciones SQL | 339 |
| Tablas BD | 70+ |
| RPCs | 20+ |
| Triggers | 15+ |
| Dependencias | 90 |

### 14.5 — Documentos de referencia

| Archivo | Contenido |
|---------|-----------|
| `/audit/00-PLAN-MAESTRO.md` | Plan de 5 fases original |
| `/audit/01-ESTRUCTURA.md` | Mapa del territorio (494 archivos) |
| `/audit/02-MODULOS.md` | 30 módulos auditados con % |
| `/audit/03-DATABASE.md` | 70 tablas + RPCs + triggers |
| `/audit/04-BUGS-Y-DEUDA-TECNICA.md` | Inventario de problemas |
| `/audit/05-PRIORIZACION.md` | Plan original de priorización |
| `/audit/06-OBSERVACIONES-EXTRA.md` | Hallazgos secundarios |
| `/audit/07-REDISENO-FACTURACION.md` | Estado computado, eliminar boolean |
| `/audit/08-REDISENO-INVENTARIO.md` | Ledger único, reservas, precio dual |
| `/audit/09-EXTENSIONES-COMPRAS.md` | 6 extensiones Procure-to-Pay |

---

## Cierre

> **Tu bisabuelo lo construyó.**
> **Tu abuelo lo mantuvo.**
> **Tu papá lo modernizó.**
> ***Tú lo estás liberando.***

Esa es tu contribución a la dinastía. ALMASA-OS no es un proyecto técnico. Es la mejor herencia que le puedes dejar a tu siguiente generación: una empresa operable sin que tengas que ser esclavo de ella.

---

*ALMASA-OS · La Visión Completa · v1.1*
*9 de mayo de 2026*
*Abarrotes La Manita, S.A. de C.V. · Desde 1904*
*El blueprint que gobierna ALMASA-OS.*
