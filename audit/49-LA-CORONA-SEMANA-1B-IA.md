# LA CORONA — SEMANA 1B IA Claude Vision Integrada

**Fecha:** 11 de Mayo 2026  
**Principio:** Biblia #12 "AI-FIRST"  
**Estado:** IA Claude Vision completamente integrada  
**Próximo:** SEMANA 2 (geo-fence real, integración chofer panel, push)

---

## Qué se hizo

### Edge Function Refactorizada

`supabase/functions/procesar-hoja-fisica/index.ts` migrada de V1 a V4:

| V1 (antes) | V4 (ahora) |
|------------|-----------|
| `hojas_fisicas` tabla | `hojas_salida` tabla |
| `hoja_fisica_id` param | `hoja_salida_id` param |
| `cliente_recibe_fisico` momento | `cliente_sella_firma` momento |
| `ia_procesa_hoja` momento | `ia_procesa` momento |
| `tipo` campo discrepancia | `tipo_discrepancia` campo |
| Prompt genérico sin contexto | Prompt con lista productos esperados |
| `max_tokens: 1024` | `max_tokens: 2048` |
| Solo items_faltantes | + items_dañados + notas_adicionales |
| Solo faltante/no_llego | + rechazado como clasificación |

### Prompt Mejorado

El prompt ahora incluye:
- Lista exacta de productos que debía recibir el cliente (de `hojas_salida_lineas`)
- Nombre del cliente
- Folio de la hoja
- Clasificación "rechazado" como nueva opción
- Items dañados como nueva categoría
- Instrucción para fotos borrosas (confianza <50)

### Hook Nuevo

`useProcesarHojaConIA` en `src/hooks/useHojaSalida.ts`:
- Invoca edge function `procesar-hoja-fisica` con params V4
- Invalida queries: hoja, hojas, eventos, discrepancias, dashboard
- Toast con clasificación + sello/firma

### Integración UI

**HojaFisicaUpload:**
- Auto-trigger IA después de subir foto (chofer sube → IA procesa automático)
- Panel resultados IA inline (clasificación, sello, firma, observaciones)
- Botón "Procesar con IA" si foto existe pero no se procesó
- Badge coloreado por clasificación

**ReconciliarHojaDialog:**
- Panel IA en columna izquierda (debajo de foto)
- Muestra: sello + confianza%, firma + confianza%, clasificación, observaciones leídas
- Botón "Re-procesar con IA" para re-analizar
- Pre-llena sello/firma/clasificación desde resultados IA
- Admin puede aceptar o sobreescribir clasificación IA

---

## Flujo Completo

```
1. Chofer sube foto hoja sellada (HojaFisicaUpload)
2. Foto se sube a Storage bucket hojas-salida
3. AUTO: Claude Vision analiza imagen
4. IA detecta: sello ✓/✗, firma ✓/✗, lee observaciones manuscritas
5. IA clasifica: completo / faltante / no_llego / rechazado
6. Si faltante/no_llego/rechazado → discrepancia auto-generada
7. Eventos LA CORONA registrados (cliente_sella_firma + ia_procesa)
8. Admin ve resultados IA en ReconciliarHojaDialog
9. Admin acepta o sobreescribe → reconciliación final
```

---

## Sin migrations adicionales

Usa tablas existentes de SEMANA 1A (`hojas_salida`, `eventos_conciliacion`, `discrepancias_la_corona`).

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/procesar-hoja-fisica/index.ts` | REESCRITO — V1→V4, prompt mejorado |
| `src/hooks/useHojaSalida.ts` | MODIFICADO — hook `useProcesarHojaConIA` |
| `src/components/la-corona/HojaFisicaUpload.tsx` | REESCRITO — auto-trigger IA + resultados |
| `src/components/la-corona/ReconciliarHojaDialog.tsx` | REESCRITO — panel IA + re-procesar |
| `src/pages/LaCorona.tsx` | MODIFICADO — pasa iaData al dialog |

---

*Principio Biblia #12 "AI-FIRST" activado en LA CORONA*  
*Claude Vision lee observaciones manuscritas de clientes automáticamente*
