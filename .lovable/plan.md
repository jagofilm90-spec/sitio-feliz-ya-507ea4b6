
# Plan: Sistema de Plazos de Crédito Flexible por Pedido

## Resumen

Implementar un sistema donde el vendedor pueda elegir libremente el plazo de crédito al crear cada pedido, con opciones de **Contado, 8 días, 15 días, 30 días y 60 días**. El plazo comenzará a contar desde la **fecha de entrega real**, no desde la creación del pedido.

## Indicadores Visuales

| Etapa del Pedido | Indicador |
|------------------|-----------|
| Pedido creado pero NO entregado | Mostrar "X días desde creación" en color naranja |
| Pedido entregado, plazo vigente | Mostrar "Vence en X días" en color verde |
| Pedido entregado, plazo vencido | Mostrar "X días de atraso" en color rojo |
| Pedido pagado | Mostrar "Pagado" en color gris |

## Ejemplo del Usuario

| Evento | Fecha | Indicador |
|--------|-------|-----------|
| Pedido creado (8 días crédito) | 1 Feb 2026 | "0 días desde creación" |
| Pedido sin entregar | 11 Feb 2026 | "10 días desde creación" (naranja) |
| Pedido entregado | 11 Feb 2026 | Fecha vencimiento = 19 Feb 2026 |
| Sin pago registrado | 19 Feb 2026 | "Vence hoy" (amarillo) |
| Sin pago, vencido | 1 Mar 2026 | "10 días de atraso" (rojo) |

---

## Cambios Técnicos

### 1. Base de Datos

**Agregar opción 60_dias al enum credit_term:**
```sql
ALTER TYPE credit_term ADD VALUE '60_dias';
```

**Agregar columna fecha_entrega_real a tabla pedidos:**
```sql
ALTER TABLE pedidos 
ADD COLUMN fecha_entrega_real TIMESTAMP WITH TIME ZONE DEFAULT NULL;
```

Esta columna se actualizará automáticamente cuando el chofer registre la entrega.

### 2. Actualizar Trigger de Entrega

Crear un trigger que, cuando una entrega se marque como `entregado = true`, actualice `pedidos.fecha_entrega_real` con la fecha de entrega.

```sql
CREATE OR REPLACE FUNCTION sync_pedido_fecha_entrega()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entregado = true AND OLD.entregado = false THEN
    UPDATE pedidos 
    SET fecha_entrega_real = COALESCE(NEW.fecha_entrega, NOW()),
        status = 'entregado'
    WHERE id = NEW.pedido_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_fecha_entrega
AFTER UPDATE ON entregas
FOR EACH ROW
EXECUTE FUNCTION sync_pedido_fecha_entrega();
```

### 3. Función Auxiliar para Cálculos de Crédito

Crear función utilitaria para calcular estados de crédito:

```typescript
// src/lib/creditoUtils.ts

export const CREDITO_DIAS: Record<string, number> = {
  'contado': 0,
  '8_dias': 8,
  '15_dias': 15,
  '30_dias': 30,
  '60_dias': 60
};

export const CREDITO_LABELS: Record<string, string> = {
  'contado': 'Contado',
  '8_dias': '8 días',
  '15_dias': '15 días',
  '30_dias': '30 días',
  '60_dias': '60 días'
};

export interface EstadoCredito {
  tipo: 'no_entregado' | 'vigente' | 'por_vencer' | 'vencido' | 'pagado' | 'contado';
  diasDesdeCreacion: number;
  diasParaVencer: number | null;  // null si no entregado
  diasAtraso: number;
  fechaVencimiento: Date | null;
  color: 'gray' | 'orange' | 'green' | 'yellow' | 'red';
  mensaje: string;
}

export function calcularEstadoCredito(params: {
  terminoCredito: string;
  fechaCreacion: Date;
  fechaEntregaReal: Date | null;
  pagado: boolean;
}): EstadoCredito {
  const { terminoCredito, fechaCreacion, fechaEntregaReal, pagado } = params;
  const hoy = new Date();
  
  // Días desde creación
  const diasDesdeCreacion = Math.floor(
    (hoy.getTime() - fechaCreacion.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Si ya está pagado
  if (pagado) {
    return {
      tipo: 'pagado',
      diasDesdeCreacion,
      diasParaVencer: null,
      diasAtraso: 0,
      fechaVencimiento: null,
      color: 'gray',
      mensaje: 'Pagado'
    };
  }
  
  // Si es contado
  if (terminoCredito === 'contado') {
    return {
      tipo: 'contado',
      diasDesdeCreacion,
      diasParaVencer: 0,
      diasAtraso: fechaEntregaReal ? diasDesdeCreacion : 0,
      fechaVencimiento: fechaEntregaReal,
      color: fechaEntregaReal && diasDesdeCreacion > 0 ? 'red' : 'gray',
      mensaje: fechaEntregaReal ? 'Cobrar al entregar' : 'Contado'
    };
  }
  
  // Si no está entregado
  if (!fechaEntregaReal) {
    return {
      tipo: 'no_entregado',
      diasDesdeCreacion,
      diasParaVencer: null,
      diasAtraso: 0,
      fechaVencimiento: null,
      color: diasDesdeCreacion > 7 ? 'orange' : 'gray',
      mensaje: `${diasDesdeCreacion} días desde creación`
    };
  }
  
  // Calcular fecha de vencimiento
  const diasCredito = CREDITO_DIAS[terminoCredito] || 30;
  const fechaVencimiento = new Date(fechaEntregaReal);
  fechaVencimiento.setDate(fechaVencimiento.getDate() + diasCredito);
  
  const diasParaVencer = Math.floor(
    (fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (diasParaVencer < 0) {
    // Vencido
    return {
      tipo: 'vencido',
      diasDesdeCreacion,
      diasParaVencer,
      diasAtraso: Math.abs(diasParaVencer),
      fechaVencimiento,
      color: 'red',
      mensaje: `${Math.abs(diasParaVencer)} días de atraso`
    };
  } else if (diasParaVencer <= 3) {
    // Por vencer
    return {
      tipo: 'por_vencer',
      diasDesdeCreacion,
      diasParaVencer,
      diasAtraso: 0,
      fechaVencimiento,
      color: 'yellow',
      mensaje: diasParaVencer === 0 ? 'Vence hoy' : `Vence en ${diasParaVencer} días`
    };
  } else {
    // Vigente
    return {
      tipo: 'vigente',
      diasDesdeCreacion,
      diasParaVencer,
      diasAtraso: 0,
      fechaVencimiento,
      color: 'green',
      mensaje: `Vence en ${diasParaVencer} días`
    };
  }
}
```

### 4. Componente Visual de Estado de Crédito

```typescript
// src/components/pedidos/CreditoStatusBadge.tsx

export function CreditoStatusBadge({ 
  terminoCredito,
  fechaCreacion,
  fechaEntregaReal,
  pagado 
}: Props) {
  const estado = calcularEstadoCredito({
    terminoCredito,
    fechaCreacion: new Date(fechaCreacion),
    fechaEntregaReal: fechaEntregaReal ? new Date(fechaEntregaReal) : null,
    pagado
  });
  
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-700',
    orange: 'bg-orange-100 text-orange-700 border-orange-300',
    green: 'bg-green-100 text-green-700 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    red: 'bg-red-100 text-red-700 border-red-300'
  };
  
  return (
    <Badge className={colorClasses[estado.color]}>
      {estado.mensaje}
    </Badge>
  );
}
```

### 5. Actualizar Formulario de Nuevo Pedido (Vendedor)

Modificar `VendedorNuevoPedidoTab.tsx` para mostrar las 5 opciones de crédito con descripciones claras:

```typescript
<Select value={terminoCredito} onValueChange={setTerminoCredito}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="contado">
      Contado - Pago al entregar
    </SelectItem>
    <SelectItem value="8_dias">
      8 días - Vence 8 días después de entrega
    </SelectItem>
    <SelectItem value="15_dias">
      15 días - Vence 15 días después de entrega
    </SelectItem>
    <SelectItem value="30_dias">
      30 días - Vence 30 días después de entrega
    </SelectItem>
    <SelectItem value="60_dias">
      60 días - Vence 60 días después de entrega
    </SelectItem>
  </SelectContent>
</Select>
```

### 6. Actualizar Vistas de Pedidos

Agregar el badge de estado de crédito en:
- Lista de pedidos del vendedor (`VendedorMisVentasTab`)
- Detalle del pedido (`PedidoDetalleDialog`)
- Tab de cobranza (`VendedorCobranzaTab`)

### 7. Actualizar Generación de Facturas

Modificar la lógica de generación de facturas para calcular `fecha_vencimiento` basándose en:
- `pedidos.fecha_entrega_real` + días del `termino_credito`

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| Base de datos | Agregar `60_dias` al enum, columna `fecha_entrega_real` |
| `src/lib/creditoUtils.ts` | Nueva función de cálculos |
| `src/components/pedidos/CreditoStatusBadge.tsx` | Nuevo componente visual |
| `src/components/vendedor/VendedorNuevoPedidoTab.tsx` | Agregar selector de 5 opciones |
| `src/components/vendedor/VendedorMisVentasTab.tsx` | Mostrar badge de estado |
| `src/components/pedidos/PedidoDetalleDialog.tsx` | Mostrar badge de estado |
| `src/components/vendedor/VendedorCobranzaTab.tsx` | Integrar nueva lógica |
| `src/components/chofer/RegistrarEntregaSheet.tsx` | Sincronizar fecha entrega |

---

## Flujo Completo

```text
┌─────────────────────┐
│ Vendedor crea       │
│ pedido con crédito  │──► termino_credito = "8_dias"
│ (ej: 8 días)        │    fecha_pedido = 1 Feb
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ Pedido en espera    │
│ de entrega          │──► Indicador: "10 días desde creación" (naranja)
│                     │    (si pasan 10 días sin entregar)
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ Chofer registra     │
│ entrega             │──► fecha_entrega_real = 11 Feb
│                     │    Trigger actualiza pedido
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ Plazo activo        │
│                     │──► fecha_vencimiento = 19 Feb (11 Feb + 8 días)
│                     │    Indicador: "Vence en 8 días" (verde)
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ Si vence sin pago   │
│                     │──► Indicador: "10 días de atraso" (rojo)
│                     │    (si llegamos a 1 Mar sin pagar)
└─────────────────────┘
```

## Consideraciones

- **Migración de datos**: Los pedidos existentes sin `fecha_entrega_real` seguirán mostrando "días desde creación"
- **Contado**: Se marca como "Cobrar al entregar" y si pasan días después de entrega, se muestra atraso
- **Compatibilidad**: El selector preselecciona el término de crédito del cliente, pero el vendedor puede cambiarlo
