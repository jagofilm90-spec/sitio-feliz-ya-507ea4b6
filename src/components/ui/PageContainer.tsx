import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "narrow" | "medium" | "wide" | "full";
}

/**
 * Contenedor base para todas las páginas del ERP.
 * Responsive por default, nunca desperdicia espacio.
 *
 * maxWidth:
 *   - narrow:  max 720px  (formularios cortos, detalles simples)
 *   - medium:  max 1100px (listados sencillos, formularios medianos)
 *   - wide:    max 1600px (dashboards, detalle con sidebar)
 *   - full:    100%       (tablas grandes, mapas, listados jerárquicos)
 *
 * Default: 'wide'
 *
 * CONVENCIÓN: Toda página nueva del ERP debe envolverse en
 * <PageContainer>. Esto garantiza responsive consistente en
 * móvil, tablet, laptop y desktop sin tener que configurar
 * layout en cada página.
 *
 * Excepciones: solo las páginas de auth (login, forgot password)
 * que tienen su propio layout centrado.
 */
export function PageContainer({
  children,
  className,
  maxWidth = "wide",
}: PageContainerProps) {
  const maxWidthClass = {
    narrow: "max-w-[720px]",
    medium: "max-w-[1100px]",
    wide: "max-w-[1600px]",
    full: "max-w-full",
  }[maxWidth];

  return (
    <div className={cn(maxWidthClass, "mx-auto w-full", className)}>
      {children}
    </div>
  );
}
