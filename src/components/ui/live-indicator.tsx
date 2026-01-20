import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const LiveIndicator = ({ 
  label = "En vivo", 
  className,
  size = "sm" 
}: LiveIndicatorProps) => {
  const dotSizes = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5", 
    lg: "h-3 w-3"
  };
  
  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="relative flex">
        <span className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75",
          dotSizes[size]
        )} />
        <span className={cn(
          "relative inline-flex rounded-full bg-green-500",
          dotSizes[size]
        )} />
      </span>
      <span className={cn(
        "font-medium text-green-600 dark:text-green-400",
        textSizes[size]
      )}>
        {label}
      </span>
    </div>
  );
};
