

## Plan: Protect /test-firma route

**Single change** in `src/App.tsx`: Wrap the `/test-firma` route with `<ProtectedRoute allowedRoles={['admin']} redirectTo="/auth">`, matching the existing pattern.

