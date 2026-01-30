
# Plan: Corregir Encoding UTF-8 en Asuntos de Correos con Emojis

## Problema Identificado

Los correos del sistema muestran caracteres como "Ã¢Â ÃŒ" en lugar del emoji "❌" porque la función `btoa()` no maneja correctamente caracteres multibyte como emojis.

Ejemplo afectado:
- **Esperado:** `❌ ORDEN CANCELADA: OC-202601-0005`
- **Actual:** `Ã¢Â ÃŒ ORDEN CANCELADA: OC-202601-0005`

## Causa Raíz

En `gmail-api/index.ts` línea 595:
```typescript
headers.push(`Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`);
```

El problema es que `btoa()` espera una cadena con caracteres de 1 byte, pero los emojis ocupan 4 bytes en UTF-8. La técnica `unescape(encodeURIComponent())` funciona para caracteres latinos, pero falla con emojis.

## Solución

Usar `TextEncoder` + conversión a binary string para manejar correctamente todos los caracteres UTF-8 incluyendo emojis:

```typescript
// Función helper para codificar UTF-8 a Base64 correctamente
function utf8ToBase64(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Uso:
headers.push(`Subject: =?UTF-8?B?${utf8ToBase64(subject)}?=`);
```

Esta función:
1. Convierte el string a bytes UTF-8 con `TextEncoder`
2. Convierte cada byte a un carácter (0-255)
3. Aplica `btoa()` a la cadena de bytes

## Cambios Técnicos

### Archivo a modificar: `supabase/functions/gmail-api/index.ts`

1. **Agregar función helper** al inicio del archivo:
```typescript
// Helper to properly encode UTF-8 strings (including emojis) to Base64
function utf8ToBase64(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
```

2. **Reemplazar línea 595** (encoding del subject):
```typescript
// Antes (mal):
headers.push(`Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`);

// Después (bien):
headers.push(`Subject: =?UTF-8?B?${utf8ToBase64(subject)}?=`);
```

3. **Reemplazar líneas 608 y 633** (encoding del body) para consistencia:
```typescript
// Antes:
btoa(unescape(encodeURIComponent(emailBody || "")))

// Después:
utf8ToBase64(emailBody || "")
```

## Impacto

Con este cambio, todos los correos con emojis se mostrarán correctamente:
- ❌ ORDEN CANCELADA
- ⚠️ Faltante en OC
- 📅 Cambio de fecha
- 🔔 Recordatorio
- 📋 Datos para Depósito
- Etc.

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/gmail-api/index.ts` | Agregar helper UTF-8 y usarlo para subject y body |

---

## Nota sobre el Correo de Apple (ITMS-90725)

El correo de Apple es un **warning informativo**, no un error bloqueante:

> "A partir de abril de 2026, todas las apps deben crearse con el SDK de iOS 26"

**Acciones:**
- **Ahora:** No requiere acción inmediata. La build actual puede pasar review.
- **Futuro (antes de abril 2026):** Actualizar macOS y Xcode 26 cuando esté disponible.
- **Prioridad actual:** Esperar respuesta de Apple sobre el status "Unlisted" (Guideline 3.2).

Este es un aviso de que el SDK actual (iOS 18.5) quedará obsoleto en abril, pero no impide la aprobación actual.
