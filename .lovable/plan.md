
# Plan: Mover Botón "Ajustar Costos" a Sección Más Visible

## Objetivo
Mover el botón "Ajustar Costos" fuera de "Otras Acciones" para hacerlo más fácil de encontrar cuando necesitas corregir precios de compra.

---

## Ubicación Propuesta

Mover el botón a la sección **"Seguimiento"**, justo después de "Ver Estado de Recepciones". Esta sección es la más lógica porque:

1. El ajuste de costos se hace **después de recibir** mercancía
2. Está en el flujo natural: Programar → Recibir → Ajustar Costos
3. Es más visible que estar escondido en "Otras Acciones"

---

## Resultado Visual

```text
┌────────────────────────────────────────────────┐
│ SEGUIMIENTO                                    │
├────────────────────────────────────────────────┤
│ 🚚 Programar Entregas                          │
│ 📦 Ver Estado de Recepciones     [Completa]    │
│ 💲 Ajustar Costos de Compra      ← AQUÍ        │
├────────────────────────────────────────────────┤
│ OTRAS ACCIONES                                 │
├────────────────────────────────────────────────┤
│ 📷 Ver Evidencias Fotográficas                 │
│ 📜 Historial de Correos Enviados               │
└────────────────────────────────────────────────┘
```

---

## Mejoras Adicionales

Para hacerlo aún más visible, el botón tendrá:
- **Texto más descriptivo**: "Ajustar Costos de Compra"
- **Color destacado**: Borde verde cuando hay productos recibidos
- **Badge informativo**: Mostrar número de productos en la OC

---

## Sección Técnica

### Archivo: `src/components/compras/OrdenAccionesDialog.tsx`

**Cambio 1**: Mover el botón de líneas 1940-1950 (sección "Otras Acciones") a líneas ~1915-1917 (después de "Ver Estado de Recepciones" en sección "Seguimiento")

```text
ANTES (Otras Acciones, línea ~1940):
{(orden?.status === 'recibida' || orden?.status === 'parcial' || orden?.status === 'completada') && (
  <Button variant="outline" className="w-full justify-start" ...>
    <DollarSign /> Ajustar Costos
  </Button>
)}

DESPUÉS (Seguimiento, línea ~1916):
{(orden?.status === 'recibida' || orden?.status === 'parcial' || orden?.status === 'completada') && (
  <Button 
    variant="outline" 
    className="w-full justify-start text-blue-600 hover:text-blue-700 border-blue-200"
    onClick={() => setAjustarCostosOpen(true)}
  >
    <DollarSign className="mr-2 h-4 w-4" />
    Ajustar Costos de Compra
    <Badge variant="secondary" className="ml-auto">
      {orden?.ordenes_compra_detalles?.length || 0} productos
    </Badge>
  </Button>
)}
```

**Cambio 2**: Eliminar el botón duplicado de la sección "Otras Acciones"

---

## Beneficios

| Antes | Después |
|-------|---------|
| Escondido en "Otras Acciones" | En sección "Seguimiento" más visible |
| Texto genérico "Ajustar Costos" | Texto claro "Ajustar Costos de Compra" |
| Sin color destacado | Borde azul para destacar |
| Sin indicador | Badge con cantidad de productos |
