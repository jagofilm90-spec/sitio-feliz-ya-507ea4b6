

## Plan: Visual improvements to Auth.tsx

Three cosmetic changes, zero logic changes:

1. **Imports**: Add `Loader2` from `lucide-react` and `format` + `es` locale from `date-fns`.

2. **Date greeting** (line 182, after slogan): Add a new `<p>` showing `"Bienvenido, miércoles 18 de marzo de 2026"` using `format(new Date(), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })`.

3. **Fade-in animation**: Add `animate-fade-in` class to the header `<div>` (line 178) and `animate-fade-in-scale` to the `<Card>` (line 184) with a slight delay via inline style `animationDelay`.

4. **Loading spinner**: Replace `"Cargando..."` (line 218) with `<Loader2 className="animate-spin" /> Iniciando sesión...`.

All auth logic remains untouched.

