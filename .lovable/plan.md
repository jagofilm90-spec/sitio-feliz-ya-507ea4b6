

# Plan: Mostrar Panel de Llegada Anticipada Incluso Cuando No Hay Entregas Visibles

## Problema Detectado

El componente `BusquedaLlegadaAnticipada` no se muestra porque:
1. La ventana de visibilidad de 24h filtra las entregas del 30 de enero (hoy es 28)
2. Como `entregas.length === 0`, hay un **return early** en la línea 429-436 que muestra solo un mensaje vacío
3. El panel de "Llegada Anticipada" está DESPUÉS de ese return, por lo que nunca se renderiza

## Solución

Modificar la vista vacía para incluir el panel de `BusquedaLlegadaAnticipada`, permitiendo al almacenista buscar entregas futuras aunque no haya entregas en la ventana de visibilidad actual.

---

## Cambio a Implementar

### Archivo: `src/components/almacen/AlmacenRecepcionTab.tsx`

### Modificar el bloque de "entregas vacías" (líneas 429-436)

**Antes:**
```typescript
if (entregas.length === 0) {
  return (
    <div className="p-8 text-center text-muted-foreground">
      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p>No hay entregas de proveedores pendientes</p>
    </div>
  );
}
```

**Después:**
```typescript
if (entregas.length === 0) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="w-5 h-5" />
          Recepciones pendientes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-8 text-center text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay entregas programadas para hoy</p>
          <p className="text-sm mt-1">Pero puedes buscar llegadas anticipadas abajo</p>
        </div>
        {/* Panel de llegada anticipada - siempre visible */}
        <BusquedaLlegadaAnticipada onEntregaReprogramada={loadEntregas} />
      </CardContent>
    </Card>
  );
}
```

---

## Resultado Esperado

| Escenario | Antes | Después |
|-----------|-------|---------|
| Sin entregas en ventana de visibilidad | Solo mensaje "No hay entregas" | Mensaje + Panel "Llegada Anticipada" |
| Con entregas en ventana | Lista + Panel "Llegada Anticipada" | Sin cambio |

---

## Acceso por Rol

Ambos roles (**Almacén** y **Gerente de Almacén**) tienen acceso a esta funcionalidad porque:
1. Acceden al mismo componente `AlmacenRecepcionTab`
2. No hay restricciones de rol en este componente
3. La ruta `/almacen-tablet` ya está protegida por roles en el sistema

La diferencia de funcionalidades entre roles se maneja en otras partes (tabs de flotilla, configuración, etc.), pero la recepción de mercancía y llegadas anticipadas está disponible para ambos roles.

