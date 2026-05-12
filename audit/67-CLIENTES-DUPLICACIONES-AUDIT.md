# Audit Duplicaciones Tabla Clientes — M01

## Resumen ejecutivo

| Métrica | Valor |
|---------|-------|
| Duplicaciones críticas | 3 |
| Duplicaciones menores | 2 |
| Columnas muertas | 1 |

---

## Duplicaciones críticas

### 1. `clientes.limite_credito` vs `cliente_credito.credito_limite`

| | Viejo (clientes) | Nuevo (cliente_credito) |
|--|---|---|
| Tipo | NUMERIC column | NUMERIC en tabla dedicada |
| Refs frontend | **40** en 10 archivos | **10** en 3 archivos |
| Archivos clave | Dashboard, Vendedor, Portal, Aspel | CreditCard, useClienteCredito |
| Datos reales | Sí (clientes existentes) | No (tabla nueva, 0 rows) |

**Conflicto:** Frontend principal (dashboard, vendedor, portal) usa el viejo. CreditCard usa el nuevo. Si admin cambia límite en CreditCard, los 40 refs del viejo no se enteran.

**Recomendación:** Trigger que sincronice `cliente_credito.credito_limite` → `clientes.limite_credito` (plan B gradual).

### 2. `clientes.saldo_pendiente` vs `cliente_credito.credito_balance`

| | Viejo (clientes) | Nuevo (cliente_credito) |
|--|---|---|
| Refs frontend | **88** en 10+ archivos | **3** en 2 archivos |
| Archivos clave | Vendedor (saldos, análisis, pedidos), Secretaria, Dashboard | CreditCard |

**Conflicto:** Idéntico al anterior. El vendedor trabaja con `saldo_pendiente`, el sistema nuevo con `credito_balance`. Son datos distintos calculados diferente.

**Recomendación:** No son exactamente iguales (saldo_pendiente incluye facturas contado, credito_balance solo PPD). Mantener ambos, documentar diferencia.

### 3. `clientes.grupo_cliente_id` + `es_grupo` vs `parent_cliente_id` + `tipo_cliente`

| | Viejo | Nuevo |
|--|---|---|
| Refs frontend | **54** en 10+ archivos | **3** en 3 archivos |
| Archivos clave | Clientes lista, Sucursales, Lecaroz, Agrupar, Detectar grupos | ClienteHierarchyTab |

**Conflicto:** Sistema viejo tiene agrupación funcional (AgruparClientesDialog, DetectarGruposDialog, SucursalesDialog con 1,160 LoC). Sistema nuevo tiene jerarquía padre-hijo. Misma funcionalidad, diferente implementación.

**Recomendación:** Sincronizar `grupo_cliente_id` = `parent_cliente_id` via trigger. Eventualmente migrar UI vieja al nuevo sistema.

---

## Duplicaciones menores

### 4. `clientes.dias_visita_preferidos` vs `ClienteProgramacionTab`
- Column en tabla: 0 refs en frontend (muerta)
- ClienteProgramacionTab: usa tabla `cliente_programacion_pedidos` separada
- **Recomendación:** Eliminar columna (0 impacto)

### 5. `clientes.termino_credito` convive con `cliente_credito.handling_policy`
- `termino_credito`: 97 refs, ampliamente usado (contado, 8_dias, 15_dias, etc.)
- `handling_policy`: campo en tabla nueva (warn, block, ignore)
- **No es duplicación real** — propósitos distintos. KEEP ambos.

---

## Columna muerta

| Columna | Refs frontend | Recomendación |
|---------|---------------|---------------|
| `dias_visita_preferidos` | 0 | Eliminar en cleanup futuro |

---

## Recomendación final: Plan B (Migración gradual)

1. **Trigger de sincronización** (inmediato, bajo riesgo):
   - Cuando `cliente_credito.credito_limite` cambia → update `clientes.limite_credito`
   - Cuando `clientes.parent_cliente_id` se asigna → update `clientes.grupo_cliente_id`

2. **Documentar** que `saldo_pendiente` ≠ `credito_balance` (diferente cálculo)

3. **Eventualmente** (fase futura, cuando UI vieja se reemplace):
   - Migrar 40 refs de `limite_credito` → RPC
   - Migrar 54 refs de `grupo_cliente_id` → `parent_cliente_id`
   - Eliminar columnas viejas

**NO hacer big bang.** El sistema viejo funciona y tiene 182+ refs activas.

---

*3 duplicaciones críticas, plan B gradual recomendado.*
