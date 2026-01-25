import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_MIN_WIDTH = 768;
const TABLET_MAX_WIDTH = 1024;

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
      const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
      const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
      const hasHoverCapability = window.matchMedia('(hover: hover)').matches;
      
      // Es "desktop con mouse real" si:
      // - Tiene puntero fino (mouse/trackpad/stylus)
      // - Puede hacer hover real (no touch-only)
      // - NO tiene puntero grueso como primario (esto descarta tablets con stylus)
      const isRealMouse = hasFinePointer && hasHoverCapability && !hasCoarsePointer;
      
      setHasPointer(isRealMouse);
    };
    
    checkPointer();
    
    // Listener para cambios (ej: conectar/desconectar mouse bluetooth a tablet)
    const fineQuery = window.matchMedia('(pointer: fine)');
    const coarseQuery = window.matchMedia('(pointer: coarse)');
    const hoverQuery = window.matchMedia('(hover: hover)');
    
    fineQuery.addEventListener("change", checkPointer);
    coarseQuery.addEventListener("change", checkPointer);
    hoverQuery.addEventListener("change", checkPointer);
    
    return () => {
      fineQuery.removeEventListener("change", checkPointer);
      coarseQuery.removeEventListener("change", checkPointer);
      hoverQuery.removeEventListener("change", checkPointer);
    };
  }, []);

  return hasPointer;
}

/**
 * Detecta si el dispositivo es una tablet (768-1024px con touch)
 */
export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean>(false);

  React.useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      // Es tablet si: 768-1024px de ancho Y tiene pantalla táctil
      setIsTablet(width >= TABLET_MIN_WIDTH && width <= TABLET_MAX_WIDTH && hasTouch);
    };
    
    checkTablet();
    window.addEventListener('resize', checkTablet);
    return () => window.removeEventListener('resize', checkTablet);
  }, []);

  return isTablet;
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
