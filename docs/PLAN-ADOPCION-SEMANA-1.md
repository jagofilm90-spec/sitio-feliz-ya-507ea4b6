# PLAN DE ADOPCIÓN — SEMANA 1
**Fecha**: 27 abril 2026
**Autor**: Jose Antonio Gómez Ortega + Claude
**Propósito**: Migrar el primer proceso real de papel a ALMASA-OS

---

## 0. Resultado de la auditoría de código

Se auditaron los 3 dolores principales contra el código existente:

| Módulo | Readiness | Veredicto |
|--------|-----------|-----------|
| **Compras / OC** | 8.5/10 | Más completo. 41 componentes, wizard multi-paso, recepción con evidencia, conciliación de costos, RPCs atómicos, devoluciones, créditos proveedor, analytics. |
| **Inventario** | 6.5/10 | Funcional pero con riesgo de integridad: doble trigger (movimientos vs lotes) puede divergir stock. Sin transferencia inter-bodega real. Sin conteo físico masivo. |
| **Cobranza** | 6.5/10 | Flujo básico funciona (registro cobro → validación secretaria). Sin reporte de antigüedad, sin escalamiento automático, sin ruta `/cobranza` dedicada. Bug: VendedorCobranzaTab muestra pedidos pagados. |

### Recomendación: EMPEZAR POR COMPRAS

Razones:
1. Es el módulo más maduro (8.5/10) — menor riesgo de falla en adopción
2. Ataca directamente el dolor #2 de Jose: "pérdida de costos por no tener OC formales"
3. El flujo es secuencial y predecible: crear OC → autorizar → enviar → recibir → conciliar
4. Involucra pocos usuarios al inicio (Jose + 1 secretaria + 1 almacenista)
5. No requiere que TODO el equipo cambie de hábitos al mismo tiempo
6. El éxito visible (OC con folio, costos rastreados) genera confianza para migrar inventario y cobranza después

---

## 1. Día 1 (lunes) — Validación técnica

**Objetivo**: Confirmar que el flujo completo funciona sin errores en Supabase producción.

### Checklist técnico

- [ ] Verificar que tabla `ordenes_compra` acepta status: pendiente, autorizada, enviada, rechazada, parcial, recibida, completada, cerrada (posible CHECK constraint legacy que bloquee)
- [ ] Crear 1 proveedor de prueba con datos fiscales completos
- [ ] Crear 1 OC de prueba con 3 productos, entrega única
- [ ] Autorizar la OC (AutorizacionOCDialog)
- [ ] Simular recepción (RegistrarRecepcionDialog) — verificar que crea `inventario_lotes`
- [ ] Ajustar costos post-recepción (AjustarCostosOCDialog) — verificar que actualiza `costo_promedio_ponderado`
- [ ] Verificar que `productos.ultimo_costo_compra` se actualiza
- [ ] Verificar que `productos_historial_costos` registra el cambio
- [ ] Probar flujo de devolución parcial en la recepción
- [ ] Eliminar datos de prueba

### Bugs conocidos a investigar

1. **Status constraint**: La migración original tiene CHECK con valores limitados. Si no se eliminó, los INSERT fallarán al usar "autorizada" o "enviada". Prioridad: ALTA.
2. **`productos_revision_precio`**: Referenciada con `as any` en AjustarCostosOCDialog. Verificar que la tabla existe en producción.
3. **Edge function `notificar-cierre-oc`**: Verificar que está deployed y que `gmail-api` function existe.

### Entregable día 1
> "El flujo OC completo funciona de punta a punta en producción, o tengo lista de fixes exactos."

---

## 2. Día 2 (martes) — Plan de migración con Jose

**Objetivo**: Definir exactamente qué cambia en la operación diaria.

### Reunión con Jose (30-45 min)

Preguntas clave:

1. **¿Cuántos proveedores activos tiene ALMASA hoy?** (~20? ~50? ~100?)
   → Define el esfuerzo de carga inicial de catálogo de proveedores.

2. **¿Quién hace los pedidos a proveedores hoy?** (Jose? Secretaria? Ambos?)
   → Define quién será el primer usuario de CrearOrdenCompraWizard.

3. **¿Cuántas OC se generan por semana?** (~5? ~20? ~50?)
   → Define la carga operativa y si necesitamos batch o una por una.

4. **¿Quién autoriza compras?** (Solo Jose? Jose + papá?)
   → Mapear a roles en ALMASA-OS (admin → autorizar).

5. **¿Hay proveedores con entrega programada fija?** (ej. "Bimbo viene los martes")
   → Usar CalendarioEntregasTab desde día 1.

6. **¿Cuál es el proveedor más fácil para empezar?** (el más frecuente, con relación más sólida)
   → Ese será el piloto.

### Decisiones a tomar en la reunión

| Decisión | Opciones |
|----------|----------|
| ¿Quién captura la primera OC real? | Jose / Secretaria designada |
| ¿Se sigue mandando pedido por correo/teléfono EN PARALELO? | Sí (las primeras 2 semanas, doble captura) |
| ¿Se imprime la OC del sistema para el proveedor? | Sí / No (depende si proveedor acepta PDF por correo) |
| ¿Quién recibe mercancía en el sistema? | Jefe de bodega / Almacenista designado |
| ¿El almacenista tiene acceso a tablet/laptop? | Verificar dispositivo disponible |

### Entregable día 2
> "Documento de 1 página: quién hace qué, con qué dispositivo, para el proveedor piloto."

---

## 3. Día 3 (miércoles) — Primera OC real

**Objetivo**: Crear la primera Orden de Compra real en ALMASA-OS.

### Preparación (mañana, 1 hora)

1. Dar de alta al proveedor piloto en ALMASA-OS (datos fiscales, contactos, productos asociados)
2. Verificar que los productos que se le compran existen en el catálogo con precios de compra
3. Asignar credenciales al usuario que capturará (secretaria o Jose)
4. Hacer un walkthrough de 10 minutos del wizard con el usuario

### Ejecución (cuando toque pedir)

1. Capturar la OC real en el wizard
2. Jose autoriza desde su panel admin
3. Enviar al proveedor (correo automático del sistema O correo manual adjuntando el PDF)
4. Registrar la OC en papel también (doble captura, semana 1 solamente)

### Verificación

- [ ] La OC aparece en OrdenesCompraTab con status "autorizada" o "enviada"
- [ ] El PDF de la OC tiene los datos correctos (productos, cantidades, precios, dirección)
- [ ] El proveedor recibió/puede recibir la OC
- [ ] Jose puede ver la OC desde su celular

### Entregable día 3
> "Primera OC real vive en ALMASA-OS. El papel sigue como respaldo."

---

## 4. Día 4 (jueves) — Recepción real

**Objetivo**: Cuando llegue mercancía del proveedor piloto, registrar la recepción en ALMASA-OS.

### Flujo esperado

1. Llega el camión del proveedor
2. Almacenista descarga y cuenta como siempre
3. Jefe de bodega (o persona designada) abre AlmacenRecepcionSheet en tablet/laptop
4. Registra: cantidad recibida por producto, fecha de caducidad si aplica, fotos de evidencia
5. Si hay faltante → el sistema lo marca automáticamente
6. Firma digital de recepción

### Lo que NO cambia todavía
- El almacenista sigue contando físicamente igual que siempre
- Si hay duda, el papel manda (el sistema se ajusta al papel, no al revés)
- No se toman decisiones basadas en el sistema aún — solo se registra

### Verificación

- [ ] `inventario_lotes` tiene los registros de la recepción
- [ ] `productos.stock_actual` se actualizó
- [ ] `ordenes_compra_detalles.cantidad_recibida` refleja lo recibido
- [ ] Si hubo faltante, aparece en FaltantesPendientesTab

### Entregable día 4
> "Primera recepción real registrada. El inventario de esos productos ahora tiene dato real."

---

## 5. Día 5 (viernes) — Retrospectiva y costos

**Objetivo**: Cerrar el ciclo de la OC piloto y evaluar la semana.

### Mañana: Conciliar costos

1. Si llegó factura del proveedor → usar ConciliarFacturaDialog
2. Si no hay factura aún → usar AjustarCostosOCDialog con precio de la OC
3. Verificar que `costo_promedio_ponderado` se calculó correctamente
4. Revisar `productos_historial_costos` — el primer registro de costo documentado

### Tarde: Retrospectiva (15 min con Jose)

| Pregunta | Para qué |
|----------|----------|
| ¿El flujo fue más rápido, igual, o más lento que el papel? | Calibrar expectativas |
| ¿Qué paso fue el más incómodo? | Priorizar mejoras UX |
| ¿El almacenista pudo usar la tablet sin ayuda? | Evaluar capacitación necesaria |
| ¿Qué información nueva tenemos que antes no teníamos? | Demostrar valor |
| ¿Seguimos con este proveedor la semana 2, o sumamos otro? | Planear expansión |

### Métricas de éxito de la semana

| Métrica | Meta mínima |
|---------|-------------|
| OC reales creadas | ≥ 1 |
| Recepciones registradas | ≥ 1 |
| Costos documentados | ≥ 1 producto con costo real registrado |
| Usuarios que usaron el sistema | ≥ 2 (Jose + 1 más) |
| Errores bloqueantes encontrados | Documentados y con plan de fix |

### Entregable día 5
> "Primera OC con ciclo completo: creación → autorización → recepción → costo. Jose tiene datos que antes no existían."

---

## 6. Semana 2 — Preview

Si la semana 1 fue exitosa:

1. **Sumar 2-3 proveedores más** al flujo de OC digital
2. **Eliminar doble captura** para el proveedor piloto (el sistema es la fuente de verdad)
3. **Activar CalendarioEntregasTab** para visualizar entregas programadas
4. **Primeras sugerencias de reabastecimiento** (SugerenciasReabastecimientoTab) basadas en datos reales
5. **Evaluar si inventario está listo** para ser el segundo módulo en adopción

---

## 7. Qué NO hacer esta semana

| Tentación | Por qué no |
|-----------|-----------|
| Migrar inventario al mismo tiempo | Demasiado cambio simultáneo. Inventario tiene bugs de integridad (doble trigger). |
| Pedirle a todo el equipo que use el sistema | El cambio es gradual. Semana 1 = Jose + 1 persona máximo. |
| Desactivar el papel | NUNCA en semana 1. El papel es el respaldo hasta que el sistema demuestre confiabilidad. |
| Corregir bugs cosméticos | Solo fixes que bloqueen el flujo real. Lo estético puede esperar. |
| Agregar features nuevos | Cero código nuevo esta semana. Solo validar lo que ya existe. |

---

## 8. Risks y mitigación

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| CHECK constraint bloquea INSERT de OC | Alta | Verificar día 1. Fix: ALTER TABLE DROP CONSTRAINT. |
| Almacenista no tiene dispositivo | Media | Jose presta una tablet o laptop. |
| Proveedor no acepta OC por correo | Baja | Se imprime el PDF y se entrega en mano. |
| Edge function de email no está deployed | Media | Se envía el correo manualmente adjuntando el PDF. No es bloqueante. |
| El equipo lo ve como "más trabajo" | Alta | Mensaje: "Esta semana es doble trabajo. A partir de semana 3, el papel desaparece para este proveedor." |

---

*Este plan se evalúa el viernes. Si funciona, se escala. Si no, se ajusta antes de seguir.*
