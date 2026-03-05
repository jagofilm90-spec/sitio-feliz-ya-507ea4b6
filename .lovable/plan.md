

# Plan: Agregar Slogan en Login y Paneles por Rol

## Ubicaciones donde agregar el slogan

| Página | Ubicación exacta | Estilo |
|--------|------------------|--------|
| **Auth.tsx** (Login) | Debajo de "Sistema de Gestión Empresarial" | Texto itálico pequeño, `text-muted-foreground` |
| **ChoferPanel.tsx** | En el header, debajo de la fecha | Texto `text-xs opacity-70 italic` |
| **AlmacenTablet.tsx** | En el header/sidebar del panel | Texto pequeño itálico |
| **VendedorPanel.tsx** | Debajo de "Bienvenido, {nombre}" | Texto pequeño itálico |
| **SecretariaPanel.tsx** | En el header del sidebar | Texto pequeño itálico |
| **Dashboard.tsx** | En el header o bienvenida | Texto pequeño itálico |
| **PortalCliente.tsx** | Debajo de "¡Bienvenido, {cliente}!" | Texto pequeño itálico |

## Enfoque

- Usar `COMPANY_DATA.slogan` del archivo centralizado en todos los casos (ya existe).
- Mantener el slogan sutil y profesional: siempre en itálica, tamaño pequeño, con comillas.
- No alterar la estructura de los layouts existentes, solo insertar una línea de texto adicional.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Auth.tsx` | Slogan debajo del subtítulo |
| `src/pages/ChoferPanel.tsx` | Slogan en header |
| `src/pages/AlmacenTablet.tsx` | Slogan en header |
| `src/pages/VendedorPanel.tsx` | Slogan en header |
| `src/pages/SecretariaPanel.tsx` | Slogan en header |
| `src/pages/Dashboard.tsx` | Slogan en área de bienvenida |
| `src/pages/PortalCliente.tsx` | Slogan en header |

