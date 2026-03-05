

# Plan: Agregar Pagaré a variante ORIGINAL

## Cambio

En `HojaCargaUnificadaTemplate.tsx`, línea 160, cambiar la condición del pagaré de:

```tsx
{variante === "CLIENTE" && datos.total && (
```

a:

```tsx
{(variante === "CLIENTE" || variante === "ORIGINAL") && datos.total && (
```

Esto hará que el pagaré aparezca en **ORIGINAL** (la que firma el cliente y regresa a oficinas) y **CLIENTE** (la que se queda el cliente). No aparecerá en ALMACÉN ni en PEDIDO.

## Archivo a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/pedidos/HojaCargaUnificadaTemplate.tsx` | Ampliar condición del pagaré a incluir ORIGINAL |

