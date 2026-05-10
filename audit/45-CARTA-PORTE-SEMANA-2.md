# Carta Porte 3.1 — SEMANA 2 Wizard + Validación

**Fecha:** 10 de Mayo 2026  
**Gap:** V (continuación de audit/43)  
**Estado:** Wizard completo + Edge Function validación  
**Próximo:** SEMANA 3 (timbrado PAC)

---

## Qué se construyó

### Hooks nuevos (`src/hooks/useCartaPorteWizard.ts`)

| Hook | Propósito |
|------|-----------|
| `useRutaConEntregas` | Fetch ruta + entregas + pedidos + clientes + detalles (para auto-fill) |
| `usePermisoSICT` | Permiso SICT vigente del vehículo |
| `useCartaPorteSubDocs` | Fetch ubicaciones, mercancías, autotransporte, figuras existentes |
| `useUpsertAutotransporte` | Crear/actualizar nodo autotransporte |
| `useUpsertFigura` | Crear/actualizar figura del transporte |
| `useSaveUbicaciones` | Bulk delete+insert ubicaciones |
| `useSaveMercancias` | Bulk delete+insert mercancías |
| `useValidateCartaPorte` | Invoca edge function con 12 reglas SAT |
| `useRegistrarEventoCP` | Auditoría LA CORONA (evento en cp_eventos) |
| `useRutasDisponibles` | Lista rutas para selector en creación |

### Wizard 4 Pasos (`src/components/carta-porte/`)

| Componente | Funcionalidad |
|------------|---------------|
| `CartaPorteWizard.tsx` | Orquestador: stepper visual, navegación, localStorage backup, botón validar |
| `Paso1Mercancias.tsx` | Auto-fill desde ruta, captura manual, mat. peligroso, peso total |
| `Paso2Ubicaciones.tsx` | Origen (ALMASA default) + destinos, auto-fill clientes de ruta, CP/RFC/dirección |
| `Paso3Autotransporte.tsx` | Auto-fill vehículo + permiso SICT, config vehicular SAT, seguros |
| `Paso4FiguraTransporte.tsx` | Auto-fill chofer, RFC, licencia, warnings si datos faltantes |

### Edge Function (`supabase/functions/carta-porte-validar/`)

12 reglas de validación SAT:

| # | Regla | Tipo |
|---|-------|------|
| R01 | Al menos 1 origen | Error |
| R02 | Al menos 1 destino | Error |
| R03 | RFC + CP + fecha en cada ubicación | Error |
| R04 | Al menos 1 mercancía | Error |
| R05 | BienesTransp + cantidad + peso + unidad por mercancía | Error |
| R06 | Nodo Autotransporte presente | Error |
| R07 | Campos obligatorios autotransporte (permiso, config, placa, año, seguro) | Error |
| R08 | Al menos 1 Figura del Transporte | Error |
| R09 | RFC + nombre + licencia(si operador) en figura | Error |
| R10 | Peso total > 0 | Error |
| R11 | RFC formato válido | Warning |
| R12 | CP 5 dígitos | Error |

Acciones post-validación:
- Si válida → estado = "validado"
- Si errores → estado = "borrador" + errores guardados
- Evento de auditoría registrado en cp_eventos

### CartaPorteDetalle ampliado

- Tabs: "Wizard/Editar" y "Resumen"
- Borrador abre wizard por defecto
- Resumen muestra 5 cards: Autotransporte, Operador, Ubicaciones, Mercancías, UUID SAT
- Errores de validación visibles en card roja
- Badge con color por estado

### CartasPorte lista mejorada

- Botón "Desde Ruta" con dialog selector
- Al crear desde ruta, auto-asigna vehiculo_id + chofer_id
- Wizard recibe ruta_id y auto-llena datos

---

## Flujo completo del usuario

1. Lista → "Desde Ruta" o "Nueva Carta Porte"
2. Si desde ruta: auto-fill vehículo, chofer, mercancías, ubicaciones
3. Wizard paso 1: mercancías (agrega/edita/elimina) → Guardar
4. Wizard paso 2: ubicaciones origen + destinos → Guardar
5. Wizard paso 3: autotransporte + seguros → Guardar
6. Wizard paso 4: operador/chofer → Guardar
7. Cuando 4 pasos verdes → botón "Validar Carta Porte"
8. Edge function ejecuta 12 reglas → válida o errores
9. Si válida → estado "validado" (listo para timbrar en SEMANA 3)

---

## Principios de diseño

- **NUNCA bloquear borrador** por datos faltantes (warnings amarillos)
- **SÍ bloquear validación** si campos SAT obligatorios faltan (errores rojos)
- **Auto-save** via localStorage + guardado explícito por paso
- **LA CORONA**: cada validación registrada en cp_eventos
- **Datos futuros**: wizard funciona con BD vacía (captura manual elegante)

---

## Archivos creados/modificados

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useCartaPorteWizard.ts` | CREADO — 10 hooks para wizard |
| `src/components/carta-porte/CartaPorteWizard.tsx` | CREADO — orquestador wizard |
| `src/components/carta-porte/Paso1Mercancias.tsx` | CREADO — paso mercancías |
| `src/components/carta-porte/Paso2Ubicaciones.tsx` | CREADO — paso ubicaciones |
| `src/components/carta-porte/Paso3Autotransporte.tsx` | CREADO — paso autotransporte |
| `src/components/carta-porte/Paso4FiguraTransporte.tsx` | CREADO — paso figura transporte |
| `supabase/functions/carta-porte-validar/index.ts` | CREADO — edge function 12 reglas |
| `src/pages/CartaPorteDetalle.tsx` | REESCRITO — wizard + tabs + resumen |
| `src/pages/CartasPorte.tsx` | MODIFICADO — botón "Desde Ruta" con dialog |

---

## Lo que NO está (viene SEMANA 3)

| Feature | Semana |
|---------|--------|
| Timbrado real con PAC (Facturama/SenHub) | 3 |
| Descarga PDF timbrado | 3 |
| Cancelación CFDI Carta Porte | 3 |
| Catálogos SAT autocomplete (c_ClaveProdServCP completo) | 3 |
| Edge function sat-catalogos-sync (cron) | 3 |
| Re-timbrado por error | 3 |

---

## Nota técnica

- **NO se necesitó migración adicional** — todas las tablas de SEMANA 1 tienen las columnas necesarias
- `(supabase as any)` sigue necesario hasta regenerar types.ts con `npx supabase gen types`
- TypeScript compila limpio (`npx tsc --noEmit` → 0 errores)

---

*Carta Porte 3.1 — SEMANA 2 Wizard + Validación*  
*Wizard funcional, edge function con 12 reglas SAT, auto-fill desde rutas*
