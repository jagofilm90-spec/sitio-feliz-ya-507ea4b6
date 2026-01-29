

# Plan: Corregir Columna de Recepción para Múltiples Entregas

## Problema Identificado

Encontré **2 problemas** en el código:

### Problema 1: Status incorrecto
El código filtra por `status === 'completada'`, pero en la base de datos las entregas finalizadas tienen `status = 'recibida'`:

```text
OC-202601-0002 (Envolapan):
├── Entrega 1: status='recibida', finalizada 2026-01-23
└── Entrega 2: status='recibida', finalizada 2026-01-26
```

**Por eso muestra "-"** - ninguna entrega tiene status `'completada'`.

### Problema 2: Solo muestra una recepción
El código actual usa `.find()` que solo devuelve la primera:
```typescript
const completada = orden.entregas.find(e => e.status === 'completada');
```

Cuando hay 2+ recepciones (entregas parciales), deberían mostrarse todas.

---

## Solución Propuesta

### Cambio 1: Corregir el filtro de status

**De:**
```typescript
orden.entregas?.filter(e => e.status === 'completada')
```

**A:**
```typescript
orden.entregas?.filter(e => e.status === 'recibida')
```

### Cambio 2: Mostrar múltiples recepciones con Popover

Cuando hay más de una entrega recibida, mostrar un botón que despliegue un menú con todas las recepciones disponibles:

```text
┌─────────────────────────────────┐
│ Recepción                       │
├─────────────────────────────────┤
│ [Ver 2 ▼]                       │  ← Botón con contador
│   ├── Recepción #1 - 23/01      │  ← Click abre dialog
│   └── Recepción #2 - 26/01      │  ← Click abre dialog
└─────────────────────────────────┘
```

---

## Implementación Detallada

### Archivo: `src/components/compras/AdeudosProveedoresTab.tsx`

**1. Agregar import de Popover:**
```typescript
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
```

**2. Reemplazar la celda de Recepción (líneas 526-548):**

```typescript
<TableCell>
  {(() => {
    const recibidas = orden.entregas?.filter(e => e.status === 'recibida') || [];
    
    if (recibidas.length === 0) {
      return orden.tipo_pago === 'anticipado' 
        ? <span className="text-xs text-muted-foreground">N/A</span>
        : <span className="text-xs text-muted-foreground">-</span>;
    }
    
    if (recibidas.length === 1) {
      // Una sola recepción: botón directo
      return (
        <Button
          size="sm"
          variant="ghost"
          className="text-primary"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEntregaId(recibidas[0].id);
            setShowRecepcionDialog(true);
          }}
        >
          <FileText className="h-3 w-3 mr-1" />
          Ver
        </Button>
      );
    }
    
    // Múltiples recepciones: mostrar popover con lista
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="text-primary">
            <FileText className="h-3 w-3 mr-1" />
            Ver {recibidas.length}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            {recibidas.map((entrega) => (
              <Button
                key={entrega.id}
                size="sm"
                variant="ghost"
                className="w-full justify-start text-xs"
                onClick={() => {
                  setSelectedEntregaId(entrega.id);
                  setShowRecepcionDialog(true);
                }}
              >
                <FileText className="h-3 w-3 mr-2" />
                Recepción #{entrega.numero_entrega}
                {entrega.recepcion_finalizada_en && (
                  <span className="ml-auto text-muted-foreground">
                    {format(new Date(entrega.recepcion_finalizada_en), 'dd/MM')}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  })()}
</TableCell>
```

**3. Agregar import de ChevronDown:**
```typescript
import { ChevronDown } from "lucide-react";
```

---

## Resultado Visual

### Caso 1: Sin recepciones
```
| Recepción |
|    -      |
```

### Caso 2: Una recepción
```
| Recepción |
| [Ver]     |
```

### Caso 3: Múltiples recepciones (como Envolapan)
```
| Recepción     |
| [Ver 2 ▼]     |  ← Click despliega menú
   ┌────────────────────────┐
   │ 📄 Recepción #1  23/01 │
   │ 📄 Recepción #2  26/01 │
   └────────────────────────┘
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/compras/AdeudosProveedoresTab.tsx` | Corregir status filter, agregar Popover para múltiples recepciones |

## Resumen de Cambios

1. **Cambiar filtro** de `'completada'` a `'recibida'`
2. **Agregar Popover** para listar múltiples recepciones
3. **Mostrar contador** cuando hay más de una recepción
4. **Mostrar fecha** de cada recepción en el menú desplegable

