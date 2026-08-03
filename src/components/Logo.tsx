import { Car } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground glow-ring">
        <Car className="size-5" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-tight">
            Park<span className="text-primary">Sight</span> AI
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Smart Parking
          </span>
        </span>
      )}
    </span>
  );
}
