import { cn } from "@/lib/utils";
import type { ParkingSlot, SlotStatus } from "@/lib/parking";
import { SLOT_STATUS_META } from "@/lib/parking";

const statusStyles: Record<SlotStatus, string> = {
  available: "border-success/40 bg-success/12 text-success hover:bg-success/20",
  occupied: "border-destructive/40 bg-destructive/12 text-destructive hover:bg-destructive/20",
  reserved: "border-primary/40 bg-primary/12 text-primary hover:bg-primary/20",
  maintenance: "border-warning/40 bg-warning/12 text-warning hover:bg-warning/20",
  offline: "border-border bg-muted text-muted-foreground hover:bg-muted/80",
  unknown: "border-warning/40 bg-warning/12 text-warning hover:bg-warning/20",
};

export function SlotLegend() {
  const items: SlotStatus[] = ["available", "occupied", "reserved", "maintenance"];
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {items.map((s) => {
        const meta = SLOT_STATUS_META[s];
        return (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", dotColor(s))} />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

function dotColor(s: SlotStatus) {
  switch (s) {
    case "available":
      return "bg-success";
    case "occupied":
      return "bg-destructive";
    case "reserved":
      return "bg-primary";
    case "maintenance":
      return "bg-warning";
    default:
      return "bg-muted-foreground";
  }
}

export function SlotGrid({
  slots,
  selectedId,
  onSelect,
}: {
  slots: ParkingSlot[];
  selectedId?: string;
  onSelect?: (slot: ParkingSlot) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10">
      {slots.map((slot) => {
        const meta = SLOT_STATUS_META[slot.status] ?? SLOT_STATUS_META.unknown;
        return (
          <button
            key={slot.id}
            type="button"
            onClick={() => onSelect?.(slot)}
            aria-label={`Slot ${slot.slot_number} — ${meta.label}`}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              statusStyles[slot.status] ?? statusStyles.unknown,
              selectedId === slot.id && "ring-2 ring-ring ring-offset-2 ring-offset-background",
            )}
          >
            <span className="tabular-nums">{slot.slot_number}</span>
            <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
              {meta.short}
            </span>
          </button>
        );
      })}
    </div>
  );
}
