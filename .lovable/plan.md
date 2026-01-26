
# Plan: Optimizar Uso de Espacio y Agregar Modo Solo Lista

## Problemas Identificados

1. **Espacio blanco inferior**: La lista de correos no ocupa todo el espacio vertical disponible porque la cadena de `flex-1` y `h-full` no se propaga correctamente desde el contenedor principal hasta el `ScrollArea`.

2. **Layout forzado de dos paneles**: Actualmente siempre se muestra el panel derecho (ya sea con el correo seleccionado o con el placeholder "Selecciona un correo"). El usuario quiere la opción de ver solo la lista ocupando todo el ancho.

---

## Solucion

### Parte 1: Corregir el Espacio en Blanco

El problema está en la propagación de alturas. Necesitamos asegurar que:
- `TabsContent` tenga `h-full` cuando está activo
- `EmailListView` ocupe todo el espacio de su contenedor

**Cambios en `EmailListView.tsx`:**
- El componente `Card` debe tener `h-full` y `flex flex-col`
- El `ScrollArea` debe usar `flex-1` en lugar de solo `h-full`

**Cambios en `BandejaEntrada.tsx`:**
- Asegurar que `TabsContent` propague la altura con `h-full`
- Eliminar el `mt-4` que puede estar causando overflow

### Parte 2: Modo Solo Lista (Opcional)

Agregar un botón toggle para alternar entre:
- **Modo dos paneles** (actual): Lista + Preview lado a lado
- **Modo solo lista**: Lista ocupa todo el ancho, sin preview

El comportamiento sería:
- Toggle visible en la barra de herramientas
- Al hacer clic en un correo en modo solo lista, abre el detalle en pantalla completa (como en móvil)
- Preferencia guardada en `localStorage` para persistir

---

## Cambios Técnicos

### 1. `EmailListView.tsx`

```typescript
// Layout desktop - corregir propagación de altura
return (
  <Card className="overflow-hidden h-full flex flex-col">
    <ScrollArea className="flex-1">
      {/* contenido */}
    </ScrollArea>
  </Card>
);
```

### 2. `BandejaEntrada.tsx`

**Nuevo estado:**
```typescript
const [viewMode, setViewMode] = useState<'split' | 'list-only'>(() => {
  return localStorage.getItem('email-view-mode') as 'split' | 'list-only' || 'split';
});
```

**Toggle en la barra de herramientas:**
```typescript
<Button
  variant={viewMode === 'split' ? 'default' : 'outline'}
  size="sm"
  onClick={() => {
    const newMode = viewMode === 'split' ? 'list-only' : 'split';
    setViewMode(newMode);
    localStorage.setItem('email-view-mode', newMode);
  }}
  title="Cambiar vista"
>
  <Columns className="h-4 w-4" /> // Icono para split
  // o <List className="h-4 w-4" /> para solo lista
</Button>
```

**Layout condicional:**
```typescript
{/* Main content area */}
<div className="flex-1 flex gap-4 overflow-hidden min-h-0">
  {/* Left Panel: Email List */}
  <div className={cn(
    "flex flex-col overflow-hidden h-full",
    // En modo split con correo seleccionado: ancho fijo
    // En modo solo lista: todo el ancho
    viewMode === 'split' && selectedEmailId ? "w-[400px] shrink-0" : "flex-1"
  )}>
    {/* Tabs y EmailListView */}
  </div>

  {/* Right Panel: Solo visible en modo split */}
  {viewMode === 'split' && (
    <>
      {selectedEmailId && emailDetail ? (
        <div className="flex-1 overflow-hidden border rounded-lg">
          {/* EmailDetailView */}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          {/* Placeholder */}
        </div>
      )}
    </>
  )}
</div>
```

**Comportamiento en modo solo lista al hacer clic:**
```typescript
// Si está en modo solo lista, abrir detalle a pantalla completa (como móvil)
if (viewMode === 'list-only' && selectedEmailId && emailDetail) {
  return (
    <EmailDetailView
      email={emailDetail}
      onBack={() => setSelectedEmailId(null)}
      // ... otras props
    />
  );
}
```

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/correos/EmailListView.tsx` | Agregar `flex flex-col` al Card, cambiar `h-full` a `flex-1` en ScrollArea |
| `src/components/correos/BandejaEntrada.tsx` | Agregar estado `viewMode`, botón toggle, lógica condicional de layout |

---

## Flujo de Usuario

1. **Por defecto**: Vista dividida (lista + preview)
2. **Clic en toggle**: Cambia a modo solo lista
3. **En modo solo lista**: 
   - Lista ocupa 100% del ancho
   - Al hacer clic en un correo, se abre a pantalla completa con botón "Volver"
4. **Persistencia**: La preferencia se guarda en `localStorage`

---

## Iconos a Usar

- **Modo split**: `LayoutGrid` o `Columns` de lucide-react
- **Modo solo lista**: `List` o `LayoutList` de lucide-react

---

## Resultado Esperado

1. La lista de correos ocupará todo el espacio vertical sin dejar espacios en blanco
2. El usuario podrá alternar entre vista dividida y solo lista según su preferencia
3. En modo solo lista, la experiencia será similar a la de móvil (vista completa del correo)
4. La preferencia se recordará entre sesiones
