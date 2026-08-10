import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { EmptyAreaState } from "@/components/EmptyAreaState";
import { PageHeader } from "@/components/AppShell";
import { SlotGrid, SlotLegend } from "@/components/SlotGrid";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useArea } from "@/lib/area";
import { SLOT_STATUS_LIST, type ParkingSlot, type SlotStatus } from "@/lib/parking";
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
  const [selected, setSelected] = useState<ParkingSlot | null>(null);

  async function setStatus(id: string, next: SlotStatus) {
    const { error } = await supabase.from("parking_slots").update({ status: next }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries();
    setSelected(null);
    toast.success(`Slot marked ${next}`);
  }

  if (!area) return <EmptyAreaState />;

  const counts = status.slots.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Slot Management"
        description={`${status.configured} of ${area.capacity} slots configured for ${area.area_name}. Click a slot to change its status.`}
        actions={<SlotLegend />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total slots", status.configured],
          ["Available", counts["available"] ?? 0],
          ["Occupied", counts["occupied"] ?? 0],
          ["Reserved", counts["reserved"] ?? 0],
        ].map(([label, val]) => (
          <div key={String(label)} className="surface-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{val}</p>
          </div>
        ))}
      </div>

      <div className="surface-card p-5">
        <SlotGrid slots={status.slots} onSelect={setSelected} />
      </div>

      {selected && (
        <div className="surface-card p-5">
          <h2 className="font-semibold">Slot {selected.slot_number}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Current status: {selected.status}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SLOT_STATUS_LIST.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={selected.status === s ? "default" : "outline"}
                className="capitalize"
                onClick={() => setStatus(selected.id, s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
