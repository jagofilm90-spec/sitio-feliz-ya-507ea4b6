# M07 Chofer App Mobile — POD + Geo-fence + IA

**Fecha:** 11 de Mayo 2026  
**Estado:** Completo  
**Cierra:** Loop entrega física con POD digital

---

## Flujo POD (Proof of Delivery)

```
1. Chofer ve entregas del día (/chofer/mi-ruta)
2. Click entrega → detalle con navegación Google Maps
3. "Salir de bodega" → GPS + estado en_transito
4. "He llegado al cliente" → GPS + marca llegada
5. "Completar entrega" → POD dialog:
   - Sign on glass (cliente + chofer)
   - Foto hoja sellada (cámara)
   - Nombre quien recibe
   - Notas
6. Confirmar → auto-trigger IA Claude Vision
7. IA procesa hoja + detecta sello/firma/faltantes
```

## Migration

`supabase/migrations/20260511090000_m07_chofer_app.sql`

- ALTER hojas_salida: 12 columnas (chofer timestamps, GPS, firmas, motivos)
- Tabla `chofer_sync_queue` (offline events)

## Frontend

| Archivo | Propósito |
|---------|-----------|
| `src/pages/chofer/MiRutaHoy.tsx` | Dashboard día con métricas + lista entregas |
| `src/pages/chofer/EntregaDetalle.tsx` | Detalle + navegación + POD + fallida |
| `src/components/chofer/SignaturePad.tsx` | Sign on glass canvas (touch) |
| `src/hooks/useChoferApp.ts` | 8 hooks |
| `public/manifest.json` | PWA manifest |

## PWA

- `manifest.json` con theme_color crimson + standalone display
- `<meta name="theme-color">` + `<link rel="manifest">` en index.html

---

## ⚠️ MIGRATION PENDIENTE

```
supabase/migrations/20260511090000_m07_chofer_app.sql
```

---

*M07 — POD mobile cierra loop entrega física*
