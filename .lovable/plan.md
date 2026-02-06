
# Plan: Fix Discount Requests Display and Push Notification Issues

## Problems Identified

1. **"Por Autorizar" tab shows empty** -- The query in `useSolicitudesDescuento.ts` joins `vendedor:profiles!vendedor_id(...)` but no foreign key exists between `solicitudes_descuento.vendedor_id` and `profiles.id`. This causes PostgREST to reject the query silently, so the panel renders nothing even though the dashboard correctly shows 12 pending requests (using a simpler count query without joins).

2. **Push notifications never arrive** -- Three sub-issues:
   - The `device_tokens` table is empty (no device has registered a token -- the native Firebase CocoaPods setup on iOS isn't complete yet, which is a separate native-side task).
   - Two files send push with `roles: ['Secretaria']` (uppercase) but the database enum is `'secretaria'` (lowercase), so no users would match.
   - One file sends `userIds` instead of `user_ids`, so the edge function ignores the parameter.

---

## Step 1: Database Migration -- Add Missing Foreign Key

Add a foreign key from `solicitudes_descuento.vendedor_id` to `profiles.id`. This allows the PostgREST join to resolve correctly.

```sql
ALTER TABLE public.solicitudes_descuento
  ADD CONSTRAINT solicitudes_descuento_vendedor_id_fkey
  FOREIGN KEY (vendedor_id) REFERENCES public.profiles(id);
```

---

## Step 2: Fix Role Casing in Push Notification Calls

### File: `src/components/vendedor/VendedorNuevoPedidoTab.tsx`
- Change `roles: ['Secretaria']` to `roles: ['secretaria']`

### File: `src/components/vendedor/CancelarPedidoDialog.tsx`
- Change `roles: ['Secretaria']` to `roles: ['secretaria']`

---

## Step 3: Fix Parameter Name in Push Call

### File: `src/components/compras/CrearOrdenCompraWizard.tsx`
- Change `userIds: [admin.user_id]` to `user_ids: [admin.user_id]`

---

## What This Fixes

- The 12 pending discount requests will appear correctly in the "Por Autorizar" tab (both the `SolicitudesDescuentoPanel` and the counts will be synchronized).
- Push notifications to secretaries and admins will target the correct users once device tokens are registered.

## What Still Requires Native-Side Work

Push notifications will only start arriving once the iOS app has Firebase properly configured (CocoaPods installed with `Firebase/Core` and `Firebase/Messaging`). This is the step you were working on in Xcode -- once the pods are installed and the app is rebuilt, device tokens will be saved to the database and notifications will flow.
