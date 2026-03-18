

## Plan: Protect /push-diagnostics route

**Single change** in `src/App.tsx`: Replace the unprotected `/push-diagnostics` route (and its temporary debug comment) with admin-only `ProtectedRoute` wrapper.

