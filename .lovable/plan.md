# Plan: Adaptar Modulo de Correos para Desktop Estilo Gmail ✅

## Estado: COMPLETADO

## Cambios Implementados

### 1. EmailListView.tsx
- ✅ Removido `max-h-[700px]` - ahora usa `h-full` para ocupar todo el espacio disponible
- ✅ Agregada prop `selectedEmailId` para resaltar el correo seleccionado
- ✅ Aplicado estilo de selección con `bg-primary/10 border-l-2 border-primary`

### 2. EmailDetailView.tsx  
- ✅ Agregada prop `embedded?: boolean` para modo panel lateral
- ✅ En modo `embedded`, se oculta el botón "Volver" (innecesario en layout de dos columnas)
- ✅ Layout adaptativo con flex cuando está embebido

### 3. BandejaEntrada.tsx
- ✅ Implementado layout de dos columnas para desktop
- ✅ Panel izquierdo (lista): ancho fijo de 400px cuando hay correo seleccionado
- ✅ Panel derecho (detalle): flex-1 con scroll independiente
- ✅ Estado vacío con icono cuando no hay correo seleccionado
- ✅ Móvil mantiene comportamiento original (una vista a la vez)
- ✅ Altura dinámica `calc(100vh-180px)` para ocupar toda la pantalla

## Arquitectura Visual Final

```text
+------------------+--------------------------------+
|                  |                                |
|   LISTA DE       |    DETALLE DEL CORREO         |
|   CORREOS        |    (Vista previa)              |
|   w-[400px]      |    flex-1                      |
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
```

## Comportamiento por Dispositivo

| Dispositivo | Comportamiento |
|-------------|----------------|
| **Desktop** | Dos paneles lado a lado |
| **Móvil** | Una vista a la vez (comportamiento original) |
