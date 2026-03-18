

## Plan: Rediseñar página 404

Reemplazar `src/pages/NotFound.tsx` con:

- Logo ALMASA centrado (desde `@/assets/logo-almasa.png`)
- Título "404 — Página no encontrada"
- Subtítulo "La página que buscas no existe o fue movida"
- Botón "Volver al inicio" → `/auth` usando `useNavigate` y componente `Button`
- Layout centrado vertical/horizontal con `flex min-h-screen items-center justify-center bg-background`
- Colores del tema: `text-foreground`, `text-muted-foreground`, botón `variant="default"`

Un solo archivo modificado: `src/pages/NotFound.tsx`.

