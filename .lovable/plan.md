
# Rediseño del formulario "Nuevo Cliente"

## El problema actual

El flujo actual obliga al vendedor a elegir primero entre "Subir CSF" o "Manual" ANTES de ver cualquier campo. Esto:
- Es confuso — el vendedor no sabe a qué se compromete antes de empezar
- Duplica toda la lógica del formulario (hay dos secciones casi idénticas)
- Esconde información importante (el CSF debería ser opcional, no la puerta de entrada)

## La solución: formulario único, lineal y claro

Un solo formulario con todos los campos visibles desde el inicio:

```text
┌─────────────────────────────────────┐
│  Nuevo Cliente              [X]     │
├─────────────────────────────────────┤
│                                     │
│  Nombre del cliente *               │
│  [_______________________________]  │
│                                     │
│  Teléfonos                          │
│  [+55 1234 5678] [WhatsApp] [+]     │
│  • 55-1111-2222 · Principal         │
│                                     │
│  Correos                            │
│  [ventas@..............] [Todo] [+] │
│                                     │
│  ─── Dirección del negocio ──────── │
│  Calle, No., Colonia, CP...         │
│                                     │
│  📍 Ubicación de entrega            │
│  ☑ La entrega es en esta dirección  │
│  (si desmarco → segunda dirección   │
│   + mapa para GPS)                  │
│                                     │
│  ─── CSF (opcional) ─────────────── │
│  [📄 Subir CSF] ← si se sube,      │
│   la IA extrae RFC/Razón Social y   │
│   el cliente queda como "con factura"│
│   Si NO se sube → "solo remisión"   │
│                                     │
│  Zona, horarios, notas...           │
│                                     │
├─────────────────────────────────────┤
│  [        Crear Cliente         ]   │
└─────────────────────────────────────┘
```

## Lógica de dirección de entrega (respuesta a tu pregunta)

**Sí, usamos un checkbox.** Aquí está la lógica exacta:

```text
Dirección del negocio:
  Calle *, No. Ext *, No. Int, Colonia, CP *, Alcaldía *

☑ "La entrega es en esta misma dirección"
   └─ Si MARCADO (default):
        • La sucursal "Principal" usa la misma dirección del negocio
        • No se captura GPS por ahora (se puede actualizar después)
   
   └─ Si DESMARCADO:
        • Aparece un campo adicional con Google Maps autocomplete
        • El vendedor busca la dirección de entrega específica
        • Se capturan coordenadas GPS automáticamente
        • Esas coordenadas se muestran en el mapa global y para los choferes
```

La clave: la **sucursal "Principal"** (tabla `cliente_sucursales`) es quien tiene `latitud` y `longitud` — es lo que usa el mapa global (`MapaGlobalSucursales.tsx`) y los choferes (`ChoferPanel.tsx`). Al crear el cliente siempre se crea esta sucursal.

## Lógica del CSF (simplificada)

```text
NO subió CSF  → preferencia_facturacion = "siempre_remision"  
                 Sin RFC, sin razón social, factura nunca aplica

SÍ subió CSF  → IA extrae datos fiscales automáticamente
                 preferencia_facturacion = "siempre_factura"
                 Sección colapsable con RFC, Razón Social (editables)
```

La sección de CSF aparece **siempre visible** en el formulario (no es la pantalla inicial), con un botón "📄 Subir CSF" que puede tocarse en cualquier momento. Si ya se subió, muestra un badge verde "Datos fiscales extraídos" y los campos RFC/Razón Social aparecen debajo para revisión.

## Archivos a modificar

| Archivo | Qué cambia |
|---------|-----------|
| `src/components/vendedor/VendedorNuevoClienteSheet.tsx` | Reescritura completa del formulario con flujo lineal unificado |

Solo un archivo. La lógica de submit, las llamadas a Supabase, y los sub-componentes (`VendedorTelefonosCliente`, `VendedorCorreosCliente`) se reutilizan tal como están.

## Estructura del nuevo formulario (secciones en orden)

**1. Datos básicos**
- Nombre del cliente (campo grande, obligatorio)

**2. Contacto**
- Teléfonos: componente `VendedorTelefonosCliente` ya existente (1 o más)
- Correos: componente `VendedorCorreosCliente` ya existente (1 o más)

**3. Dirección del negocio** (campos estructurados)
- Calle *, No. Ext *, No. Int (opcional), Colonia, CP *, Alcaldía/Municipio *
- El CP tiene auto-completado de alcaldía (lógica ya existente)
- Zona de entrega (auto-asignada por CP o manual)

**4. Ubicación de entrega** (checkbox + dirección opcional)
- `☑ La entrega es en esta misma dirección` (marcado por default)
- Si se desmarca: GoogleMapsAddressAutocomplete + coordenadas GPS visibles
- Nota: "GPS se puede actualizar con visita física desde Mis Clientes"

**5. Restricciones de entrega** (colapsable/acordeón)
- Horario de entrega (inicio/fin)
- Días sin entrega (botones de días)

**6. Facturación / CSF** (sección con upload)
- Card con estado: "Sin datos fiscales (solo remisión)" → botón Subir CSF
- Si se carga: muestra badge verde + campos RFC y Razón Social editables
- Si se procesa: muestra los datos extraídos por IA listos para revisar

**7. Notas**
- Textarea de instrucciones especiales

**8. Footer fijo**
- Botón "Crear Cliente" — habilitado cuando hay nombre + al menos dirección

## Comportamiento en submit

El submit es igual al actual, solo cambia el orden de recolección de datos. El cliente se crea con:
- `preferencia_facturacion`: `"siempre_factura"` si se subió CSF, `"siempre_remision"` si no
- La sucursal "Principal" se crea siempre con:
  - Si el checkbox está marcado: `direccion` = dirección del negocio, `latitud/longitud` = null (GPS pendiente)
  - Si el checkbox está desmarcado: `direccion` = dirección separada de entrega con coordenadas GPS del Google Maps autocomplete
