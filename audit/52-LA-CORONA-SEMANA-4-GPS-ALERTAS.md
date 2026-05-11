# LA CORONA — SEMANA 4 GPS Desviación + Alertas Push + Analytics

**Fecha:** 11 de Mayo 2026  
**Capas:** 6 (GPS Geo-fence) + 7 (Alertas Push) completadas  
**Estado:** LA CORONA 7/7 CAPAS COMPLETAS  

---

## Arquitectura GPS Geo-fence (Capa 6)

Constantes parametrizables:
- `DESVIACION_RUTA_KM = 2` — desviación si >2km del waypoint más cercano
- `VELOCIDAD_EXCESIVA_KMH = 120`
- `RADIO_GEOFENCE_DEFAULT = 100m`
- Algoritmo Haversine para distancias (estándar industria GPS)

Detecciones automáticas:
1. Velocidad excesiva (>120 km/h, crítica >140)
2. Desviación de ruta (>2km del geo-fence más cercano)
3. Entrada/salida geo-fence
4. Fuera de horario laboral (geo-fence con horarios)

**Nota:** `clientes` no tiene lat/lng todavía. Geo-fences se crean manualmente o cuando clientes tengan coordenadas.

## Sistema Alertas Push (Capa 7)

- Realtime via Supabase channels (`postgres_changes` INSERT)
- Toast automático con severidad (destructive para crítica/alta)
- AlertasBell en header con badge count + pulse si críticas
- Refetch cada 30s
- Estados: activa → vista → resuelta → archivada

## Migration: 4 tablas

**Archivo:** `supabase/migrations/20260511050000_la_corona_gps_alertas.sql`

| Tabla | Propósito |
|-------|-----------|
| `geo_fences` | Perímetros virtuales (cliente, almacén, manual) |
| `eventos_geofence` | Entradas/salidas detectadas |
| `desviaciones_ruta` | Desviaciones detectadas con estado investigación |
| `alertas_la_corona` | Push notifications con severidad y destinatarios |

`chofer_ubicaciones` usa `user_id` (no empleado_id), tablas nuevas usan `user_id` para consistencia.

## Edge Functions (2)

| Function | Propósito |
|----------|-----------|
| `procesar-gps-chofer` | Haversine + geo-fences + desviaciones + alertas auto |
| `generar-geofences-clientes` | Crea geo-fence almacén + manuales |

## Frontend

| Archivo | Propósito |
|---------|-----------|
| `src/hooks/useGPSGeofence.ts` | 10 hooks: geo-fences, desviaciones, alertas realtime, analytics |
| `src/components/la-corona/AlertasBell.tsx` | Bell header con popover alertas |
| `src/pages/LaCorona.tsx` | +3 tabs: Alertas, Desviaciones, Geo-fences |
| `src/components/Layout.tsx` | AlertasBell integrado en header (admin+secretaria) |

## Estado LA CORONA: 7/7 CAPAS COMPLETAS

| Capa | Estado |
|------|--------|
| 1. Conciliación 9 momentos | done |
| 2. Hoja de Salida V4 | done |
| 3. Score Confianza algoritmo real | done |
| 4. Inventario Ciego | done |
| 5. Verificación IA sello/firma | done |
| 6. GPS desviación rutas | **done** |
| 7. Alertas push tiempo real | **done** |

---

## ⚠️ MIGRATION PENDIENTE

```
supabase/migrations/20260511050000_la_corona_gps_alertas.sql
```

---

*LA CORONA — 7/7 capas anti-robo construidas. "El Sistema Todo Lo Ve."*
