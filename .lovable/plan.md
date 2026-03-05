

# Plan: Mejoras de Branding y Avisos Legales en Hoja de Carga

## Cambios en `HojaCargaUnificadaTemplate.tsx`

### 1. Header — "DESDE 1904" arriba del logo
Agregar texto "DESDE 1904" en tamaño pequeño arriba de la imagen del logo.

### 2. Slogan en mayúsculas y centrado
Cambiar el footer para que el slogan aparezca en **MAYÚSCULAS**, centrado y sin itálica (más prominente):
```
"TRABAJANDO POR UN MÉXICO MEJOR"
```
Usar `COMPANY_DATA.slogan.toUpperCase()`.

### 3. Aviso "No se admiten reclamaciones"
Después de la tabla de productos, agregar un texto en negritas:
```
UNA VEZ RECIBIDA LA MERCANCÍA NO SE ADMITEN RECLAMACIONES NI CAMBIOS
```

### 4. Aviso Importante con teléfono
Agregar bloque visible antes de las firmas:
```
AVISO IMPORTANTE:
FAVOR DE REVISAR QUE SU PEDIDO LLEGUE COMPLETO, SI TIENE ALGUNA DUDA O QUEJA
FAVOR DE COMUNICARSE AL TELÉFONO 55 5552-0168
```

## Archivo a modificar

| Archivo | Cambios |
|---------|---------|
| `HojaCargaUnificadaTemplate.tsx` | (1) "DESDE 1904" sobre logo, (2) slogan en mayúsculas, (3) frase de no reclamaciones post-tabla, (4) aviso importante con teléfono pre-firmas |

