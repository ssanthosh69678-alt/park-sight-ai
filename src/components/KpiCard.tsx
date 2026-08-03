import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "destructive" | "warning" | "muted";

const toneMap: Record<Tone, string> = {
  primary: "bg-primary/12 text-primary",
  success: "bg-success/15 text-success",
  destructive: "bg-destructive/12 text-destructive",
  warning: "bg-warning/15 text-warning",
  muted: "bg-muted text-muted-foreground",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-card group p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
          {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", toneMap[tone])}>
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}
