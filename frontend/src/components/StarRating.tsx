import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export function StarRating({ rating, maxStars = 5, size = 16, interactive = false, onRate }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5 select-none">
      {Array.from({ length: maxStars }, (_, i) => {
        const fillPercentage = Math.max(0, Math.min(100, (rating - i) * 100));

        return (
          <div
            key={i}
            className={cn("relative inline-flex items-center justify-center", interactive && "cursor-pointer")}
            onClick={() => interactive && onRate?.(i + 1)}
          >
            {/* Empty star outline / background */}
            <Star
              size={size}
              className={cn(
                "transition-colors fill-none text-muted-foreground/40",
                interactive && "hover:text-primary"
              )}
            />
            {/* Partially or fully filled overlay */}
            {fillPercentage > 0 && (
              <div
                className="absolute top-0 left-0 bottom-0 overflow-hidden"
                style={{ width: `${fillPercentage}%` }}
              >
                <Star
                  size={size}
                  className="fill-primary text-primary shrink-0"
                  style={{ minWidth: `${size}px`, width: `${size}px` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

