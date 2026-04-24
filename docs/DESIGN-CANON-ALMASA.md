# DESIGN CANON — ALMASA·OS v1.1
**Fecha de establecimiento:** 24 abril 2026
**Autoridad:** Jose Antonio Gómez Ortega, Director General
**Alcance:** Todas las pantallas de ALMASA-OS (446 componentes, 42 rutas)

---

## ⚠️ Regla de oro

Si una pantalla nueva no se ve como las 13 pantallas canónicas, está mal.
Este documento es la referencia. No inventar variantes.

---

## 1. Tipografía

### Fuentes

| Uso | Familia | Fallback | Clase Tailwind |
|-----|---------|----------|----------------|
| Display / títulos / números grandes | Cormorant Garamond | Georgia, serif | `font-serif` |
| Body / labels / UI | Inter Tight | -apple-system, sans-serif | `font-sans` (default) |
| Código / monospace | JetBrains Mono | monospace | `font-mono` |

### Jerarquía de tamaños

| Nivel | Clase | Uso |
|-------|-------|-----|
| Page title | `font-serif text-5xl font-light leading-[0.95]` + `letterSpacing: -0.025em` | Título principal de cada pantalla |
| Stat numbers | `font-serif text-[34px] leading-tight tabular-nums` | Números grandes en stat cards |
| Dialog/Sheet title | `font-serif text-2xl font-light text-ink-900` | Título de dialogs y sheets de creación |
| Section heading | `text-lg font-semibold text-foreground` | Encabezados de sección dentro de forms |
| Body | `text-sm` o `text-xs` | Texto general, celdas de tabla |
| Labels | `text-[11px] uppercase tracking-[0.08em] font-medium` | Labels de stat cards |
| Eyebrow | `text-[11px] uppercase tracking-[0.22em] font-medium` | Categoría arriba del título |
| Micro | `text-[9px]` o `text-[10px]` | Badges, anotaciones, tags |

---

## 2. Colores

### Paleta principal

| Nombre | Hex | Clase | Uso |
|--------|-----|-------|-----|
| Crimson 500 | `#c41e3a` | `text-crimson-500` / `bg-crimson-500` | Acento principal, botones primary, títulos accent |
| Crimson 600 | `#a8172f` | `hover:bg-crimson-600` | Hover de botones |
| Ink 900 | `#0a0a0a` | `text-ink-900` | Texto principal, títulos |
| Ink 700 | `#2a2a2a` | `text-ink-700` | Texto secundario |
| Ink 500 | `#6a6a6a` | `text-ink-500` | Texto muted, leads, labels |
| Ink 300 | `#b8b8b5` | `text-ink-300` | Placeholders, separadores |
| Ink 100 | `#e8e8e6` | `border-ink-100` | Borders, dividers |
| Ink 50 | `#f0eee8` | `bg-ink-50` | Fondos alternos de tabla |

### Fondos

| Nombre | Hex | Clase | Uso |
|--------|-----|-------|-----|
| Blanco | `#ffffff` | `bg-white` | Cards, dialogs, inputs |
| Soft | `#faf9f6` | `bg-soft` | Fondo general de la app |
| Warm | `#f7f5ef` | `bg-warm` | Fondos cálidos alternativos |

### Sombras

| Nombre | Valor | Uso |
|--------|-------|-----|
| xs-soft | `0 1px 2px rgba(10,10,10,0.04)` | Inputs focus |
| sm-soft | `0 2px 8px rgba(10,10,10,0.05), 0 1px 2px rgba(10,10,10,0.03)` | Cards hover |
| md-soft | `0 8px 24px rgba(10,10,10,0.07), 0 2px 4px rgba(10,10,10,0.04)` | Dialogs, sheets |

---

## 3. PageHeader — Componente canónico

El componente `PageHeader` es el elemento más importante del Design System. Toda pantalla principal DEBE usarlo.

### Archivo
`src/components/layout/PageHeader.tsx`

### Props

```typescript
interface PageHeaderProps {
  eyebrow?: string;      // Categoría arriba del título ("Catálogos", "Operación")
  title: string;         // Palabra(s) antes del accent ("Tus", "Tu", "Mis", "Nuevo")
  titleAccent?: string;  // Palabra con italic crimson + punto final ("productos.", "pedidos.")
  lead?: string;         // Descripción debajo del título (serif italic)
  actions?: ReactNode;   // Botones top-right
}
```

### Clases exactas

| Elemento | Clases |
|----------|--------|
| Container | `mb-10 flex justify-between items-end gap-8` |
| Content wrapper | `flex-1` |
| Eyebrow | `text-[11px] uppercase tracking-[0.22em] text-crimson-500 font-medium mb-3` |
| Eyebrow prefix | `— ` (dash + espacio antes del texto) |
| Title (h1) | `font-serif text-5xl font-light text-ink-900 leading-[0.95] tracking-tight` + `letterSpacing: -0.025em` |
| Title accent (em) | `italic text-crimson-500 font-normal` |
| Lead (p) | `font-serif italic text-lg text-ink-500 leading-relaxed font-light mt-3` |
| Actions wrapper | `flex gap-3 shrink-0` |

### Reglas del título

1. **Siempre termina con punto** (`.`). El punto va en el `titleAccent`.
2. **La palabra accent va en italic crimson**: `productos.`, `pedidos.`, `inventario.`
3. **El patrón posesivo** ("Tus", "Tu", "Mis") es preferido para admin/vendedor. Secretaria usa solo el sustantivo.
4. **Nunca usar ALL CAPS** en el título. Solo primera letra mayúscula.

### Ejemplos canónicos

```
Admin:      — Catálogos
            Tus productos.
            274 productos en catálogo.

Admin:      — Operación
            Tus pedidos.
            Gestión de pedidos de clientes y cotizaciones.

Secretaria: Pedidos, hoy.
            Autorización, carga y entrega

Vendedor:   Mis pedidos.
            Seguimiento de órdenes en curso

Vendedor:   Nuevo pedido.
            Captura rápida de orden
```

---

## 4. Stat Cards

Cards con número grande serif y label pequeño uppercase.

### Clases exactas

| Elemento | Clases |
|----------|--------|
| Container | `bg-white border rounded-xl px-4 py-3 text-center transition-colors` |
| Border inactivo | `border-ink-100 hover:border-ink-300` |
| Border activo (selected) | `border-crimson-500 ring-1 ring-crimson-500` |
| Número | `font-serif text-[34px] leading-tight text-ink-900 tabular-nums` |
| Label | `text-[11px] uppercase tracking-[0.08em] text-ink-500 font-medium mt-0.5` |

### Grid

- Admin usa `grid grid-cols-2 sm:grid-cols-5 gap-4`
- Secretaria usa `grid grid-cols-2 sm:grid-cols-5 gap-3`
- Vendedor usa `grid grid-cols-2 sm:grid-cols-4 gap-3`

---

## 5. Tablas

### Clases de tabla

| Elemento | Clases |
|----------|--------|
| Wrapper | `border rounded-lg` + `style={{ overflowX: "auto" }}` |
| Table | `table-fixed w-full` o sin table-fixed |
| th | `py-2 px-1.5 text-[10px]` o `text-xs` según contexto |
| td | `py-1 px-1.5` o `py-1 px-2` |
| Row hover | implícito de shadcn Table |
| Monospace (folio, precio) | `font-mono` |

### Badges de estado

| Estado | Variant | Clases adicionales |
|--------|---------|-------------------|
| Pendiente | `outline` | `border-blue-500 text-blue-600` |
| Por autorizar | `outline` | `border-amber-500 text-amber-600` |
| En ruta | `secondary` | — |
| Entregado | `outline` | `border-green-500 text-green-600` |
| Cancelado | `outline` | `border-muted text-muted-foreground` |
| Rechazado | `outline` | `border-red-500 text-red-600` |

---

## 6. Botones

### Primary (acción principal)

```
bg-crimson-500 hover:bg-crimson-600 text-white
```

Con ícono: `<Plus className="h-4 w-4 mr-2" />` antes del texto.

### Ubicación

- **En PageHeader**: top-right como `actions` prop
- **En formularios**: bottom del form, alineado a la derecha
- **En wizard vendedor**: sticky bottom con shadow

---

## 7. Formularios y Dialogs — TODOS siguen Editorial

Los dialogs y sheets de creación ("Nuevo X") HOY tienen inconsistencia
visual. Algunos usan sans-serif bold con emojis; otros usan el patrón
editorial. **El canon unifica: TODOS deben seguir el patrón editorial.**

### Dialogs de creación (admin)

Aplica a: NuevoPedidoDialog, NuevaFacturaDirectaDialog, dialogs de alta.

| Elemento | Regla |
|----------|-------|
| DialogTitle | `font-serif text-2xl font-light text-ink-900` |
| Palabra accent | `italic text-crimson-500` dentro del título |
| Punto final | Sí, obligatorio |
| Emoji en título | Prohibido |
| Sans-serif bold | Prohibido |
| DialogDescription | `font-serif italic text-sm text-ink-500` |
| Spacing | `space-y-6` entre secciones |
| Sección heading interna | `text-xs uppercase tracking-[0.15em] text-ink-500 font-medium` |

Ejemplos correctos:

```
✅ Nuevo pedido.        ("pedido" en italic crimson, punto al final)
✅ Nueva factura.       ("factura" en italic crimson)
✅ Nuevo empleado.      ("empleado" en italic crimson)
```

Ejemplos incorrectos (legacy — deben migrarse):

```
❌ 🛒 Nuevo Pedido      (emoji + sans bold + sin punto)
❌ Nuevo cliente        (sans 2xl bold + sin punto)
❌ Hacer un pedido      (sans bold + sin punto)
```

### Sheets móviles (vendedor, chofer)

Aplica a: VendedorNuevoClienteSheet, VendedorNuevoPedidoTab (wizard),
RegistrarEntregaSheet.

| Elemento | Regla |
|----------|-------|
| SheetTitle | `font-serif text-2xl font-light text-ink-900` |
| Punto final | Sí, obligatorio |
| Inputs | Pueden ser `h-14` para dedos en mobile |
| Dividers centrados | Permitidos (patrón Mobile-First) |
| Emoji en título | Prohibido |

**La única diferencia del Sheet respecto al Dialog es el tamaño de
los inputs y los dividers para mejor UX en mobile. El TÍTULO sigue
la misma regla editorial.**

### Estado actual de migración

Las siguientes 3 pantallas NO siguen el canon. PENDIENTE migrar:

1. `src/components/pedidos/NuevoPedidoDialog.tsx` — título "🛒 Nuevo Pedido"
2. `src/pages/clientes/NuevoCliente.tsx` — título sans 2xl bold
3. `src/components/cliente/ClienteNuevoPedido.tsx` — título sans bold

Sprint de migración: próxima sesión.

---

## 8. Modo de la app

| Atributo | Valor | Notas |
|----------|-------|-------|
| Modo | Light mode only | Dark mode NO es requisito |
| Idioma | Español México | i18n NO es requisito |
| Responsive | Por rol (ver matriz dispositivos) | Secretaria/Contadora: desktop only |

---

## 9. Patrones prohibidos

| Patrón | Por qué |
|--------|---------|
| ALL CAPS en títulos de pantalla | El canon usa minúsculas con primera mayúscula |
| Títulos sin punto final (en pantallas principales) | El punto es parte de la identidad editorial |
| Sans-serif bold para títulos de pantalla principal | Usar `font-serif font-light` (PageHeader) |
| Colores fuera de la paleta ink/crimson | No inventar nuevos grises o rojos |
| `disabled={!permission}` para ocultar funcionalidad | Usar renderizado condicional `{permission && <Component>}` |
| `console.log` en producción | Usar `console.error` solo para errores reales |
| `as any` para bypassar TypeScript | Agregar tipo correcto |
| Emoji en títulos de dialogs/sheets | El canon editorial no usa emojis decorativos |
| Títulos sans-serif bold en dialogs de creación | Usar font-serif con palabra accent en italic |

---

## 10. Checklist para pantalla nueva

Antes de mergear una pantalla nueva, verificar:

- [ ] Usa `<PageHeader>` con title + titleAccent + punto final
- [ ] Eyebrow con categoría si es admin page
- [ ] Lead descriptivo en serif italic
- [ ] Stat cards con `font-serif text-[34px]` para números
- [ ] Tabla con `border rounded-lg` y overflow-x-auto
- [ ] Badges de estado con los colores canónicos
- [ ] Botón primary en `bg-crimson-500`
- [ ] Permisos con renderizado condicional (no disabled)
- [ ] Zero console.logs
- [ ] Colores solo de la paleta ink/crimson/warm
- [ ] Si es Dialog o Sheet: título usa font-serif con palabra accent italic + punto final
- [ ] Si es Dialog o Sheet: NO tiene emoji decorativo en el título
