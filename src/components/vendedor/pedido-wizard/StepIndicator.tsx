import { Check, Store, Package, DollarSign, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  number: 1 | 2 | 3 | 4;
  title: string;
  shortTitle: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  { number: 1, title: "Cliente", shortTitle: "Cliente", icon: <Store className="h-4 w-4" /> },
  { number: 2, title: "Productos", shortTitle: "Prod.", icon: <Package className="h-4 w-4" /> },
  { number: 3, title: "Precios", shortTitle: "Precios", icon: <DollarSign className="h-4 w-4" /> },
  { number: 4, title: "Confirmar", shortTitle: "OK", icon: <FileCheck className="h-4 w-4" /> },
];

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
  completedSteps: number[];
  onStepClick?: (step: 1 | 2 | 3 | 4) => void;
}

export function StepIndicator({ currentStep, completedSteps, onStepClick }: StepIndicatorProps) {
  return (
    <div className="w-full py-3">
      <div className="flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted mx-6" />

        {/* Active progress line */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-primary mx-6 transition-all duration-500"
          style={{
            width: `calc(${((currentStep - 1) / (steps.length - 1)) * 100}% - 3rem)`,
            marginLeft: '1.5rem'
          }}
        />

        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.number);
          const isCurrent = currentStep === step.number;
          const canClick = isCompleted || step.number < currentStep;

          return (
            <div
              key={step.number}
              className="flex flex-col items-center relative z-10"
            >
              <button
                type="button"
                onClick={() => canClick && onStepClick?.(step.number)}
                disabled={!canClick && !isCurrent}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                  isCompleted && !isCurrent
                    ? "bg-primary border-primary text-primary-foreground cursor-pointer hover:bg-primary/90"
                    : isCurrent
                    ? "bg-primary border-primary text-primary-foreground scale-110 shadow-md"
                    : "bg-background border-muted-foreground/30 text-muted-foreground",
                  canClick && !isCurrent && "cursor-pointer hover:border-primary/50"
                )}
              >
                {isCompleted && !isCurrent ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.icon
                )}
              </button>
              <span
                className={cn(
                  "mt-1.5 text-[10px] font-medium transition-colors sm:text-xs",
                  isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span className="sm:hidden">{step.shortTitle}</span>
                <span className="hidden sm:inline">{step.title}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
