# CIERRE DÍA 2 — Plan Adopción ALMASA-OS
**Fecha**: 29 abril 2026
**Estado**: Cerrado con éxito
**Tema central**: Form Alta de Producto v4 + Piloto

---

## 1. LO QUE SE LOGRÓ HOY

### Sandbox limpia para piloto
- Hard delete de 274 productos contaminados, 13 proveedores, pedidos viejos, OCs antiguas
- Conservación de 93 clientes reales (verificados por Jose)
- Estado limpio para empezar pruebas piloto reales

### Form Alta de Producto v4 — rediseño completo
- 17 campos visibles (vs 26 anteriores) — reducción 35%
- Required actualizados de 3 a 7: Nombre, Categoría, Código interno, Código SAT, Unidad, Peso, Precio
- Banner educativo al inicio del form
- Vista previa de producto con marca, código, unidad
- Análisis financiero condicional (por bulto vs por kilo)
- Detección anti-duplicados Levenshtein
- Auto-código por categoría (AZU/SEM/CRO/etc)
- Eliminados del form: proveedor_preferido, solo_uso_interno, bloqueado_venta, puede_tener_promocion

### Insight maestro confirmado en piloto
"Tal cual como demos de alta 1 producto es como va a salir tal cual en lista de precios, OC, pedidos almacén y pedidos en general."

### Regla de oro ALMASA validada
"Siempre BULTOS. El kilo solo afecta cómo se calcula el precio, no cómo se cuenta el producto."
- Vendedor pide bultos, almacén carga bultos, cliente recibe bultos
- Switch precio_por_kilo NO cambia unidad operativa

### 7 Productos piloto capturados (todas las variantes operativas)
- AVE-001 ALPISTE 25 KG APROX (por kilo, sin IVA, fumigación)
- AZU-001 AZUCAR ESTANDAR 50 KG (bulto, IVA)
- AZU-002 AZUCAR REFINADA 50 KG (con marca Ingenio Potrero)
- BOT-001 CACAHUATE ENCHILADO ARESLA 40 KG (IVA + IEPS)
- CRO-001 PEDIGREE ADULTO 25 KG (con marca Pedigree)
- CRO-002 GANADOR 20KG MAS 3KG GRATIS (es_promocion + Malta)
- SEM-001 FRIJOL NEGRO BOLA 25 KG APROX (por kilo, sin IVA, fumigación periódica)

### 5 Bugs detectados en piloto y resueltos
1. Columna "Tipo" mostraba "/unidad" → ahora muestra unidad real
2. Fumigación pedía fecha al alta → ahora pide Frecuencia (meses)
3. Análisis financiero solo Margen → ahora muestra Markup + Margen
4. Filtro Marca verificado funcional
5. Lista de Precios verificada (ya agrupaba por categoría)

### 4 Ajustes finos aplicados al form
- Botón "Crear y nuevo" para captura rápida de varios productos
- Link clickeable a sat.gob.mx en helper Código SAT
- Label dinámico "Peso aproximado (kg)" cuando precio por kilo ON
- IEPS con selector de % fiscales reales (8/25/30/50/53/160%)
- Columna BD agregada: tasa_ieps NUMERIC(5,2) DEFAULT 8.00

### 2 Ajustes diferidos con justificación
- Vista previa sticky en columna derecha (dialog single-column actual; preview inline suficiente)
- Tabla productos agrupada por categoría (Lista de Precios ya agrupa, tabla plana funciona)

---

## 2. DECISIONES DE NEGOCIO CONFIRMADAS

| # | Decisión | Justificación |
|---|----------|---------------|
| 1 | Cada presentación física distinta = código distinto | Sin variantes |
| 2 | Promociones = código distinto + flag es_promocion | Histórico real |
| 3 | Productos por kilo y por bulto coexisten | Realidad operativa |
| 4 | UN solo precio = precio FINAL con IVA dentro | Sistema desglosa al facturar |
| 5 | Código SAT REQUIRED al alta | Todos productos lo necesitan |
| 6 | UN solo campo "Nombre completo" | Como Excel |
| 7 | Peso (kg) REQUIRED siempre | Cálculos de carga |
| 8 | Análisis financiero condicional | Por bulto vs por kilo |
| 9 | Permisos alta: Admin + Secretaria | Operación normal |
| 10 | Descuento máximo: Admin + Secretaria | Con audit log |
| 11 | Markup + Margen ambos visibles | Transición Excel→ERP |
| 12 | Selector de IEPS fiscal | 6 tasas reales |
| 13 | "Crear y nuevo" para captura rápida | Migración catálogo |

---

## 3. PENDIENTES PARA DÍA 3

### Prioridad 1 — Continuar piloto compras
- Crear 1 proveedor de prueba inventado
- Hacer primera OC piloto end-to-end
- Validar que llega correo al proveedor
- Validar recepción desde panel Almacén

### Prioridad 2 — Audit log
- Implementar histórico de cambios por usuario en productos
- Para resolver "yo no fui" en cambios de precio/descuento

### Prioridad 3 — Tablet rutas (futuro)
- Peso total por ruta vs capacidad camión
- Recordatorios de fumigación periódica
- Solo cuando arranque módulo Almacén

### Prioridad 4 — Ajustes diferidos del form
- Vista previa sticky en columna derecha
- Toggle "Vista plana / Por categoría" en tabla productos
- Bloqueo IP secretaria/contadora

---

## 4. SQL EJECUTADOS HOY

```sql
-- Limpieza sandbox
DELETE FROM pedidos_detalles;
DELETE FROM pedidos;
DELETE FROM ordenes_compra_detalles;
DELETE FROM ordenes_compra;
DELETE FROM proveedor_productos;
DELETE FROM proveedor_contactos;
DELETE FROM inventario_lotes;
DELETE FROM proveedores;
DELETE FROM productos;

-- IEPS variable
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tasa_ieps NUMERIC(5,2) DEFAULT 8.00;
```

---

## 5. ESTADO ACTUAL DE LA BD

| Tabla | Registros |
|-------|-----------|
| productos | 7 (piloto) |
| proveedores | 0 |
| pedidos | 0 |
| ordenes_compra | 0 |
| inventario_lotes | 0 |
| clientes | 93 (reales) |

---

## 6. LECCIONES APRENDIDAS DÍA 2

1. **Insight ORO confirmado**: el form de productos es la fuente de verdad de TODO el sistema. Si está mal una vez, está mal en seis lados.
2. **Sandbox limpio + 7 productos representativos** validan TODO el modelo. No se necesitan 274 productos para arrancar pruebas.
3. **Iterar sobre data real > iterar sobre teoría**. Los 5 bugs detectados solo se vieron al capturar productos reales, no en los 3 mockups previos.
4. **Decisiones tomadas con cabeza descansada > forzar con cansancio** (lección Día 1 aplicada con éxito Día 2).
5. **El form v4 refleja la realidad operativa de ALMASA**: bultos como unidad universal, IVA en precio final, descuento máximo como piso de utilidad, fumigación periódica, promociones como códigos distintos.

---

*Documento de cierre Día 2. Día 3 arranca con primera OC piloto.*
