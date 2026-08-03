import { useMemo } from "react";
import { useRecords, useSlots } from "./data";
import { occupancyPct, type ParkingArea } from "./parking";
import { mean } from "./stats";

/** Derives live KPI values for an area from its slots and occupancy history. */
export function useAreaStatus(area: ParkingArea | undefined) {
  const { data: slots, isLoading: slotsLoading } = useSlots(area?.id);
  const { data: records, isLoading: recordsLoading } = useRecords(area?.id);

  return useMemo(() => {
    const capacity = area?.capacity ?? 0;
    const list = slots ?? [];
    const occupied = list.filter((s) => s.status === "occupied").length;
    const available = list.filter((s) => s.status === "available").length;
    const unknown = list.filter((s) => s.status === "unknown").length;
    const configured = list.length;
    const pct = occupancyPct(occupied, configured || capacity);

    // Peak hour = hour of day with the highest average occupancy in history.
    const byHour = new Map<number, number[]>();
    for (const r of records ?? []) {
      const h = new Date(r.recorded_at).getHours();
      byHour.set(h, [...(byHour.get(h) ?? []), r.occupancy_percentage]);
    }
    let peakHour: number | null = null;
    let peakValue = -1;
    for (const [h, values] of byHour) {
      const m = mean(values);
      if (m > peakValue) {
        peakValue = m;
        peakHour = h;
      }
    }

    return {
      capacity,
      configured,
      occupied,
      available: configured ? available : Math.max(0, capacity - occupied),
      unknown,
      occupancyPct: pct,
      peakHour,
      peakValue: peakValue < 0 ? 0 : Math.round(peakValue),
      records: records ?? [],
      slots: list,
      loading: slotsLoading || recordsLoading,
    };
  }, [area, slots, records, slotsLoading, recordsLoading]);
}

export function formatHour(hour: number | null) {
  if (hour === null) return "—";
  const suffix = hour < 12 ? "AM" : "PM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:00 ${suffix}`;
}
