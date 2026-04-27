# ESTADO REAL DE ALMASA
**Última actualización**: 27 abril 2026
**Fuente**: Conversación directa con Jose Antonio Gómez Ortega
**Propósito**: Documento permanente que cristaliza la situación real
de ALMASA. Cualquier asistente, colaborador, o el propio Jose puede
leer este documento y entender el negocio sin contexto previo.

---

## 1. Identidad y dirección

- **Empresa**: Abarrotes La Manita SA de CV (ALMASA)
- **Fundación**: 1904 en La Merced, CDMX
- **Tipo**: Distribuidor mayorista de abarrotes
- **Ubicación actual**: Magdalena Mixhuca, CDMX
- **Director General**: Jose Antonio Gómez Ortega ("Josan")
- **Toma de decisiones**: Josan + su papá (operador actual)
- **120+ años de operación familiar continua**

---

## 2. Equipo operativo

| Rol | Cantidad | Notas |
|-----|----------|-------|
| Administración | 1 (Jose) | Director General |
| Co-administración | 1 (papá de Jose) | Operador, decisiones diarias junto a Jose |
| Contadora interna | 1 | |
| Secretarias | 4 | Rotativas, oficina |
| Jefe de Bodega 1 | 1 | Almacenista + jefe |
| Jefe de Bodega 2 | 1 | Almacenista + jefe + coordinador de choferes |
| Almacenistas adicionales | 2 | Apoyan ambas bodegas |
| Vendedores | 4 | Carlos, Salvador, Martín (remoto), Venancio (chofer+vendedor) |
| Choferes | 5+ | |
| Ayudantes de chofer | 5+ | **ROL nuevo, no existe aún en ALMASA-OS** |
| Mostrador | rotativo | Cubierto por almacenistas + secretaria asignada |

**Total: ~24-26 personas operativas**

---

## 3. Infraestructura física

### Bodegas
- **Bodega 1**: matriz/oficinas — operación principal
- **Bodega 2**: almacenamiento adicional

Ambas bodegas las usan los 4 almacenistas para cargar mercancía
(no son propiedad exclusiva del jefe de cada una).

### Flota
- ~14+ vehículos de reparto
- **NO están asignados** a bodega específica
- Rotan diariamente según peso de la ruta del día
- Asignación de vehículo a chofer es decisión matutina

### Cobertura geográfica
- CDMX (zona principal)
- Estado de México metropolitano
- Toluca
- Puebla
- Querétaro
- Morelos

---

## 4. Vendedores y cartera

Cada vendedor tiene **mezcla de zona base + clientes asignados**
(ni 100% por geografía, ni 100% por cartera).

- **Carlos**: vendedor de campo
- **Salvador**: vendedor de campo (1% comisión mensual sobre ventas)
- **Martín**: vendedor remoto
- **Venancio**: chofer + vendedor (1% comisión)

---

## 5. CÓMO OPERA ALMASA HOY (papel + Aspel)

### Captura de pedidos — 3 fuentes

1. **Vendedores en campo**
   - Visitan clientes de día
   - Apuntan en hoja blanca con pluma (nombre, dirección, productos, precios)
   - Al día siguiente entregan la hoja a la secretaria
   - Secretaria pasa el pedido a una nota de venta hecha A MANO

2. **Correo `pedidos@almasa.com.mx`** (mayoría de pedidos)
   - Cliente manda pedido en cuerpo del correo, archivo OC, o PDF
   - Secretaria lo captura

3. **Llamada telefónica**
   - Cliente llama, secretaria apunta a mano

### Decisión de rutas (manual, matutina)

Cada mañana Jose + papá deciden qué pedidos salen:
- Según pedidos acumulados
- Según choferes y ayudantes que llegaron a trabajar
- Según vehículos disponibles
- Asignan peso de ruta → vehículo → chofer → ayudante

### Carga y entrega
- Almacenista carga el vehículo
- Chofer + ayudante salen a entregar
- Cliente recibe (firma de recepción)
- **Chofer NO cobra nada**

### Cobro a la entrega
- Cliente NO paga al chofer
- Cliente transfiere, hace depósito, o manda cheque
- El cobro entra por canales separados, no en la entrega

### Día siguiente — cierre
- Choferes regresan con notas firmadas
- Almacén empalma con sus copias
- Secretaria revisa contra control en oficina
- Devoluciones / faltantes → nota de crédito o ajuste
- Pedidos cerrados se archivan en CARPETAS por plazo (8 / 15 / 30+ días)

### Folio físico
- Foliador manual numera los pedidos del día (1, 2, 3...)
- 20 pedidos = 20 folios
- Folios físicos DEBEN coincidir con hojas de control en oficina
- Auditoría diaria

### Facturación (Aspel)
- 100% de CFDIs salen de Aspel
- 60%+ clientes piden factura
- Decisión "factura o remisión" se toma POR PEDIDO (no fija de cliente)

### Compras a proveedores
- **NO hay OC formales**
- Se ordena por correo o llamada
- Cuando llega la mercancía, se recibe sin documento que valide
- **Pérdida documentada de costos** porque no hay match precio comprado vs precio facturado

### Inventario
- **No hay control formal**
- No hay sistema que sepa cuánto stock hay en bodega
- Decisiones de qué reordenar son por intuición / inspección visual

### Cobranza de créditos (8 / 15 / 30 días)
- **Sin sistema**
- Cuaderno, Excel, hojas

---

## 6. Sistemas en uso hoy

| Sistema | Uso | Status |
|---------|-----|--------|
| **Papel** | Capturas, notas de venta, hojas de pedido, control de folios | 100% activo |
| **Aspel** | Emisión de CFDI (todas las facturas) | 100% activo |
| **WhatsApp** | Comunicación con clientes | 100% activo |
| **Correo `pedidos@`** | Recepción de pedidos | 100% activo |
| **Excel / cuadernos** | Cobranza, inventarios mentales | 100% activo |
| **ALMASA-OS** | Sistema construido para reemplazar todo lo anterior | 0% en uso |

---

## 7. ALMASA-OS — el sistema en construcción

ALMASA-OS es el ERP interno construido por Jose para llevar a ALMASA
del papel a digital. Está **listo para entrar a operación**, pero
**ningún proceso real lo usa aún**.

### Stack técnico
- React 18 + TypeScript + Vite
- Supabase (Auth, DB, RLS, Storage, Edge Functions, RPCs)
- shadcn/ui + Tailwind
- Cormorant Garamond (display) + Inter Tight (body)
- Light mode, español MX

### Tamaño actual
- 49 páginas
- 399 componentes en 28 dominios
- 29 hooks
- 53 Edge Functions
- 371 migraciones SQL
- 5 paneles de rol implementados

### Roles modelados en el sistema
- Admin (todo / cualquier dispositivo)
- Secretaria (laptop, oficina exclusivamente)
- Contadora (laptop, oficina — misma regla que secretaria)
- Vendedor (todo / cualquier lugar)
- Almacén (iPad + laptop, oficina + fuera)
- Chofer (celular + tablet)
- Cliente portal (todo, **aún no se usa**)
- **Ayudante de chofer**: ROL FALTANTE en el sistema

---

## 8. Decisiones de producto vigentes

Estas decisiones ya están tomadas y NO se reabren sin justificación:

1. **Light mode only** — sin dark mode
2. **Español MX only** — sin i18n
3. **Aspel reemplaza Facturama** — Facturama queda como código legacy en repo, sin uso
4. **Responsive solo en paneles móviles** — secretaria/contadora son desktop only
5. **Diseño Editorial canonical v1.0** — `docs/DESIGN-CANON-ALMASA.md`
6. **Choferes no cobran** — solo entregan
7. **Folio atómico PED-YYYYMMDD-NNN** — debe coincidir con folio físico
8. **Plazo de pago es POR PEDIDO**, no atributo fijo del cliente
9. **Pedidos NUNCA se bloquean por precio** — el dueño supervisa después

---

## 9. El verdadero proyecto

**ALMASA-OS no es un proyecto de software. Es un proyecto de
transformación digital.**

- ALMASA opera en papel desde hace décadas
- ALMASA-OS está construido y listo
- El reto = ADOPCIÓN, no construcción
- Cada módulo migrado del papel a ALMASA-OS = una victoria del proyecto

Mayor dolor identificado por Jose (27 abril 2026):
1. **Inventario**: no saber qué hay en bodega
2. **OC sin formalizar**: pérdida de costos
3. **Cobranza sin sistema**: créditos en cuaderno

El plan de adopción ataca uno por uno, en el orden que tenga más
probabilidad de éxito real.

---

## 10. Cambios en este documento

Este documento se actualiza cuando:
- Cambia la estructura del equipo
- Cambia un proceso operativo
- Se cierra una migración (papel → ALMASA-OS)
- Se descubre algo nuevo en conversación con Jose

NO se cambia para:
- Decisiones técnicas de implementación (esas viven en el Blueprint)
- Estilos visuales (esos viven en DESIGN-CANON)
