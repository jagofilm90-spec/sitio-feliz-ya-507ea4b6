

## Plan: Remove Push Diagnostics button from Auth page

**Single change** in `src/pages/Auth.tsx`: Delete lines 171-177 containing the "Diagnóstico Push (Admin)" button element.

No other files affected. Admins can still access `/push-diagnostics` directly via URL.

