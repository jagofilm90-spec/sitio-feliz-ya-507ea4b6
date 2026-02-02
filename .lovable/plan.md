

# Plan: Adaptar Formulario de Clientes y Sucursales a Móvil

## Problemas Identificados

### 1. Formulario "Editar Cliente" (ClienteFormContent.tsx)
El formulario usa layouts de múltiples columnas fijas que no se adaptan a móvil:
- `grid-cols-2` para Código/Nombre, RFC/Razón Social, Teléfono/Email, etc.
- `grid-cols-3` para C.P./Colonia/Municipio
- Sin uso de `useIsMobile()` para adaptar

**Resultado:** Los campos se comprimen, el texto se corta, contenido inaccesible.

### 2. Diálogo Sucursales (ClienteSucursalesDialog.tsx)
Aunque ya tiene adaptaciones móviles, algunos elementos aún desbordan porque el contenedor tiene ancho fijo.

---

## Solución

### Cambio 1: ClienteFormContent.tsx - Layout Responsive

Agregar `useIsMobile()` y cambiar los grids a columna única en móvil:

```
Antes (móvil):
┌───────────────────────────────────────┐
│ [Código][Nombre Comerc│               │ <- Cortado
│ [RFC   ][Razón Socia│                 │ <- Cortado
│ [C.P.][Colonia][Munic│                │ <- Cortado
└───────────────────────────────────────┘

Después (móvil):
┌───────────────────────────────────────┐
│ Código *                              │
│ [LECAROZ                          ]   │
│                                       │
│ Nombre Comercial *                    │
│ [Grupo Lecaroz                    ]   │
│                                       │
│ RFC                                   │
│ [GLE001231AA1                     ]   │
│                                       │
│ ... (campos apilados verticalmente)   │
└───────────────────────────────────────┘
```

**Código técnico:**
```tsx
// Agregar import
import { useIsMobile } from "@/hooks/use-mobile";

// Dentro del componente
const isMobile = useIsMobile();

// Cambiar grids
<div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
<div className={`grid ${isMobile ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-3'} gap-4`}>
```

### Cambio 2: Secciones Específicas a Adaptar

| Sección | Línea | Grid Actual | Grid Móvil |
|---------|-------|-------------|------------|
| Datos de Identificación | 128 | `grid-cols-2` | `grid-cols-1` |
| Datos Fiscales (RFC/Razón) | 168 | `grid-cols-2` | `grid-cols-1` |
| Dirección (C.P./Colonia/Municipio) | 230 | `grid-cols-3` | `grid-cols-1` |
| Datos Comerciales (Tel/Email) | 356 | `grid-cols-2` | `grid-cols-1` |
| Crédito (Término/Límite) | 396 | `grid-cols-2` | `grid-cols-1` |
| CSF Upload (flex) | 312 | `flex items-center` | `flex-col` |

### Cambio 3: Botones del Formulario

Adaptar el área de botones (Cancelar/Guardar) para ocupar ancho completo en móvil:

```tsx
// Antes
<div className="flex justify-end gap-4">
  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
  <Button type="submit">Guardar</Button>
</div>

// Después
<div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-end gap-4'}`}>
  {isMobile ? (
    <>
      <Button type="submit" className="w-full">Guardar</Button>
      <Button type="button" variant="outline" className="w-full" onClick={() => setDialogOpen(false)}>Cancelar</Button>
    </>
  ) : (
    <>
      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
      <Button type="submit">Guardar</Button>
    </>
  )}
</div>
```

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/clientes/ClienteFormContent.tsx` | Agregar `useIsMobile`, adaptar todos los grids y layouts |

---

## Resultado Esperado

Después de la implementación:

1. **Móvil:** Todos los campos visibles en columna única, sin scroll horizontal, formulario completo accesible
2. **Tablet:** Layout de 2 columnas donde quepa
3. **Desktop:** Sin cambios (mantiene 2-3 columnas)

---

## Lo que NO cambia

- Lógica de validación del formulario
- Campos requeridos
- Conexión con base de datos
- Vista de escritorio (solo se agregan breakpoints responsivos)
