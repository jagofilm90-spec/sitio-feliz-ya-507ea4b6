
# Plan: Mejoras al Panel de Llegada Anticipada

## Resumen de Cambios

Se implementarán tres mejoras al sistema de llegadas anticipadas:

1. **Abrir panel automáticamente** cuando no hay entregas programadas para hoy
2. **Agregar diálogo de confirmación** antes de forzar una llegada anticipada
3. **Mostrar badge "Anticipada"** en entregas que fueron forzadas desde el panel

---

## Cambio 1: Auto-expandir Panel Cuando No Hay Entregas

### Archivo: `src/components/almacen/BusquedaLlegadaAnticipada.tsx`

Agregar prop `defaultOpen` para controlar el estado inicial:

```typescript
interface BusquedaLlegadaAnticipadaProps {
  onEntregaReprogramada: () => void;
  defaultOpen?: boolean;  // Nueva prop
}

export const BusquedaLlegadaAnticipada = ({ 
  onEntregaReprogramada, 
  defaultOpen = false  // Default cerrado
}: BusquedaLlegadaAnticipadaProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  // ...
};
```

### Archivo: `src/components/almacen/AlmacenRecepcionTab.tsx`

Pasar `defaultOpen={true}` cuando la lista está vacía:

```typescript
// En el return cuando entregas.length === 0
<BusquedaLlegadaAnticipada 
  onEntregaReprogramada={loadEntregas} 
  defaultOpen={true}  // <-- Agregar
/>
```

---

## Cambio 2: Diálogo de Confirmación

### Archivo: `src/components/almacen/BusquedaLlegadaAnticipada.tsx`

Agregar estado y componente AlertDialog para confirmar antes de forzar:

**Nuevo estado:**
```typescript
const [confirmandoEntrega, setConfirmandoEntrega] = useState<EntregaFutura | null>(null);
```

**Modificar el botón para abrir diálogo en vez de ejecutar directamente:**
```typescript
<Button
  onClick={() => setConfirmandoEntrega(entrega)}  // Antes: handleForzarLlegadaAnticipada(entrega)
  // ...
>
  Llegó antes, registrar
</Button>
```

**Agregar AlertDialog al final del componente:**
```typescript
<AlertDialog open={!!confirmandoEntrega} onOpenChange={(open) => !open && setConfirmandoEntrega(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-amber-600" />
        Confirmar llegada anticipada
      </AlertDialogTitle>
      <AlertDialogDescription>
        Esta entrega de <strong>{proveedorNombre}</strong> estaba 
        programada para el <strong>{fechaOriginal}</strong>.
        <br /><br />
        Al confirmar:
        <ul className="list-disc ml-4 mt-2 space-y-1">
          <li>La fecha se actualizará a hoy</li>
          <li>Se guardará una nota con la fecha original</li>
          <li>Aparecerá en la lista principal para registrar llegada</li>
        </ul>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={() => handleForzarLlegadaAnticipada(confirmandoEntrega!)}>
        Sí, llegó antes
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Cambio 3: Badge "Anticipada" en Entregas Forzadas

### Detección de Llegada Anticipada

Se utilizará el campo `notas` que ya contiene el texto "Llegada anticipada - originalmente para..." para detectar entregas forzadas.

### Archivo: `src/components/almacen/AlmacenRecepcionTab.tsx`

**En el componente EntregaCard, agregar badge cuando las notas contengan "Llegada anticipada":**

```typescript
// Dentro de EntregaCard, después de la línea del otroUsuarioTrabajando
const esLlegadaAnticipada = entrega.notas?.includes("Llegada anticipada");
```

**Agregar el badge visual junto a los otros badges (cerca de línea 793):**

```typescript
{/* Línea 1: Proveedor + Cantidad */}
<div className="flex items-center justify-between gap-2">
  <div className="flex items-center gap-2">
    <span className="font-semibold text-lg truncate">
      {proveedorNombre}
    </span>
    {/* Badge de llegada anticipada */}
    {esLlegadaAnticipada && (
      <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600 dark:text-amber-400">
        <Clock className="w-3 h-3" />
        Anticipada
      </Badge>
    )}
  </div>
  <Badge className="text-base font-bold bg-primary text-primary-foreground flex-shrink-0">
    {entrega.cantidad_bultos.toLocaleString()} bultos
  </Badge>
</div>
```

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/almacen/BusquedaLlegadaAnticipada.tsx` | Prop `defaultOpen`, estado `confirmandoEntrega`, AlertDialog de confirmación |
| `src/components/almacen/AlmacenRecepcionTab.tsx` | Pasar `defaultOpen={true}` cuando lista vacía, agregar badge "Anticipada" en EntregaCard |

---

## Resultado Esperado

### Escenario 1: No hay entregas para hoy
- El panel "¿Llegó una entrega antes de tiempo?" se abre automáticamente
- El almacenista ve inmediatamente las OCs de los próximos 7 días

### Escenario 2: Forzar llegada anticipada
- Al presionar "Llegó antes, registrar", aparece diálogo de confirmación
- Muestra proveedor, fecha original, y qué pasará
- Solo al confirmar se ejecuta la reprogramación

### Escenario 3: Entrega forzada aparece en lista principal
- La entrega aparece con badge "Anticipada" junto al nombre del proveedor
- Badge con icono de reloj y color ámbar
- Las notas contienen la fecha original para trazabilidad
