
# Plan: Adaptar Interfaz de Correos Estilo Gmail para Movil

## Objetivo
Transformar la interfaz de correos del ERP para que en dispositivos moviles se vea y funcione como la app de Gmail, manteniendo la funcionalidad actual en desktop.

---

## Elementos a Implementar (basado en el screenshot de Gmail)

### 1. Barra de Busqueda Estilo Gmail
- Barra redondeada con fondo gris claro
- Icono de menu hamburguesa a la izquierda
- Placeholder "Buscar en el correo"
- Avatar del usuario a la derecha
- Solo visible en movil (en desktop se mantiene el diseno actual)

### 2. Avatares Circulares con Iniciales
- Extraer iniciales del nombre del remitente
- Generar color de fondo consistente basado en el email
- Mostrar foto de perfil si esta disponible (para remitentes conocidos)

### 3. Rediseno de Filas de Correo
**Layout por fila:**
```text
+-------+----------------------------------+-------+
| Avatar| Nombre remitente       Contador  |  Hora |
|       | Asunto del correo               |  Star |
|       | Preview del contenido...        |       |
|       | [Tag cuenta] [Adjuntos]         |       |
+-------+----------------------------------+-------+
```

**Elementos visuales:**
- Avatar 44x44px a la izquierda
- Nombre en negrita si no leido
- Contador de hilos (si aplica)
- Hora alineada a la derecha
- Asunto en linea secundaria
- Snippet en gris debajo
- Tags de cuenta en chips coloridos
- Chips para adjuntos mostrando nombre de imagen
- Estrella para favoritos (opcional, fase 2)

### 4. Boton Flotante (FAB) para Redactar
- Boton azul redondeado fijo en esquina inferior derecha
- Icono de lapiz + texto "Redactar"
- Visible solo en movil
- Reemplaza al boton "Nuevo correo" del header

### 5. Vista de Detalle de Correo Adaptada
- Header simplificado con boton volver
- Avatar grande del remitente
- Botones de accion en menu desplegable

---

## Arquitectura de Cambios

### Archivos a Modificar

1. **`src/components/correos/EmailListView.tsx`**
   - Crear componente `EmailRowMobile` para el nuevo diseno
   - Agregar funcion `generateAvatarColor(email)` para colores consistentes
   - Agregar funcion `getInitials(name)` para extraer iniciales
   - Detectar movil con `useIsMobile()` para alternar layouts

2. **`src/components/correos/BandejaEntrada.tsx`**
   - Agregar barra de busqueda estilo Gmail (solo movil)
   - Agregar boton flotante FAB (solo movil)
   - Simplificar header en movil (ocultar botones, usar FAB)
   - Mover selector de cuenta a menu hamburguesa

3. **`src/components/correos/EmailDetailView.tsx`** (fase 2)
   - Simplificar layout para movil
   - Colapsar botones secundarios en menu dropdown

4. **Nuevo: `src/components/correos/EmailAvatarMobile.tsx`**
   - Componente reutilizable para avatares
   - Manejo de iniciales y colores

5. **Nuevo: `src/components/correos/GmailSearchBar.tsx`**
   - Barra de busqueda estilo Gmail
   - Menu hamburguesa para cuentas
   - Avatar del usuario actual

---

## Detalles Tecnicos

### Generacion de Colores para Avatares
```typescript
const generateAvatarColor = (email: string): string => {
  const colors = [
    '#1a73e8', '#ea4335', '#34a853', '#fbbc04',
    '#673ab7', '#e91e63', '#00bcd4', '#ff5722'
  ];
  const hash = email.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return colors[Math.abs(hash) % colors.length];
};
```

### Extraccion de Iniciales
```typescript
const getInitials = (name: string): string => {
  const words = name.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};
```

### Deteccion de Movil
```typescript
const isMobile = useIsMobile();
// Renderizar layout diferente segun dispositivo
```

---

## Flujo de Implementacion

### Fase 1: Lista de Correos (Prioridad Alta)
1. Crear componente `EmailAvatarMobile`
2. Redisenar `EmailListView` para movil con avatares
3. Agregar FAB para redactar
4. Simplificar header en movil

### Fase 2: Busqueda y Navegacion
1. Crear `GmailSearchBar` con menu hamburguesa
2. Mover selector de cuentas al menu
3. Agregar filtros en menu lateral

### Fase 3: Vista de Detalle (Opcional)
1. Adaptar `EmailDetailView` para movil
2. Colapsar acciones secundarias

---

## Consideraciones Importantes

1. **Retrocompatibilidad**: El layout de desktop no debe cambiar
2. **Performance**: Los avatares se generan con CSS, sin imagenes adicionales
3. **Accesibilidad**: Mantener tamanos tactiles minimos de 44x44px
4. **Consistencia**: Usar los mismos colores del tema del ERP
5. **Memoria del proyecto**: Seguir el patron de `useIsMobile()` ya establecido

---

## Resultado Esperado

En movil, la bandeja de entrada se vera exactamente como la app de Gmail:
- Avatares coloridos con iniciales
- Busqueda prominente arriba
- Informacion jerarquica clara
- FAB para redactar
- Navegacion fluida entre correos
