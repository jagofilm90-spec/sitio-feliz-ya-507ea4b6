# ARQUITECTURA ERP - ABARROTES LA MANITA, S.A. DE C.V.

> ⚠️ **DOCUMENTO CRÍTICO** - Este ERP es un sistema de producción empresarial.
> No es un MVP ni una app de prueba. Maneja operaciones críticas reales.

## 📋 Principios de Desarrollo Empresarial

### 1️⃣ El sistema NO puede colapsar por un error aislado

**Regla:** Ningún módulo debe poder tirar toda la app, causar pantallas blancas, o impedir que otros módulos funcionen.

**Implementación:**
- Cada módulo crítico está envuelto en `ErrorBoundaryModule`
- Si falla algo, se degrada la funcionalidad, no la operación completa
- Guards, fallbacks visuales, y mensajes de error claros

### 2️⃣ Cambios incrementales, no "big bang"

**Regla:** Cambios pequeños → Validar Preview → Confirmar flujos → Continuar

**Checklist obligatorio antes de publicar:**
- [ ] Login y navegación básica funcionan
- [ ] Pedidos: crear, editar, listar
- [ ] Inventario: ver stock, movimientos
- [ ] Rutas: lista de sucursales, mapa global (o fallback), sugerencias
- [ ] Facturación: generar remisión/factura básica
- [ ] Sin errores en consola del navegador
- [ ] Probar en preview antes de publicar

### 3️⃣ Módulos críticos con redundancias

Para módulos sensibles (GPS/Mapas, Facturación, Pedidos, Rutas):
- Si un servicio externo falla, el sistema sigue operando manualmente
- Mostrar instrucciones claras
- **NUNCA** quedar inutilizable

---

## 🗺️ Reglas de Google Maps (CRÍTICO)

Estas reglas previenen el error `ReferenceError: google is not defined` que causa pantallas blancas.

### 🔒 REGLA 1: Tipos seguros
```typescript
// ❌ NUNCA hacer esto:
const [map, setMap] = useState<google.maps.Map | null>(null);
const mapRef = useRef<google.maps.Map>(null);
const onLoad = (map: google.maps.Map) => { ... };

// ✅ SIEMPRE hacer esto:
const [map, setMap] = useState<any>(null);
const mapRef = useRef<any>(null);
const onLoad = (map: any) => { ... };
```

**¿Por qué?** Los tipos `google.maps.*` se evalúan en runtime ANTES de que cargue la API, causando `ReferenceError` que rompe TODA la aplicación.

### 🔒 REGLA 2: Verificar antes de usar
```typescript
// ❌ NUNCA hacer esto:
const bounds = new google.maps.LatLngBounds();

// ✅ SIEMPRE hacer esto:
if (!window.google || !window.google.maps) return;
const bounds = new window.google.maps.LatLngBounds();
```

### 🔒 REGLA 3: Fallback visual obligatorio
```typescript
if (loadError) {
  return <MapFallbackConLista sucursales={sucursales} />;
}
```

Si el mapa falla, mostrar:
1. Mensaje claro de error
2. Lista de direcciones con links a Google Maps externo
3. Instrucciones para verificar API key

### 🔒 REGLA 4: ErrorBoundary por componente de mapa
Cada componente que usa Google Maps debe estar envuelto en ErrorBoundary propio.

---

## 📁 Variables de Entorno

| Variable | Propósito | Dónde se usa |
|----------|-----------|--------------|
| `VITE_GOOGLE_MAPS_API_KEY` | API Key de Google Maps | Mapas, geocoding, rutas |
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | Cliente Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key de Supabase | Cliente Supabase |

Para cambiar la API key de Google Maps:
1. Actualizar en `.env`
2. Verificar en Google Cloud Console que el dominio esté permitido
3. Probar en preview antes de publicar

---

## 🚨 Módulos Críticos (NO TOCAR SIN VALIDACIÓN)

| Módulo | Archivo(s) Principal(es) | Riesgo |
|--------|-------------------------|--------|
| **Mapas** | `MapaGlobalSucursales.tsx`, `RouteMapVisualization.tsx` | Pantalla blanca si falla |
| **Pedidos** | `Pedidos.tsx`, `PedidoDetalleDialog.tsx` | Operación comercial |
| **Facturación** | `Facturas.tsx`, `ImprimirRemisionDialog.tsx` | Fiscal/legal |
| **Inventario** | `Inventario.tsx` | Control de stock |
| **Rutas** | `Rutas.tsx`, `PlanificadorRutas.tsx` | Entregas |
| **Auth** | `Auth.tsx`, `client.ts` | Acceso al sistema |

---

## 🛡️ Estructura de ErrorBoundary

```
App.tsx
└── ErrorBoundary (global)
    └── Layout
        └── ErrorBoundaryModule (por página crítica)
            └── Contenido de la página
                └── ErrorBoundaryModule (para mapas/componentes externos)
```

---

## 📊 Escalabilidad

Este ERP está diseñado para:
- Crecer en usuarios simultáneos
- Replicarse en sucursales
- Escalar módulos sin reescribirlos

La base es **estable y conservadora**, no experimental.

---

## 📝 Historial de Cambios Críticos

| Fecha | Cambio | Razón |
|-------|--------|-------|
| 2025-12-07 | Headers de seguridad en componentes de mapas | Prevenir `google is not defined` |
| 2025-12-08 | ErrorBoundaryModule + Fallbacks robustos | Estabilidad empresarial |

---

*Última actualización: 2025-12-08*
