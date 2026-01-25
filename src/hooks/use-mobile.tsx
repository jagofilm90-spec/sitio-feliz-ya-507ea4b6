import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_MIN_WIDTH = 768;
const TABLET_MAX_WIDTH = 1366; // Ampliado para cubrir iPads Pro

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/**
 * Detecta si el dispositivo tiene un mouse real (no stylus/S-Pen)
 * - pointer: fine → Mouse, trackpad, o stylus
 * - hover: hover → Puede hacer hover real (solo mouse/trackpad)
 * - pointer: coarse → Táctil como input primario
 * 
 * Solo retorna true si tiene puntero fino Y puede hover Y no es táctil primario
 */
export function useHasPointer() {
  const [hasPointer, setHasPointer] = React.useState<boolean>(false);

  React.useEffect(() => {
    const checkPointer = () => {
      // Usar "any-pointer" para detectar si ALGÚN dispositivo de entrada
      // tiene puntero fino (mouse, trackpad), aunque el primario sea touch.
      // Esto es crítico para iPads con Magic Keyboard/Trackpad conectado.
      const anyFinePointer = window.matchMedia('(any-pointer: fine)').matches;
      const anyHoverCapability = window.matchMedia('(any-hover: hover)').matches;
      
      // Es "dispositivo con mouse/trackpad disponible" si:
      // - Tiene ALGÚN puntero fino (any-pointer: fine)
      // - Y puede hacer hover con alguno (any-hover: hover)
      // Esto cubre: iPads con Magic Keyboard, laptops, desktops
      setHasPointer(anyFinePointer && anyHoverCapability);
    };
    
    checkPointer();
    
    // Listener para cambios (ej: conectar/desconectar mouse bluetooth a tablet)
    const fineQuery = window.matchMedia('(any-pointer: fine)');
    const hoverQuery = window.matchMedia('(any-hover: hover)');
    
    fineQuery.addEventListener("change", checkPointer);
    hoverQuery.addEventListener("change", checkPointer);
    
    return () => {
      fineQuery.removeEventListener("change", checkPointer);
      hoverQuery.removeEventListener("change", checkPointer);
    };
  }, []);

  return hasPointer;
}

/**
 * Detecta si el dispositivo es una tablet (768-1366px con touch)
 * Incluye iPads con Magic Keyboard/Trackpad
 */
export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean>(false);

  React.useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      // Es tablet si: 768-1366px de ancho Y tiene pantalla táctil
      setIsTablet(width >= TABLET_MIN_WIDTH && width <= TABLET_MAX_WIDTH && hasTouch);
    };
    
    checkTablet();
    window.addEventListener('resize', checkTablet);
    return () => window.removeEventListener('resize', checkTablet);
  }, []);

  return isTablet;
}

/**
 * Detecta si el dispositivo es una tablet con mouse/trackpad conectado
 * Útil para diferenciar un iPad con Magic Keyboard de una laptop real
 */
export function useIsTabletWithMouse() {
  const [isTabletWithMouse, setIsTabletWithMouse] = React.useState<boolean>(false);

  React.useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
      const hasHoverCapability = window.matchMedia('(hover: hover)').matches;
      
      // Es tablet con mouse si:
      // - Ancho <= 1366px (cubre iPads, Galaxy Tabs)
      // - TIENE touch (diferencia de laptops)
      // - Y tiene puntero fino + hover (mouse/trackpad conectado)
      setIsTabletWithMouse(
        width <= TABLET_MAX_WIDTH && 
        hasTouch && 
        hasFinePointer && 
        hasHoverCapability
      );
    };
    
    check();
    
    const resizeHandler = () => check();
    window.addEventListener('resize', resizeHandler);
    
    // Listeners para cambios de input (conectar/desconectar mouse)
    const fineQuery = window.matchMedia('(pointer: fine)');
    const hoverQuery = window.matchMedia('(hover: hover)');
    
    fineQuery.addEventListener("change", check);
    hoverQuery.addEventListener("change", check);
    
    return () => {
      window.removeEventListener('resize', resizeHandler);
      fineQuery.removeEventListener("change", check);
      hoverQuery.removeEventListener("change", check);
    };
  }, []);

  return isTabletWithMouse;
}

/**
 * Detecta si debe mostrar navegación móvil (phones + tablets sin mouse)
 */
export function useShowMobileNav() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const hasPointer = useHasPointer();
  
  // Mostrar nav móvil si: es phone O (es tablet Y no tiene mouse conectado)
  return isMobile || (isTablet && !hasPointer);
}

/**
 * Detecta si debe usar layout compacto (tablets con o sin mouse)
 * Útil para adaptar componentes a pantallas medianas
 */
export function useCompactLayout() {
  const isTablet = useIsTablet();
  const isTabletWithMouse = useIsTabletWithMouse();
  
  // Layout compacto si es tablet (con o sin mouse)
  return isTablet || isTabletWithMouse;
}
