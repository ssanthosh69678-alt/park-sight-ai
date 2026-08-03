import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { EmptyAreaState } from "@/components/EmptyAreaState";
import { PageHeader } from "@/components/AppShell";
import { SlotGrid, SlotLegend } from "@/components/SlotGrid";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useArea } from "@/lib/area";
import type { ParkingSlot, SlotStatus } from "@/lib/parking";

const SLOT_STATUSES: SlotStatus[] = ["available", "occupied", "unknown"];
import { useAreaStatus } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/slots")({
  head: () => ({
    meta: [
      { title: "Slot Management — ParkSight AI" },
      { name: "description", content: "Configure individual parking slots, their numbers and current status." },
      { property: "og:title", content: "Slot Management — ParkSight AI" },
      { property: "og:description", content: "Configure individual parking slots, their numbers and current status." },
    ],
  }),
  component: SlotsPage,
});

function SlotsPage() {
  const { area } = useArea();
  const status = useAreaStatus(area);
  const qc = useQueryClient();

  async function cycle(id: string, current: SlotStatus) {
    const order: SlotStatus[] = ["available", "occupied", "unknown"];
    const next = order[(order.indexOf(current) + 1) % order.length] as SlotStatus;
    const { error } = await supabase.from("parking_slots").update({ status: next }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries();
  }

  if (!area) return <EmptyAreaState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Slot Management"
        description={`${status.configured} of ${area.capacity} slots configured for ${area.area_name}. Click a slot to change its status.`}
        actions={<SlotLegend />}
      />
      <div className="surface-card p-5">
        <SlotGrid slots={status.slots} onSelect={(s: ParkingSlot) => cycle(s.id, s.status)} />
      </div>
      <div className="surface-card p-5">
        <h2 className="font-semibold">Status reference</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {SLOT_STATUSES.map((s) => (
            <Button key={s} variant="outline" size="sm" className="capitalize" disabled>
              {s}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
