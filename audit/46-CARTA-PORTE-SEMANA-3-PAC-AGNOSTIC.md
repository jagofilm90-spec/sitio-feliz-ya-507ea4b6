# Carta Porte 3.1 — SEMANA 3 PAC Adapter Layer + Timbrado

**Fecha:** 10 de Mayo 2026  
**Gap:** V (continuación audit/43, audit/45)  
**Estado:** PAC Adapter Layer completo, Facturama implementado  
**Próximo:** SEMANA 4 (producción, cancelación, catálogos SAT full)

---

## Arquitectura PAC-Agnostic

### Comparación con Enterprise ERPs

| ERP | Patrón PAC | ALMASA-OS |
|-----|-----------|-----------|
| Oracle NetSuite | Preconfigura MySuite + Solución Factible, permite otros | Igual |
| SAP S/4HANA | Preconfigura Edicom + Pegaso, permite otros | Igual |
| Microsoft Dynamics | Adapter pattern con conectores | Igual |
| **ALMASA-OS** | Strategy Pattern, cambia PAC con 1 setting | **Implementado** |

### Design Pattern: Strategy (Gang of Four)

```
PACProvider (interface)
  ├── FacturamaAdapter  ← implementado
  ├── FinkokAdapter     ← futuro
  └── SWSapienAdapter   ← futuro

PACFactory.createProvider('facturama') → FacturamaAdapter
```

---

## Qué se construyó

### Migration SQL (NO APLICADA — aplicar manualmente)

**Archivo:** `supabase/migrations/20260510060000_pac_configurations.sql`

| Tabla | Propósito |
|-------|-----------|
| `pac_providers` | Catálogo de PACs disponibles (3 seeded) |
| `pac_configurations` | Config activa del tenant (credentials, modo, RFC) |
| `pac_transacciones_log` | Log de cada timbrado/cancelación |

**Constraint:** Solo 1 `pac_configurations` activa a la vez (unique index parcial).

### Shared Modules (Edge Functions)

| Archivo | Propósito |
|---------|-----------|
| `_shared/pac-types.ts` | Interface PACProvider + tipos |
| `_shared/pac-facturama.ts` | Adapter Facturama (timbrar, cancelar, saldo, probar) |
| `_shared/pac-factory.ts` | Factory pattern |
| `_shared/cfdi-xml-builder.ts` | Genera XML CFDI 4.0 + CartaPorte 3.1 conforme Anexo 20 |

### Edge Functions

| Function | Propósito |
|----------|-----------|
| `carta-porte-timbrar` | Timbra CP validada: genera XML → PAC → storage → update estado |
| `pac-probar-conexion` | Prueba conexión al PAC activo |

### Frontend

| Archivo | Propósito |
|---------|-----------|
| `src/components/carta-porte/PACSettings.tsx` | UI config PAC + historial transacciones |
| `src/pages/CartaPorteDetalle.tsx` | Botón "Timbrar con PAC" + banner timbrado + descargas XML/PDF |
| `src/pages/Configuracion.tsx` | Tab "PAC (Timbrado)" agregado |
| `src/hooks/useCartasPorte.ts` | 5 hooks nuevos: timbrar, providers, config, probar, transacciones |

---

## Flujo de Timbrado

```
1. Carta Porte VALIDADA
2. Usuario click "Timbrar con PAC"
3. Edge function carta-porte-timbrar:
   a. Valida estado === 'validado'
   b. Lee sub-docs (ubicaciones, mercancías, autotransporte, figura)
   c. Lee pac_configurations (activa)
   d. Construye XML CFDI 4.0 + CartaPorte 3.1
   e. Llama PACFactory → FacturamaAdapter.timbrar()
   f. Log en pac_transacciones_log
   g. Si exitoso:
      - Sube XML a storage bucket 'cartas-porte'
      - Sube PDF a storage bucket 'cartas-porte'
      - Update cartas_porte: estado='timbrado', uuid_sat, xml_url, pdf_url
      - Evento auditoría en cp_eventos
   h. Si error: log + responde error
4. Frontend muestra UUID + botones descarga
```

---

## XML Generado (estructura)

```xml
<cfdi:Comprobante Version="4.0" TipoDeComprobante="T" ...>
  <cfdi:Emisor Rfc="..." RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="XAXX010101000" UsoCFDI="S01"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="78101802" Descripcion="Servicio de traslado"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <cartaporte31:CartaPorte Version="3.1" IdCCP="..." TranspInternac="No">
      <cartaporte31:Ubicaciones>...</cartaporte31:Ubicaciones>
      <cartaporte31:Mercancias>
        ...
        <cartaporte31:Autotransporte>
          <cartaporte31:IdentificacionVehicular/>
          <cartaporte31:Seguros/>
        </cartaporte31:Autotransporte>
      </cartaporte31:Mercancias>
      <cartaporte31:FiguraTransporte>...</cartaporte31:FiguraTransporte>
    </cartaporte31:CartaPorte>
  </cfdi:Complemento>
</cfdi:Comprobante>
```

---

## Setup Facturama Sandbox

1. Ir a https://apisandbox.facturama.mx
2. Registrar cuenta gratuita
3. Obtener username + password de API
4. En ALMASA-OS → Configuración → PAC (Timbrado)
5. Seleccionar Facturama, modo Sandbox
6. Ingresar credenciales + RFC emisor
7. Click "Probar Conexión"
8. Si exitoso → listo para timbrar

---

## ⚠️ MIGRATION PENDIENTE

**Josan debe aplicar manualmente en Lovable SQL Editor:**

```
supabase/migrations/20260510060000_pac_configurations.sql
```

Contiene: 3 tablas + RLS + seed 3 PACs + storage bucket.

Sin esta migration, las edge functions y UI de PAC no funcionan.

---

## Archivos creados/modificados

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/20260510060000_pac_configurations.sql` | CREADO — 3 tablas PAC + RLS + bucket |
| `supabase/functions/_shared/pac-types.ts` | CREADO — interface PACProvider |
| `supabase/functions/_shared/pac-facturama.ts` | CREADO — adapter Facturama |
| `supabase/functions/_shared/pac-factory.ts` | CREADO — factory pattern |
| `supabase/functions/_shared/cfdi-xml-builder.ts` | CREADO — XML CFDI 4.0 + CP 3.1 |
| `supabase/functions/carta-porte-timbrar/index.ts` | CREADO — timbrar completo |
| `supabase/functions/pac-probar-conexion/index.ts` | CREADO — probar conexión |
| `src/components/carta-porte/PACSettings.tsx` | CREADO — UI settings PAC |
| `src/pages/CartaPorteDetalle.tsx` | MODIFICADO — botón timbrar + banner timbrado + descargas |
| `src/pages/Configuracion.tsx` | MODIFICADO — tab PAC agregado |
| `src/hooks/useCartasPorte.ts` | MODIFICADO — 5 hooks PAC nuevos |

---

## Lo que NO está (viene SEMANA 4)

| Feature | Semana |
|---------|--------|
| Cancelación CFDI completa | 4 |
| Producción (modo real) | 4 |
| Catálogos SAT completos (sync cron) | 4 |
| CSD upload (.cer + .key) | 4 |
| Finkok adapter | 5+ |
| Re-timbrado por error | 4 |
| PDF representación impresa custom | 4 |

---

*Carta Porte 3.1 — SEMANA 3 PAC Adapter Layer*  
*Arquitectura enterprise PAC-agnostic, igual que Oracle/SAP/NetSuite*
