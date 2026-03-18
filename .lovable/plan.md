

## Plan: Fix logo import in VendedorAnalisisVentas

**Single change** in `src/pages/VendedorAnalisisVentas.tsx` line 7:

Change:
```ts
import logoAlmasa from "@/assets/logos/logo-principal.png";
```
To:
```ts
import logoAlmasa from "@/assets/logo-almasa.png";
```

This aligns with the same logo path used across Auth.tsx, SecretariaPanel.tsx, and TarjetaDigital.tsx.

