
# Plan: Flujo Completo de Pagos y Créditos entre OCs

## Resumen de la Lógica Requerida

### Flujo Contra Entrega
1. OC creada → columna Pago muestra "🚚 Contra Entrega"
2. OC completada (recibida) → aparece botón **"Ir a Pago"** 
3. Click en "Ir a Pago" → navega a pestaña **Adeudos** con la OC seleccionada
4. Procesar pago → se archiva la OC

### Flujo Pago Anticipado
1. OC creada → columna Pago muestra **"Ir a Pago"** inmediatamente
2. Click → navega a Adeudos, muestra bultos × precio = total
3. Pago procesado → columna cambia a **"💳 Pagada"**
4. Programación de entregas es independiente
5. Todas las entregas completadas → OC se archiva

### Faltantes/Devoluciones en Anticipado
1. Entrega incompleta (1200 vs 1199) → **"Entrega Incompleta"**
2. Notificar proveedor solicitando reembolso o reposición
3. Si proveedor manda 1201 en siguiente entrega → sistema detecta que es reposición
4. Si proveedor decide descontar → nueva OC incluye línea de **"Crédito a favor"** referenciando la OC original

---

## Cambios Requeridos

### 1. Nueva Tabla: `proveedor_creditos_pendientes`
Registra créditos/reembolsos pendientes por faltantes o devoluciones en OCs anticipadas.

```sql
CREATE TABLE proveedor_creditos_pendientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID REFERENCES proveedores(id),
  proveedor_nombre_manual TEXT, -- Para proveedores sin catálogo
  
  -- Origen del crédito
  orden_compra_origen_id UUID REFERENCES ordenes_compra(id) NOT NULL,
  devolucion_id UUID REFERENCES devoluciones_proveedor(id), -- Si viene de devolución
  entrega_id UUID REFERENCES ordenes_compra_entregas(id), -- Si viene de faltante
  
  -- Detalle
  producto_id UUID REFERENCES productos(id),
  producto_nombre TEXT NOT NULL,
  cantidad NUMERIC NOT NULL,
  precio_unitario NUMERIC NOT NULL,
  monto_total NUMERIC NOT NULL, -- cantidad × precio
  motivo TEXT NOT NULL, -- 'faltante', 'devolucion', 'danado'
  notas TEXT,
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'pendiente', -- pendiente, aplicado, reembolsado, cancelado
  
  -- Resolución
  orden_compra_aplicada_id UUID REFERENCES ordenes_compra(id), -- OC donde se aplicó
  fecha_aplicacion TIMESTAMPTZ,
  tipo_resolucion TEXT, -- 'descuento_oc', 'reembolso_efectivo', 'reposicion_producto'
  resolucion_notas TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Nueva Columna en `ordenes_compra`
Para guardar el monto de créditos aplicados.

```sql
ALTER TABLE ordenes_compra 
ADD COLUMN creditos_aplicados NUMERIC DEFAULT 0,
ADD COLUMN creditos_aplicados_detalle JSONB; -- [{credito_id, monto, producto, oc_origen_folio}]
```

---

### 3. Modificar Columna de Pago en `OrdenesCompraTab.tsx`

**Líneas ~1775-1867** - Cambiar la lógica para incluir "Ir a Pago":

| Tipo Pago | Estado OC | Estado Pago | Se muestra |
|-----------|-----------|-------------|------------|
| Anticipado | autorizada | pendiente | **"Ir a Pago"** (botón que navega a Adeudos) |
| Anticipado | cualquiera | pagado | **"💳 Pagada"** |
| Contra Entrega | pendiente/parcial | pendiente | "🚚 Contra Entrega" (sin botón) |
| Contra Entrega | completada/recibida | pendiente | **"Ir a Pago"** (botón que navega a Adeudos) |
| Contra Entrega | cualquiera | pagado | **"✓ Pagado"** |

```typescript
// Nuevo comportamiento para columna Pago
{orden.tipo_pago === 'anticipado' ? (
  orden.status_pago === 'pagado' ? (
    <Badge className="bg-green-100 text-green-700">💳 Pagada</Badge>
  ) : (
    <Button 
      size="sm" 
      variant="outline"
      className="text-primary"
      onClick={() => navegarAAdeudos(orden.id)}
    >
      <ExternalLink className="h-3 w-3 mr-1" />
      Ir a Pago
    </Button>
  )
) : (
  // Contra Entrega
  orden.status_pago === 'pagado' ? (
    <Badge className="bg-green-100 text-green-700">✓ Pagado</Badge>
  ) : (orden.status === 'completada' || orden.status === 'recibida' || orden.status === 'parcial') ? (
    <Button 
      size="sm" 
      variant="outline"
      className="text-primary"
      onClick={() => navegarAAdeudos(orden.id)}
    >
      <ExternalLink className="h-3 w-3 mr-1" />
      Ir a Pago
    </Button>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      🚚 Contra Entrega
    </Badge>
  )
)}
```

### 4. Navegación a Adeudos con OC Preseleccionada

En `OrdenesCompraTab.tsx`, agregar función de navegación:

```typescript
const navigate = useNavigate();

const navegarAAdeudos = (ordenId: string) => {
  // Cambiar a pestaña Adeudos con parámetro de OC
  navigate('/compras?tab=adeudos&oc=' + ordenId);
};
```

En `Compras.tsx` y `AdeudosProveedoresTab.tsx`:
- Leer el parámetro `?oc=` y auto-seleccionar esa OC
- Abrir automáticamente el diálogo de pago

---

### 5. Detectar Faltantes en Entregas de Pago Anticipado

En `AlmacenRecepcionSheet.tsx`, cuando una OC es `tipo_pago === 'anticipado'` y hay faltante:

1. Registrar el faltante en `proveedor_creditos_pendientes`
2. Notificar al proveedor con Edge Function `notificar-faltante-anticipado`
3. Solicitar explícitamente reembolso o reposición

```typescript
// Al completar recepción con faltante en OC anticipada
if (ordenCompra.tipo_pago === 'anticipado') {
  for (const faltante of productosFaltantes) {
    await supabase.from('proveedor_creditos_pendientes').insert({
      proveedor_id: ordenCompra.proveedor_id,
      orden_compra_origen_id: ordenCompra.id,
      producto_id: faltante.producto_id,
      producto_nombre: faltante.nombre,
      cantidad: faltante.cantidad_faltante,
      precio_unitario: faltante.precio,
      monto_total: faltante.cantidad_faltante * faltante.precio,
      motivo: 'faltante',
      status: 'pendiente'
    });
  }
  
  // Notificar proveedor
  await supabase.functions.invoke('notificar-faltante-anticipado', {
    body: { 
      orden_compra_id: ordenCompra.id,
      faltantes: productosFaltantes
    }
  });
}
```

---

### 6. Aplicar Créditos en Nueva OC

En `CrearOrdenCompraWizard.tsx`:

1. Al seleccionar proveedor, verificar si tiene créditos pendientes
2. Mostrar sección **"Créditos a Favor"** con los pendientes
3. Permitir seleccionar cuáles aplicar
4. Descontar del total de la nueva OC

```typescript
// Query para créditos pendientes del proveedor
const { data: creditosPendientes } = useQuery({
  queryKey: ['creditos-pendientes', proveedorId],
  queryFn: async () => {
    const { data } = await supabase
      .from('proveedor_creditos_pendientes')
      .select('*, ordenes_compra:orden_compra_origen_id(folio)')
      .eq('proveedor_id', proveedorId)
      .eq('status', 'pendiente');
    return data || [];
  },
  enabled: !!proveedorId
});
```

**UI en el Wizard:**
```text
┌─────────────────────────────────────────────────────────────────┐
│ 💰 Créditos Pendientes de este Proveedor                        │
├─────────────────────────────────────────────────────────────────┤
│ ☐ OC-202501-0005 | 1 bulto Azúcar | $2,000 | Faltante           │
│ ☐ OC-202501-0003 | 2 bultos Sal | $500 | Devolución             │
├─────────────────────────────────────────────────────────────────┤
│ Total créditos seleccionados: $2,500                            │
│                                                                 │
│ Subtotal OC:        $100,000                                    │
│ (-) Créditos:       -$2,500                                     │
│ Total a Pagar:      $97,500                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

### 7. Edge Function: `notificar-faltante-anticipado`

Envía email al proveedor notificando faltante en OC ya pagada y solicitando resolución:

```typescript
// supabase/functions/notificar-faltante-anticipado/index.ts

const emailBody = `
  <h2>Notificación de Faltante en Orden Pagada</h2>
  <p>La siguiente orden de compra <strong>${folio}</strong> fue pagada anticipadamente,
  pero la entrega recibida presenta faltantes:</p>
  
  <table>
    <tr><th>Producto</th><th>Cantidad Faltante</th><th>Valor</th></tr>
    ${faltantes.map(f => `
      <tr>
        <td>${f.nombre}</td>
        <td>${f.cantidad}</td>
        <td>$${f.monto.toLocaleString()}</td>
      </tr>
    `).join('')}
  </table>
  
  <p><strong>Total pendiente: $${totalFaltantes.toLocaleString()}</strong></p>
  
  <p>Por favor indique cómo procederá:</p>
  <ul>
    <li>Reembolso del monto</li>
    <li>Reposición en siguiente entrega</li>
    <li>Aplicar como crédito en próxima orden</li>
  </ul>
`;
```

---

### 8. Panel de Créditos Pendientes

Nueva sub-pestaña en **Devoluciones/Faltantes** o sección en **Adeudos**:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 💰 Créditos Pendientes por Cobrar                                    │
├────────────────────────────────────────────────────────────────────┤
│ Proveedor          │ OC Origen  │ Producto │ Monto  │ Acciones     │
│ JOSAN de México    │ OC-202501-5│ Azúcar   │ $2,000 │ [Aplicar ▼]  │
│ Granos del Norte   │ OC-202501-3│ Sal      │ $500   │ [Aplicar ▼]  │
├─────────────────────────────────────────────────────────────────────┤
│                                 Total: $2,500                       │
└─────────────────────────────────────────────────────────────────────┘

Menú "Aplicar":
- Crear nueva OC con descuento
- Marcar como reembolsado
- Marcar como repuesto (recibido en otra entrega)
- Cancelar
```

---

## Flujo Visual Completo

```text
                    ┌─────────────────────────┐
                    │     CREAR OC            │
                    │ (Anticipado o Normal)   │
                    └───────────┬─────────────┘
                                │
           ┌────────────────────┴────────────────────┐
           │                                         │
           ▼                                         ▼
   ┌───────────────────┐                  ┌───────────────────┐
   │ PAGO ANTICIPADO   │                  │ CONTRA ENTREGA    │
   │ "Ir a Pago" ──────┼──┐               │ "🚚 Esperando"    │
   └───────────────────┘  │               └─────────┬─────────┘
                          │                         │
                          ▼                         │
               ┌──────────────────┐                 │
               │  Pestaña ADEUDOS │                 │
               │  Procesar Pago   │                 │
               └────────┬─────────┘                 │
                        │                           │
                        ▼                           │
               ┌──────────────────┐                 │
               │ "💳 Pagada"      │                 │
               │ (esperando       │                 │
               │  entregas)       │                 │
               └────────┬─────────┘                 │
                        │                           │
        ┌───────────────┴───────────────┐           │
        │                               │           │
        ▼                               ▼           │
 ┌─────────────┐               ┌─────────────┐      │
 │ Entrega OK  │               │ Entrega con │      │
 │ Completa    │               │ FALTANTE    │      │
 └──────┬──────┘               └──────┬──────┘      │
        │                             │             │
        │                             ▼             │
        │               ┌─────────────────────────┐ │
        │               │ Registrar Crédito       │ │
        │               │ + Notificar Proveedor   │ │
        │               └───────────┬─────────────┘ │
        │                           │               │
        │         ┌─────────────────┼───────────────┤
        │         │                 │               │
        │         ▼                 ▼               ▼
        │  ┌────────────┐   ┌────────────┐  ┌─────────────────┐
        │  │ Proveedor  │   │ Proveedor  │  │ RECEPCIÓN       │
        │  │ reembolsa  │   │ repone en  │  │ OC completada   │
        │  │            │   │ siguiente  │  │ "Ir a Pago" ────┼──┐
        │  └──────┬─────┘   └──────┬─────┘  └─────────────────┘  │
        │         │                │                              │
        │         ▼                ▼                              ▼
        │  ┌────────────┐   ┌────────────┐              ┌─────────────────┐
        │  │ Marcar     │   │ 1201 bultos│              │  Pestaña ADEUDOS│
        │  │ reembolsado│   │ detecta    │              │  Procesar Pago  │
        │  └────────────┘   │ reposición │              └────────┬────────┘
        │                   └──────┬─────┘                       │
        │                          │                             │
        │  ┌───────────────────────┘                             │
        │  │                                                     │
        │  ▼                                                     ▼
        │  ┌──────────────────────────────────┐        ┌─────────────────┐
        │  │ Próxima OC del proveedor         │        │ "✓ Pagado"      │
        │  │ + línea "Crédito OC-XXX: -$2000" │        └────────┬────────┘
        │  └──────────────────────────────────┘                 │
        │                                                       │
        └─────────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │ TODAS ENTREGAS   │
                        │ COMPLETADAS +    │
                        │ PAGADO           │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │    ARCHIVADA     │
                        └──────────────────┘
```

---

## Archivos a Crear/Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/` | Nueva tabla `proveedor_creditos_pendientes` |
| `supabase/migrations/` | Columnas `creditos_aplicados` en `ordenes_compra` |
| `OrdenesCompraTab.tsx` | Cambiar columna Pago con "Ir a Pago" |
| `Compras.tsx` | Leer parámetro `?tab=adeudos&oc=X` |
| `AdeudosProveedoresTab.tsx` | Auto-seleccionar OC de URL |
| `CrearOrdenCompraWizard.tsx` | Sección créditos pendientes del proveedor |
| `AlmacenRecepcionSheet.tsx` | Registrar crédito en OC anticipada con faltante |
| `supabase/functions/notificar-faltante-anticipado/` | Nueva Edge Function |
| `CreditosPendientesTab.tsx` | Nuevo componente para gestionar créditos |

---

## Consideraciones Técnicas

### Detección de Reposición (1201 en lugar de 1200)
El sistema puede detectar cuando una entrega tiene **más** cantidad que la esperada y:
1. Verificar si hay créditos pendientes del mismo producto/proveedor
2. Mostrar diálogo preguntando si es reposición de faltante anterior
3. Si sí, marcar el crédito como `status: 'repuesto'`

### Archivado Correcto
La lógica `esOCArchivada()` ya verifica:
- `status === 'cerrada' || status === 'cancelada'`
- `status === 'completada' && status_pago === 'pagado'`

Esto cubre ambos flujos correctamente.
