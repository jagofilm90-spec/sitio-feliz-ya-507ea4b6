import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
  labelClassName?: string;
}

const SIZE_PX = { sm: 14, md: 18, lg: 22 };

function starsFromScore(score: number | null): number {
  if (score === null || score === undefined) return 0;
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}

export const StarRating = ({
  score,
  size = "md",
  showLabel = false,
  label,
  labelClassName,
}: StarRatingProps) => {
  const filled = starsFromScore(score);
  const px = SIZE_PX[size];

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            size={px}
            className={cn(
              "transition-colors",
              i < filled ? "fill-amber-500 text-amber-500" : "fill-ink-100 text-ink-200"
            )}
          />
        ))}
      </div>
      {showLabel && label && (
        <span className={cn("text-[11px] uppercase tracking-wider font-medium", labelClassName)}>
          {label}
        </span>
      )}
    </div>
  );
};
