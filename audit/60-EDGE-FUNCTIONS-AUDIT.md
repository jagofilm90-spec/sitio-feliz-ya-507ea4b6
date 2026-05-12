# Auditoría Edge Functions — 11 Mayo 2026

## Resumen

| Categoría | Count | LoC |
|-----------|-------|-----|
| Total functions | 77 | ~15,000+ |
| Activas (refs > 0) | 61 | ~12,500 |
| Huérfanas (refs = 0) | 16 | ~2,700 |
| Creadas hoy (11 mayo) | 25 | ~4,200 |
| _shared (utility) | 4 | ~500 |

---

## Functions HUÉRFANAS (0 refs en frontend)

| Function | LoC | Última mod | Recomendación | Razón |
|----------|-----|-----------|---------------|-------|
| auto-reschedule-deliveries | 352 | feb 2026 | **KEEP** | Cron job, no se invoca desde frontend |
| migrate-proveedor-addresses | 322 | ene 2026 | **KILL** | Migration one-time ya ejecutada |
| notificar-entregas-programadas | 266 | ene 2026 | **KEEP** | Cron job candidato |
| generar-hoja-fisica-pdf | 237 | hoy | **KILL** | V1 reemplazada por generar-hoja-salida |
| check-caducidad-fumigacion | 229 | mar 2026 | **KEEP** | Cron job fumigaciones |
| notificar-pedidos-programados | 176 | ene 2026 | **KEEP** | Cron job pedidos |
| gmail-callback | 168 | nov 2025 | **KEEP** | OAuth callback (invocado por Google, no frontend) |
| procesar-gps-chofer | 165 | hoy | **KEEP** | Se invocará por cron/webhook GPS |
| check-invoice-expiry-reminders | 154 | ene 2026 | **KEEP** | Cron job vencimiento facturas |
| check-vehicle-documents-expiry | 144 | dic 2025 | **KEEP** | Cron job vencimiento docs vehículos |
| get-route-directions | 137 | dic 2025 | **KEEP** | Google Directions API, puede usarse |
| extract-placas-vehiculo | 133 | dic 2025 | **KEEP** | IA Vision para placas |
| zk-attendance | 131 | mar 2026 | **KEEP** | Webhook ZK reloj checador |
| send-welcome-email | 131 | mar 2026 | **KEEP** | Email onboarding |
| convertir-remision-factura | 63 | hoy | **KEEP** | Creada hoy, UI pendiente integrar |
| sat-catalogos-sync | 46 | hoy | **KEEP** | Cron job futuro SAT |

### Candidatas a KILL (2 de 16):

1. **migrate-proveedor-addresses** (322 LoC) — migration one-time ya completada
2. **generar-hoja-fisica-pdf** (237 LoC) — V1 reemplazada por `generar-hoja-salida` (V4)

### Razón mayoría son KEEP:
14 de 16 "huérfanas" son cron jobs, webhooks o callbacks que NO se invocan desde el frontend sino desde:
- Supabase cron scheduler
- Google OAuth callbacks
- ZK reloj checador webhook
- Futuro uso programado

---

## Duplicadas Potenciales

| Par | Análisis | Veredicto |
|-----|----------|-----------|
| `generar-hoja-fisica-pdf` vs `generar-hoja-salida` | V1 vs V4. Hoja-salida es la definitiva. | **KILL hoja-fisica-pdf** |
| `timbrar-cfdi` vs `timbrar-nota-credito` vs `timbrar-complemento-pago` | 3 tipos CFDI distintos (I/E/P). Correcto tener separados. | **KEEP todos** |
| `cancelar-cfdi` vs `carta-porte-cancelar` | Facturas vs Cartas Porte. Diferente lógica. | **KEEP ambos** |
| `send-invoice-email` vs `enviar-reporte-diario` | Propósitos distintos. | **KEEP ambos** |
| `resumen-diario` vs `generar-reporte-diario` | resumen-diario es V1 (push notification), generar-reporte es V2 (BD + email). | **Evaluar merge futuro** |

---

## Functions creadas HOY (25)

### Carta Porte SEMANA 4:
- carta-porte-cancelar (135 LoC)
- carta-porte-pdf-borrador (159 LoC)
- sat-catalogos-sync (46 LoC)

### LA CORONA:
- generar-hoja-salida (383 LoC)
- generar-hoja-fisica-pdf (237 LoC) — **V1, eliminar**
- procesar-hoja-fisica (245 LoC) — refactorizada V4
- conciliar-momento (199 LoC)
- calcular-score-empleado (232 LoC)
- generar-conteo-ciego (94 LoC)
- finalizar-conteo-ciego (141 LoC)
- procesar-gps-chofer (165 LoC)
- generar-geofences-clientes (77 LoC)

### M08 Facturación:
- timbrar-nota-credito (105 LoC)
- timbrar-complemento-pago (112 LoC)
- convertir-remision-factura (63 LoC)

### M09 Cobranza:
- aplicar-cobro (72 LoC)
- crear-rep-from-cobro (66 LoC)
- generar-aging-report (75 LoC)

### M14 Dashboard:
- generar-reporte-diario (79 LoC)
- enviar-reporte-diario (132 LoC)

### JOSAN:
- chat-josan (359 LoC)

Todas pending deploy (necesitan `supabase functions deploy`).

---

## Recomendaciones Cleanup

### KILL seguro (2 functions, 559 LoC):
1. `migrate-proveedor-addresses` — migration completada
2. `generar-hoja-fisica-pdf` — V1 reemplazada por V4

### Merge futuro (no urgente):
- `resumen-diario` + `generar-reporte-diario` → consolidar en 1

### Deploy pendiente:
25 functions creadas hoy necesitan `supabase functions deploy` individual.

---

*77 edge functions. 61 activas, 14 cron/webhook, 2 candidatas a kill.*
