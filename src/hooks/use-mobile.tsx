import * as React from "react";

const MOBILE_BREAKPOINT = 768;

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

export function useHasPointer() {
  const [hasPointer, setHasPointer] = React.useState<boolean>(true);

  React.useEffect(() => {
    // Detect if device has a fine pointer (mouse)
    const mql = window.matchMedia('(pointer: fine)');
    const onChange = () => {
      setHasPointer(mql.matches);
    };
    mql.addEventListener("change", onChange);
    setHasPointer(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return hasPointer;
}
