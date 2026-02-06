
# Fix: Adaptacion a iPhone (Safe Area, Dialogs, Scroll)

## Los 3 problemas

### 1. Espacio blanco arriba al hacer scroll
El `body` tiene `padding-top: env(safe-area-inset-top)` que crea una franja blanca visible entre el notch y el header. El header sticky no se extiende hasta el borde del notch.

### 2. Boton X de dialogs bajo la barra de estado
Los dialogs usan `fixed top-4` en movil (16px desde el borde del viewport). En iPhone, el safe area es ~47px, asi que el dialog y su boton X quedan DETRAS del area del WiFi/hora/bateria. No se puede tocar.

### 3. Espacio blanco al hacer scroll
El padding del body crea un hueco blanco permanente que se ve al desplazarse.

## La solucion

### Cambio 1: `index.html` -- quitar padding del body

Eliminar el `padding-top` del `body`. En su lugar, el header del Layout se encargara de extenderse hasta el notch con color de fondo.

```html
<!-- Antes -->
body {
  padding-top: var(--safe-area-inset-top);
  ...
}

<!-- Despues -->
body {
  padding-bottom: var(--safe-area-inset-bottom);
  padding-left: var(--safe-area-inset-left);
  padding-right: var(--safe-area-inset-right);
  /* padding-top lo maneja el header */
}
```

### Cambio 2: `src/components/Layout.tsx` -- header con safe area

Agregar `pt-[env(safe-area-inset-top)]` al header para que se extienda hasta el notch con su propio fondo, eliminando la franja blanca.

```tsx
<!-- Antes -->
<header className="sticky top-0 z-50 ...">

<!-- Despues -->
<header className="sticky top-0 z-50 pt-[env(safe-area-inset-top)] ...">
```

Tambien ajustar el mobile menu overlay para que empiece despues del header con safe area:

```tsx
<!-- Antes -->
<aside className="fixed left-0 top-16 bottom-0 ...">

<!-- Despues -->
<aside className="fixed left-0 top-[calc(4rem+env(safe-area-inset-top))] bottom-0 ...">
```

### Cambio 3: `src/components/ui/dialog.tsx` -- dialog respeta safe area

Cambiar `top-4` a `top-[calc(1rem+env(safe-area-inset-top))]` para que el dialog se posicione DEBAJO del area de estado del iPhone. Tambien hacer el boton X mas grande para mejor touch target.

```tsx
<!-- Antes -->
"fixed left-[50%] top-4 sm:top-[50%] ..."

<!-- Despues -->
"fixed left-[50%] top-[calc(1rem+env(safe-area-inset-top))] sm:top-[50%] ..."
```

Y el boton X:
```tsx
<!-- Antes -->
<DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm ...">
  <X className="h-4 w-4" />

<!-- Despues -->
<DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm p-1 ...">
  <X className="h-5 w-5" />
```

## Archivos a modificar
- `index.html` -- quitar padding-top del body
- `src/components/Layout.tsx` -- agregar safe-area al header y ajustar mobile menu
- `src/components/ui/dialog.tsx` -- posicionar dialogs debajo del notch y agrandar X

## Resultado esperado
- El header se extiende hasta el notch con su fondo, sin franja blanca
- Al hacer scroll, no hay espacio blanco arriba
- Los dialogs aparecen debajo del area de estado
- El boton X siempre es accesible y se puede tocar
- En desktop no cambia nada (env() retorna 0px cuando no aplica)
