
# Plan: Adaptar Modulo de Correos para Desktop Estilo Gmail

## Problema Identificado
1. **Espacio blanco inferior**: La lista de correos tiene un `max-h-[700px]` que limita su altura, dejando un area grande sin utilizar en pantallas grandes.
2. **Layout de una sola vista**: Actualmente, al seleccionar un correo, se reemplaza toda la pantalla con el detalle. Gmail desktop muestra lista + detalle lado a lado.

---

## Solucion Propuesta: Layout de Dos Paneles (Gmail Desktop)

### Arquitectura Visual
```text
+------------------+--------------------------------+
|                  |                                |
|   LISTA DE       |    DETALLE DEL CORREO         |
|   CORREOS        |    (Vista previa)              |
|                  |                                |
|   - Correo 1     |    De: remitente@email.com    |
|   - Correo 2 *   |    Asunto: Re: Pedido...      |
|   - Correo 3     |                                |
|   - Correo 4     |    [Cuerpo del mensaje]       |
|   ...            |                                |
|                  |    [Adjuntos]                  |
|   [Cargar mas]   |    [Responder] [Eliminar]      |
|                  |                                |
+------------------+--------------------------------+
     ~35-40%                   ~60-65%
```

### Cambios Principales

1. **Eliminar limite de altura** en `EmailListView.tsx`
   - Remover `max-h-[700px]` para que la lista ocupe todo el espacio vertical disponible
   - Usar altura dinamica con `h-full` o `flex-1`

2. **Implementar layout de dos columnas** en `BandejaEntrada.tsx`
   - En desktop, mostrar lista y detalle simultaneamente
   - La lista ocupara ~35% del ancho, el detalle ~65%
   - Solo en movil se mantendra el comportamiento actual (una vista a la vez)

3. **Ajustar `EmailDetailView.tsx`** para modo incrustado
   - Crear variante sin header redundante cuando esta embebido en el panel derecho
   - Mantener botones de accion pero compactar el layout

---

## Detalles Tecnicos

### 1. `EmailListView.tsx` - Corregir altura

**Antes:**
```tsx
<ScrollArea className="h-[calc(100vh-280px)] min-h-[300px] max-h-[700px]">
```

**Despues:**
```tsx
<ScrollArea className="h-[calc(100vh-280px)] min-h-[300px]">
```

### 2. `BandejaEntrada.tsx` - Layout de dos paneles

**Nuevo layout desktop:**
```tsx
// En desktop, mostrar lista + detalle lado a lado
return (
  <div className="flex h-[calc(100vh-200px)] gap-4 overflow-hidden">
    {/* Panel izquierdo: Lista de correos */}
    <div className={cn(
      "overflow-hidden flex flex-col",
      selectedEmailId ? "w-[400px] flex-shrink-0" : "flex-1"
    )}>
      <EmailListView 
        emails={filteredEmails} 
        selectedEmailId={selectedEmailId}  // Para resaltar el seleccionado
        ... 
      />
    </div>
    
    {/* Panel derecho: Detalle del correo */}
    {selectedEmailId && emailDetail && (
      <div className="flex-1 overflow-hidden">
        <EmailDetailView 
          email={emailDetail}
          embedded={true}  // Modo compacto sin header duplicado
          ...
        />
      </div>
    )}
    
    {/* Estado vacio cuando no hay seleccion */}
    {!selectedEmailId && (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>Selecciona un correo para ver su contenido</p>
        </div>
      </div>
    )}
  </div>
);
```

### 3. `EmailDetailView.tsx` - Modo embebido

**Nueva prop:**
```tsx
interface EmailDetailViewProps {
  // ... props existentes
  embedded?: boolean; // Para modo panel lateral sin header completo
}
```

**Adaptaciones:**
- Ocultar boton "Volver" cuando `embedded={true}` (innecesario, el usuario hace clic en otro correo)
- Reducir padding del header
- Mantener acciones de responder/eliminar visibles

### 4. Resaltar correo seleccionado en la lista

Agregar prop `selectedEmailId` a `EmailListView` para aplicar estilo de seleccion:

```tsx
<div className={cn(
  "hover:bg-muted/50 transition-colors",
  email.id === selectedEmailId && "bg-primary/10 border-l-2 border-primary"
)}>
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/correos/EmailListView.tsx` | Quitar `max-h-[700px]`, agregar prop `selectedEmailId`, estilo de seleccion |
| `src/components/correos/BandejaEntrada.tsx` | Layout de dos columnas en desktop, pasar `selectedEmailId` a lista |
| `src/components/correos/EmailDetailView.tsx` | Nueva prop `embedded` para modo panel sin header "Volver" |

---

## Comportamiento por Dispositivo

| Dispositivo | Comportamiento |
|-------------|----------------|
| **Desktop (>1024px)** | Dos paneles lado a lado. Lista + Detalle simultaneos |
| **Tablet (768-1024px)** | Similar a desktop pero con lista mas estrecha (~300px) |
| **Movil (<768px)** | Comportamiento actual: una vista a la vez con transicion |

---

## Beneficios

1. **Elimina espacio blanco**: La lista ocupa todo el alto disponible
2. **Navegacion rapida**: Sin necesidad de "Volver" - clic directo en otro correo
3. **Contexto visual**: Siempre ves la lista de correos mientras lees uno
4. **Experiencia Gmail**: Familiar para usuarios de correo web
5. **Retrocompatibilidad**: Movil mantiene el flujo actual

---

## Resultado Esperado

En desktop, el modulo de correos se vera exactamente como Gmail web:
- Lista de correos a la izquierda con scroll independiente
- Detalle del correo a la derecha ocupando el espacio restante
- Correo seleccionado resaltado en la lista
- Sin espacios blancos desperdiciados
- Navegacion fluida sin necesidad de retroceder
