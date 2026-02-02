import * as React from "react";
import { cn } from "@/lib/utils";
import { TabsList } from "@/components/ui/tabs";

interface ResponsiveTabsListProps extends React.ComponentPropsWithoutRef<typeof TabsList> {
  children: React.ReactNode;
}

/**
 * Wrapper para TabsList que agrega scroll horizontal en móvil
 * Elimina el desbordamiento manteniendo todas las tabs accesibles
 */
export function ResponsiveTabsList({ children, className, ...props }: ResponsiveTabsListProps) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
      <TabsList 
        className={cn(
          "inline-flex w-max gap-1",
          className
        )} 
        {...props}
      >
        {children}
      </TabsList>
    </div>
  );
}
