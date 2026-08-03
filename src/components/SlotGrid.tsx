import { cn } from "@/lib/utils";
import type { ParkingSlot, SlotStatus } from "@/lib/parking";

const statusStyles: Record<SlotStatus, string> = {
  available: "border-success/40 bg-success/12 text-success hover:bg-success/20",
  occupied: "border-destructive/40 bg-destructive/12 text-destructive hover:bg-destructive/20",
  unknown: "border-warning/40 bg-warning/12 text-warning hover:bg-warning/20",
};

export function SlotLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-success" /> Available
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-destructive" /> Occupied
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-warning" /> Unknown / processing
      </span>
    </div>
  );
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
      {slots.map((slot) => (
        <button
          key={slot.id}
          type="button"
          onClick={() => onSelect?.(slot)}
          aria-label={`Slot ${slot.slot_number} — ${slot.status}`}
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            statusStyles[slot.status],
            selectedId === slot.id && "ring-2 ring-ring ring-offset-2 ring-offset-background",
          )}
        >
          <span className="tabular-nums">{slot.slot_number}</span>
          <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
            {slot.status === "available" ? "free" : slot.status === "occupied" ? "busy" : "?"}
          </span>
        </button>
      ))}
    </div>
  );
}
