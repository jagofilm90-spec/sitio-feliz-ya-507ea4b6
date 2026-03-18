

## Plan: Redirect Index to /auth

Replace `src/pages/Index.tsx` content with a simple `Navigate` redirect to `/auth` using `react-router-dom`.

**Single file change:** `src/pages/Index.tsx` — replace entire content with:
```tsx
import { Navigate } from "react-router-dom";
const Index = () => <Navigate to="/auth" replace />;
export default Index;
```

