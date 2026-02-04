
# Plan: Corrección de Sistema de Autorizaciones y Push Notifications

## Problemas Identificados

### 1. Navegación Incorrecta desde Dashboard
La tarjeta de "Autorizaciones" en el Dashboard navega a `/pedidos` pero no activa la pestaña correcta ni incluye las solicitudes de descuento.

### 2. Tab "Por Autorizar" Incompleto
La pestaña muestra solo pedidos con status `por_autorizar`, pero las solicitudes de descuento (que son las 3 que ves) están en una tabla diferente y solo se muestran en el Dashboard, no en la página de Pedidos.

### 3. Push Notifications
El fix de `roles: ['admin']` ya fue aplicado. La última solicitud (01:30:52) se envió correctamente. Las 2 anteriores fallaron por el bug de mayúsculas.

---

## Solución Técnica

### Cambio 1: Integrar SolicitudesDescuentoPanel en la Página de Pedidos

Agregar el `SolicitudesDescuentoPanel` dentro de la pestaña "Por Autorizar" para que muestre AMBOS: pedidos por autorizar Y solicitudes de descuento.

**Archivo**: `src/pages/Pedidos.tsx`

```typescript
// Agregar import
import { SolicitudesDescuentoPanel } from "@/components/admin/SolicitudesDescuentoPanel";

// En TabsContent "por-autorizar", combinar ambos paneles:
<TabsContent value="por-autorizar" className="mt-6 space-y-6">
  <SolicitudesDescuentoPanel />
  <PedidosPorAutorizarTab />
</TabsContent>
```

### Cambio 2: Corregir Navegación del Dashboard

Modificar el `onClick` de Autorizaciones para navegar correctamente con el parámetro de tab.

**Archivo**: `src/components/dashboard/EstadoOperacionesMobile.tsx` (línea 60)

```typescript
// Cambiar de:
onClick: () => navigate("/pedidos"),

// A:
onClick: () => navigate("/pedidos?tab=por-autorizar"),
```

**Archivo**: `src/components/dashboard/EstadoOperacionesPanel.tsx`

```typescript
// Aplicar el mismo cambio en el panel de desktop
```

### Cambio 3: Leer Parámetro de Tab en URL

Modificar la página de Pedidos para leer el tab desde la URL.

**Archivo**: `src/pages/Pedidos.tsx`

```typescript
import { useSearchParams } from "react-router-dom";

// Dentro del componente:
const [searchParams] = useSearchParams();
const tabFromUrl = searchParams.get("tab");

// Cambiar estado inicial:
const [activeTab, setActiveTab] = useState(tabFromUrl || "pedidos");

// Actualizar cuando cambie la URL:
useEffect(() => {
  if (tabFromUrl) {
    setActiveTab(tabFromUrl);
  }
}, [tabFromUrl]);
```

### Cambio 4: Verificar Token del Dispositivo (Diagnóstico)

Para las push notifications, verificar si tu dispositivo tiene token registrado.

```sql
-- Verificar tokens de admin en la base de datos
SELECT dt.user_id, dt.platform, dt.created_at, p.full_name, ur.role
FROM device_tokens dt
JOIN profiles p ON dt.user_id = p.id
JOIN user_roles ur ON dt.user_id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY dt.created_at DESC;
```

---

## Flujo Corregido

```text
Dashboard                    Pagina Pedidos
+------------------+         +---------------------------+
| Autorizaciones   |         | Tab: Por Autorizar        |
| - Descuentos: 3  | ------> | +-----------------------+ |
| - Cotiz: 0       |         | | SolicitudesDescuento  | |
| - OC: 0          |         | | Panel (3 pendientes)  | |
|                  |         | +-----------------------+ |
| [Ver más]        |         | +-----------------------+ |
+------------------+         | | PedidosPorAutorizarTab| |
                             | | (pedidos por_autorizar)| |
                             | +-----------------------+ |
                             +---------------------------+
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Pedidos.tsx` | Integrar SolicitudesDescuentoPanel + leer tab desde URL |
| `src/components/dashboard/EstadoOperacionesMobile.tsx` | Corregir navegación a `/pedidos?tab=por-autorizar` |
| `src/components/dashboard/EstadoOperacionesPanel.tsx` | Mismo cambio de navegación |

---

## Notas sobre Push Notifications

El fix de `roles: ['admin']` ya fue aplicado. Para la próxima solicitud que hagas, debería enviarse correctamente. 

Si aún no recibes notificaciones push con el teléfono bloqueado, puede ser por:
1. El token del dispositivo no está registrado en la base de datos
2. Configuración de notificaciones de la app en el dispositivo (revisar permisos)
3. Modo "No molestar" activado
4. La app no tiene configurado Firebase correctamente (requiere `FIREBASE_SERVICE_ACCOUNT` secret)

Puedo verificar el estado del registro de tu dispositivo si me lo indicas.

---

## Resultado Esperado

1. Al dar clic en "Ver más" en Autorizaciones del Dashboard -> Te lleva directamente a la pestaña "Por Autorizar" en Pedidos
2. En esa pestaña verás las 3 solicitudes de descuento pendientes + cualquier pedido que requiera autorización de precio
3. Podrás aprobar/rechazar desde ahí
4. Las notificaciones push llegarán correctamente (con el fix ya aplicado)
