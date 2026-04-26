import { cn } from "@/lib/utils";

interface ConfidenceBarProps {
  score: number;
  label?: string;
  className?: string;
}

export function ConfidenceBar({ score, label, className }: ConfidenceBarProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-xs font-medium text-foreground">{score}%</span>
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
