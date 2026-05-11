# Carta Porte 3.1 — SEMANA 4 Refinamiento + Cancelación + Catálogos

**Fecha:** 11 de Mayo 2026  
**Gap:** V (cierre audit/43, 45, 46)  
**Estado:** GAP V 100% TÉCNICAMENTE COMPLETO  
**Próximo:** Gap siguiente del blueprint (audit/40)

---

## Qué se construyó

### Edge Functions (3 nuevas)

| Function | Propósito |
|----------|-----------|
| `carta-porte-cancelar` | Cancela CFDI timbrado con 4 motivos SAT, valida motivo 01 requiere UUID sustituto |
| `sat-catalogos-sync` | Reporta estado catálogos (futuro: sync automático desde SAT) |
| `carta-porte-pdf-borrador` | Genera HTML preview borrador (sin sello SAT) para revisión interna |

### Migration Catálogos SAT Ampliados

**Archivo:** `supabase/migrations/20260511000000_sat_catalogos_seed_ampliado.sql`

| Catálogo | Registros | Contenido |
|----------|-----------|-----------|
| `c_Estado` | 32 | 32 estados de México |
| `c_ClaveUnidad` | 20 | Unidades comunes mayoreo abarrotes |
| `c_ClaveProdServ` | 23 | Productos/servicios top abarrotes |
| `c_FiguraTransporte` | 4 | Completo |
| `c_MotivoCancelacion` | 4 | 4 motivos SAT para cancelación |

Total: ~83 registros nuevos, idempotentes (ON CONFLICT DO NOTHING).

### Componentes UI (2 nuevos)

| Componente | Propósito |
|------------|-----------|
| `CancelarDialog.tsx` | Modal: selecciona motivo SAT, UUID sustituto si motivo 01, escribe "CANCELAR" para confirmar |
| `AuditoriaTab.tsx` | Timeline vertical de eventos cp_eventos con iconos por tipo |

### CartaPorteDetalle ampliado

- 3 tabs: Wizard / Resumen / **Auditoría** (nuevo)
- Banner cancelado (rojo) con UUID cancelación + motivo + fecha
- Botón "Cancelar CFDI" en banner timbrado (abre CancelarDialog)
- Botón "Preview PDF Borrador" para estados borrador/validado
- PDF se abre en nueva ventana como HTML printable

### Hooks nuevos (3)

| Hook | Propósito |
|------|-----------|
| `useCancelarCartaPorte` | Invoca edge function cancelar con 4 motivos |
| `useDescargarBorradorPDF` | Invoca edge function PDF borrador |
| `useCartaPorteEventos` | Fetch cp_eventos para timeline auditoría |

---

## Estado final Carta Porte 3.1

### Ciclo de vida completo

```
BORRADOR → [wizard 4 pasos] → VALIDADO → [PAC timbrar] → TIMBRADO → [cancelar] → CANCELADO
```

### Resumen 4 semanas

| Semana | Qué | Commits |
|--------|-----|---------|
| 1 | 9 tablas + foundation + UI skeleton | d088a04a |
| 2 | Wizard 4 pasos + validación 12 reglas | e8bb3f82 |
| 3 | PAC Adapter Layer + Facturama + timbrado | 25ff41f7 |
| 4 | Cancelación + PDF borrador + auditoría + catálogos | este commit |

### Archivos totales Carta Porte

| Tipo | Archivos | Líneas aprox |
|------|----------|-------------|
| Migrations | 3 | ~400 |
| Edge Functions | 5 | ~600 |
| Shared modules | 4 | ~350 |
| React components | 7 | ~900 |
| Hooks | 2 | ~600 |
| **Total** | **21 archivos** | **~2,850 líneas** |

---

## ⚠️ MIGRATION PENDIENTE

**Josan debe aplicar manualmente en Lovable SQL Editor:**

```
supabase/migrations/20260511000000_sat_catalogos_seed_ampliado.sql
```

Solo INSERTs idempotentes. No DDL. Seguro ejecutar múltiples veces.

---

## Configuración pendiente (no es código)

Para timbrar en producción, ALMASA necesita:
1. Cuenta Facturama producción (o PAC elegido)
2. CSD vigente (.cer + .key + contraseña) expedido por SAT
3. En Configuración → PAC: cambiar modo a "produccion"
4. Ingresar credenciales reales

---

## Archivos creados/modificados

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/20260511000000_sat_catalogos_seed_ampliado.sql` | CREADO — 83 registros catálogos |
| `supabase/functions/carta-porte-cancelar/index.ts` | CREADO — cancelación 4 motivos |
| `supabase/functions/sat-catalogos-sync/index.ts` | CREADO — sync catálogos |
| `supabase/functions/carta-porte-pdf-borrador/index.ts` | CREADO — PDF preview |
| `src/components/carta-porte/CancelarDialog.tsx` | CREADO — modal confirmación |
| `src/components/carta-porte/AuditoriaTab.tsx` | CREADO — timeline LA CORONA |
| `src/pages/CartaPorteDetalle.tsx` | MODIFICADO — 3 tabs + banners + botones |
| `src/hooks/useCartasPorte.ts` | MODIFICADO — 3 hooks nuevos |

---

*Carta Porte 3.1 — Gap V del Blueprint: 100% TÉCNICAMENTE COMPLETO*  
*21 archivos, ~2,850 líneas, 4 semanas de construcción*
