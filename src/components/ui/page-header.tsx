import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      "flex gap-4",
      isMobile ? "flex-col" : "justify-between items-center",
      className
    )}>
      <div className="min-w-0">
        <h1 className={cn(
          "font-bold truncate",
          isMobile ? "text-xl" : "text-3xl"
        )}>
          {title}
        </h1>
        {description && (
          <p className={cn(
            "text-muted-foreground truncate",
            isMobile ? "text-xs" : "text-sm"
          )}>
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className={cn(
          "flex gap-2 flex-shrink-0",
          isMobile && "w-full"
        )}>
          {children}
        </div>
      )}
    </div>
  );
}
