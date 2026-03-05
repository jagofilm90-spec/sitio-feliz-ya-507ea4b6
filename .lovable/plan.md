

# Plan: Agregar Pagaré a Hoja de Carga + Slogan en todos los documentos

## Contexto

El pagaré ya existe en `RemisionPrintTemplate.tsx` pero falta en la **Hoja de Carga** (`HojaCargaUnificadaTemplate.tsx`). El slogan "Trabajando por un México mejor" no aparece en ningún documento.

## Cambios

### 1. Agregar slogan a `companyData.ts`
- Agregar campo `slogan: "Trabajando por un México mejor"` al objeto `COMPANY_DATA` para centralizarlo.

### 2. Agregar pagaré a `HojaCargaUnificadaTemplate.tsx`
- Insertar la sección de pagaré (tomada de `RemisionPrintTemplate`) entre las firmas y el footer.
- Solo mostrar en variante **CLIENTE** (es el documento que firma el cliente al recibir mercancía).
- Texto legal idéntico al de la remisión, con el monto dinámico (requiere agregar `total` al tipo `DatosHojaCargaUnificada`).

### 3. Agregar slogan a los 3 templates de documentos
- **PedidoPrintTemplate**: Debajo del header, centrado, en itálica.
- **HojaCargaUnificadaTemplate**: En el footer.
- **RemisionPrintTemplate**: En el footer.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/constants/companyData.ts` | Agregar `slogan` |
| `src/components/pedidos/HojaCargaUnificadaTemplate.tsx` | Pagaré (variante CLIENTE) + slogan en footer |
| `src/components/pedidos/PedidoPrintTemplate.tsx` | Slogan en header |
| `src/components/remisiones/RemisionPrintTemplate.tsx` | Slogan en footer |

