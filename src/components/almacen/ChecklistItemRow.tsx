import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export type ChecklistStatus = "B" | "M" | "NA";

interface ChecklistItemRowProps {
  label: string;
  itemKey: string;
  value: ChecklistStatus;
  onChange: (key: string, value: ChecklistStatus) => void;
  isNN?: boolean; // No Negociable
}

export const ChecklistItemRow = ({
  label,
  itemKey,
  value,
  onChange,
  isNN = false,
}: ChecklistItemRowProps) => {
  const options: { value: ChecklistStatus; label: string; color: string }[] = [
    { value: "B", label: "B", color: "bg-green-500 border-green-600" },
    { value: "M", label: "M", color: "bg-red-500 border-red-600" },
    { value: "NA", label: "NA", color: "bg-gray-400 border-gray-500" },
  ];

  const isFailedNN = isNN && value === "M";

  return (
    <div
      className={cn(
        "flex items-center justify-between py-2.5 px-3 rounded-lg border transition-all",
        isFailedNN
          ? "bg-red-100 border-red-300"
          : "bg-background border-border hover:bg-muted/50"
      )}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm font-medium truncate">{label}</span>
        {isNN && (
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded",
              isFailedNN
                ? "bg-red-600 text-white animate-pulse"
                : "bg-amber-100 text-amber-700"
            )}
          >
            NN
          </span>
        )}
        {isFailedNN && (
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
        )}
      </div>

      <div className="flex items-center gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(itemKey, option.value)}
            className={cn(
              "w-10 h-10 rounded-lg border-2 font-bold text-sm transition-all",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
              value === option.value
                ? `${option.color} text-white shadow-md scale-105`
                : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};
