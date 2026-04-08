import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-ink-200 bg-bg-soft px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus-visible:outline-none focus-visible:border-crimson-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-crimson-500/10 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
