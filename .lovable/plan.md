

# Plan: Archivar OCs Cerradas de la Pestaña Principal

## Situacion Actual

Actualmente la misma OC puede aparecer en múltiples lugares:

```text
                    OC-202601-0003
                         │
    ┌────────────────────┼────────────────────┐
    ▼                    ▼                    ▼
┌─────────┐      ┌───────────────┐     ┌──────────────┐
│ Pestaña │      │   Adeudos     │     │  Historial   │
│   OC    │      │ (pendientes)  │     │  (pagadas)   │
│ SIEMPRE │      │   temporal    │     │  permanente  │
└─────────┘      └───────────────┘     └──────────────┘
```

**Problema**: Después de pagar una OC:
- Desaparece de Adeudos (correcto)
- Aparece en Historial de Pagadas (correcto)
- **Sigue apareciendo en la tabla OC** (innecesario)

## Propuesta de Solución

Agregar un filtro de "status activas" a la pestaña de OCs que, por defecto, oculte las OCs **cerradas** y **completadas+pagadas**:

```text
┌────────────────────────────────────────────────────────────────────┐
│ Órdenes de Compra                              [Nueva Orden]       │
├────────────────────────────────────────────────────────────────────┤
│ 🔍 [Buscar...]     [Mostrar archivadas ○]  ← Toggle OFF default    │
├────────────────────────────────────────────────────────────────────┤
│ OCs activas (en proceso): enviada, parcial, recibida, pendiente   │
└────────────────────────────────────────────────────────────────────┘
```

### Logica de "OC Activa" vs "OC Archivada"

**OC Activa** (visible por defecto):
- `status` en: `borrador`, `pendiente`, `pendiente_autorizacion`, `autorizada`, `pendiente_pago`, `enviada`, `parcial`, `recibida`
- O `status = completada` pero `status_pago != 'pagado'` (aun tiene adeudo)

**OC Archivada** (oculta por defecto):
- `status = cerrada` (ya cerrada financieramente)
- `status = completada` **Y** `status_pago = 'pagado'` (todo recibido y pagado)
- `status = cancelada` o `rechazada` (no proceden)

## Cambios a Realizar

### Archivo: `src/components/compras/OrdenesCompraTab.tsx`

**1. Agregar estado para toggle de archivadas:**
```typescript
const [mostrarArchivadas, setMostrarArchivadas] = useState(false);
```

**2. Agregar logica de filtrado:**
```typescript
const esOCArchivada = (orden: any): boolean => {
  // Cerrada financieramente
  if (orden.status === 'cerrada') return true;
  // Cancelada o rechazada
  if (orden.status === 'cancelada' || orden.status === 'rechazada') return true;
  // Completada Y pagada (todo finalizado)
  if (orden.status === 'completada' && orden.status_pago === 'pagado') return true;
  return false;
};

const filteredOrdenes = ordenes.filter((orden) => {
  // Filtro de busqueda existente
  const matchesSearch = orden.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proveedorNombre?.toLowerCase().includes(searchTerm.toLowerCase());
  
  if (!matchesSearch) return false;
  
  // Filtro de archivadas
  if (!mostrarArchivadas && esOCArchivada(orden)) return false;
  
  return true;
});
```

**3. Agregar toggle en la UI (junto al buscador):**
```typescript
<div className="flex items-center gap-4 mb-4">
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" />
    <Input
      placeholder="Buscar por folio o proveedor..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="pl-10"
    />
  </div>
  
  <div className="flex items-center gap-2">
    <Switch
      id="mostrar-archivadas"
      checked={mostrarArchivadas}
      onCheckedChange={setMostrarArchivadas}
    />
    <Label htmlFor="mostrar-archivadas" className="text-sm whitespace-nowrap">
      Mostrar archivadas
    </Label>
  </div>
</div>
```

**4. Mostrar contador de archivadas (informativo):**
```typescript
const ordenesArchivadas = ordenes.filter(esOCArchivada).length;

// En la UI, mostrar junto al toggle:
{ordenesArchivadas > 0 && !mostrarArchivadas && (
  <span className="text-xs text-muted-foreground">
    ({ordenesArchivadas} archivadas)
  </span>
)}
```

## Resultado Visual

**Vista por defecto (toggle OFF):**
```text
┌─────────────────────────────────────────────────────────────────────┐
│ Ordenes de Compra                                                   │
├─────────────────────────────────────────────────────────────────────┤
│ 🔍 [Buscar...]        [Mostrar archivadas ○] (15 archivadas)        │
├─────────────────────────────────────────────────────────────────────┤
│ Folio      │ Proveedor    │ Status   │ Pago      │ Total           │
│ OC-0005    │ PRUEBA JOSAN │ Enviada  │ Anticipado│ $2,400,000      │
│ OC-0002    │ ENVOLPAN     │Completada│ Pendiente │ $234,000        │
└─────────────────────────────────────────────────────────────────────┘
  Solo 2 ordenes activas
```

**Con toggle ON:**
```text
┌─────────────────────────────────────────────────────────────────────┐
│ 🔍 [Buscar...]        [Mostrar archivadas ●]                        │
├─────────────────────────────────────────────────────────────────────┤
│ Folio      │ Proveedor    │ Status    │ Pago    │ Total            │
│ OC-0005    │ PRUEBA JOSAN │ Enviada   │ Pend.   │ $2,400,000       │
│ OC-0003    │ Almar        │Completada │ Pagado  │ $197,250  ← gris │
│ OC-0002    │ ENVOLPAN     │Completada │ Pend.   │ $234,000         │
│ ...        │              │           │         │                  │
└─────────────────────────────────────────────────────────────────────┘
  17 ordenes (incluye archivadas)
```

## Beneficios

- **Tabla limpia por defecto** - Solo OCs que requieren atencion
- **Nada se pierde** - Toggle para ver todo cuando sea necesario
- **Separacion clara de responsabilidades**:
  - Pestaña OC = Gestion activa
  - Adeudos = Pagos pendientes
  - Historial Pagadas = Archivo financiero
- **Facil de entender** - Similar a "Mostrar archivados" en Gmail

## Flujo Final del Ciclo de Vida

```text
Crear OC → Autorizar → Enviar → Recibir → Pagar → ARCHIVADA
                                   │
                                   └──→ Visible en:
                                        • Pestaña OC (solo si toggle ON)
                                        • Historial de Pagadas (toggle en Adeudos)
```

