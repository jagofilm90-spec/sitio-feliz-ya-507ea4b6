
# Plan: Corregir Diálogo de Notificaciones Apareciendo en Login

## Problema Identificado

El diálogo de "Activar Notificaciones" está apareciendo encima de la pantalla de login en la app nativa. Esto sucede porque:

1. Hay **lógica duplicada** entre `PushNotificationsGate` y `PushNotificationSetup`
2. `PushNotificationSetup` tiene su propio useEffect que ignora las decisiones del Gate
3. Existe una **sesión guardada** en localStorage que hace que el sistema crea que hay un usuario autenticado aunque esté en la pantalla de login

## Solución

Simplificar la arquitectura para que `PushNotificationSetup` sea un componente **puramente controlado** - solo muestre el diálogo cuando el Gate se lo indique, sin lógica propia de detección.

### Cambios en PushNotificationSetup.tsx

- Eliminar completamente el `useEffect` que tiene su propia lógica de detección de rutas
- Hacer que el diálogo se muestre inmediatamente cuando el componente se monta (el Gate ya hizo todas las verificaciones)
- Mantener solo la lógica del UI y los handlers de botones
- Simplificar el estado a solo `isLoading`

### Cambios en PushNotificationsGate.tsx

- Agregar una verificación adicional del estado de autenticación usando `onAuthStateChange`
- Esperar el evento `INITIAL_SESSION` antes de decidir mostrar el diálogo
- Agregar doble verificación: solo mostrar después de navegación explícita fuera de auth routes

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| src/components/PushNotificationSetup.tsx | Eliminar useEffect de detección, hacer diálogo controlado |
| src/components/PushNotificationsGate.tsx | Agregar verificación de `INITIAL_SESSION`, lógica más robusta |

---

## Sección Tecnica

### Flujo Corregido

```text
App Inicia
    |
    v
PushNotificationsGate monta
    |
    v
Espera onAuthStateChange(INITIAL_SESSION)
    |
    +-- NO hay sesion valida --> No renderiza nada
    |
    +-- SI hay sesion valida
            |
            v
        ¿Ruta es /auth, /login, /? 
            |
            +-- SI --> No renderiza nada
            |
            +-- NO --> Verificar permisos
                        |
                        +-- Ya tiene permisos --> initPush silencioso
                        |
                        +-- No tiene permisos --> Renderizar PushNotificationSetup
```

### Codigo Simplificado de PushNotificationSetup

El componente ya no tendra logica de verificacion propia:

```typescript
export const PushNotificationSetup = ({ onComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Sin useEffect de verificacion - el Gate ya lo hizo
  
  const handleEnableNotifications = async () => {
    // ... logica existente
  };
  
  return (
    <Dialog open={true} onOpenChange={() => onComplete?.()}>
      {/* ... contenido del dialogo */}
    </Dialog>
  );
};
```

### Logica Reforzada del Gate

Agregar espera del evento `INITIAL_SESSION` para evitar usar sesiones viejas del localStorage:

```typescript
// Solo proceder despues de que Supabase confirme el estado de autenticacion
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'INITIAL_SESSION') {
    // Ahora SI podemos confiar en el estado de sesion
    if (session?.user?.id && !isAuthRoute) {
      // Proceder con verificacion de permisos
    }
  }
});
```

## Resultado Esperado

Despues de estos cambios:

1. El dialogo NUNCA aparecera en la pantalla de login
2. Solo aparecera cuando el usuario haya navegado exitosamente a una ruta protegida
3. La sesion sera verificada con el evento `INITIAL_SESSION` de Supabase, no con datos potencialmente obsoletos del localStorage
