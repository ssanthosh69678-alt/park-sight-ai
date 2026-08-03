import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Every simulated figure in the product must carry this marker. */
export function DemoBadge({ className, label = "DEMO / SIMULATED DATA" }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-warning",
        className,
      )}
    >
      <FlaskConical className="size-3" />
      {label}
    </span>
  );
}
