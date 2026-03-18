

## Plan: Add logout confirmation dialog to SecretariaPanel and ChoferPanel

### SecretariaPanel.tsx

1. **Import** `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle` from `@/components/ui/alert-dialog`.

2. **Add state**: `const [showLogoutDialog, setShowLogoutDialog] = useState(false);`

3. **Change all logout button `onClick`** handlers (both mobile header and sidebar pass `handleLogout`) to instead call `setShowLogoutDialog(true)`. Update `handleLogout` to just do the actual sign-out logic.

4. **Add AlertDialog** at the end of the JSX (before closing `</SidebarProvider>`):
   - Controlled by `showLogoutDialog` state
   - Title: "¿Cerrar sesión?"
   - Description: "Se cerrará tu sesión en el sistema"
   - Cancel: "Cancelar"
   - Action (destructive): "Sí, cerrar sesión" → calls `handleLogout`

### ChoferPanel.tsx

1. **Import** same AlertDialog components.

2. **Add state**: `const [showLogoutDialog, setShowLogoutDialog] = useState(false);`

3. **Replace inline `onClick` on both logout buttons** (lines ~170, ~193) to call `setShowLogoutDialog(true)`.

4. **Add AlertDialog** at the end of the JSX with the same content/styling as SecretariaPanel.

### AlertDialog Action Styling
The confirm button uses `buttonVariants({ variant: "destructive" })` class to appear red.

