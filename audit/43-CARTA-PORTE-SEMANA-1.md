# Carta Porte 3.1 — SEMANA 1 Foundation

**Fecha:** 10 de Mayo 2026  
**Gap:** V (audit/37, audit/40 prioridad #1)  
**Estado:** Foundation completada — modo BORRADOR  
**Próximo:** SEMANA 2 (validación real), SEMANA 3 (timbrado PAC)

---

## Qué se construyó

### Migración SQL (344ª migración)

**9 tablas creadas:**

| Tabla | Propósito | Columnas clave |
|-------|-----------|----------------|
| `sat_catalogos` | Catálogos SAT auto-actualizables | catalogo, clave, descripcion |
| `permisos_sict` | Permisos SICT por vehículo | vehiculo_id, tipo_permiso, numero_permiso |
| `cartas_porte` | Documento principal CP 3.1 | folio, ruta_id, vehiculo_id, chofer_id, estado, uuid_sat |
| `cp_ubicaciones` | Origen + destinos | tipo, rfc, codigo_postal, fecha_hora_estimada |
| `cp_mercancias` | Mercancías transportadas | bienes_transp, cantidad, peso_en_kg, material_peligroso |
| `cp_autotransporte` | Datos vehículo SAT | perm_sct, config_vehicular, placa_vm, seguros |
| `cp_remolques` | Remolques (si aplica) | subtipo_rem, placa |
| `cp_figura_transporte` | Operador/chofer | tipo_figura, rfc, licencia |
| `cp_eventos` | Auditoría LA CORONA | tipo_evento, usuario_id, detalle |

**RLS policies:** 9 tablas con RLS habilitado. Admin+secretaria full access. Lectura autenticada.

**Triggers:**
- `trg_carta_porte_folio` — auto-genera folio CP-YYYYMM-NNNN con advisory lock atómico
- `trg_cartas_porte_updated_at` — timestamp automático

**Seed data:** 12 registros iniciales catálogos SAT (TipoPermiso, FiguraTransporte, ConfigAutotransporte).

### Frontend

| Archivo | Propósito |
|---------|-----------|
| `src/pages/CartasPorte.tsx` | Lista con filtros, botón crear |
| `src/pages/CartaPorteDetalle.tsx` | Vista detalle con cards: autotransporte, operador, ubicaciones, mercancías |
| `src/hooks/useCartasPorte.ts` | 5 hooks: list, detail, create, update, catálogos SAT |

### Routing y permisos

- Rutas `/cartas-porte` y `/cartas-porte/:id` protegidas (admin + secretaria)
- Sidebar: "Cartas Porte" bajo sección Logística
- `MODULE_PERMISSIONS` actualizado

---

## Lo que NO está (viene SEMANA 2-3)

| Feature | Semana |
|---------|--------|
| Wizard 4 pasos (mercancías, ubicaciones, vehículo, operador) | 2 |
| Validación contra catálogos SAT | 2 |
| Edge function carta-porte-validar | 2 |
| Edge function carta-porte-generar-pdf (borrador) | 2 |
| Edge function sat-catalogos-sync (cron) | 2 |
| Timbrado real con PAC (Facturama/SenHub) | 3 |
| Auto-llenar desde ruta existente | 2-3 |
| Cancelación CFDI Carta Porte | 3 |

---

## Archivos creados/modificados

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/20260510044349_carta_porte_foundation.sql` | CREADO — 9 tablas + RLS + triggers + seed |
| `src/hooks/useCartasPorte.ts` | CREADO — 5 hooks React Query |
| `src/pages/CartasPorte.tsx` | CREADO — lista cartas porte |
| `src/pages/CartaPorteDetalle.tsx` | CREADO — detalle con cards |
| `src/App.tsx` | MODIFICADO — 2 rutas nuevas |
| `src/components/Layout.tsx` | MODIFICADO — sidebar "Cartas Porte" |
| `src/hooks/useUserRoles.ts` | MODIFICADO — permiso /cartas-porte |

---

*Carta Porte 3.1 — SEMANA 1 Foundation*  
*Primer gap del blueprint en construcción real*
