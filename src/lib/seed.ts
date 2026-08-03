import { supabase } from "@/integrations/supabase/client";
import { generateHistory } from "./demo";
import { occupancyPct, type SlotStatus } from "./parking";
import { simulateFrame } from "./demo";

/**
 * DEMO MODE seeding.
 * Creates a parking area with slots, 14 days of simulated hourly occupancy
 * history and a few starter alerts. Everything written here is marked
 * `source: 'demo'` / `is_simulated: true` so the UI can label it.
 */
export async function seedDemoArea(userId: string) {
  const capacity = 50;
  const { data: area, error } = await supabase
    .from("parking_areas")
    .insert({
      user_id: userId,
      area_name: "Central Campus Lot A",
      location: "Main Gate, Block A",
      description: "Demo parking area seeded with simulated occupancy data.",
      capacity,
      parking_type: "outdoor",
      demo_mode: true,
    })
    .select()
    .single();
  if (error || !area) throw error ?? new Error("Could not create demo area");

  await seedSlots(area.id, capacity);
  await seedHistory(area.id, capacity);

  const frame = simulateFrame(capacity);
  await supabase.from("alerts").insert([
    {
      user_id: userId,
      area_id: area.id,
      alert_type: "demo_ready",
      severity: "info",
      message: "Demo Mode enabled for Central Campus Lot A — all figures are simulated.",
    },
    {
      user_id: userId,
      area_id: area.id,
      alert_type: "occupancy",
      severity: frame.available <= 5 ? "critical" : "warning",
      message: `Central Campus Lot A is ${occupancyPct(frame.occupied, capacity)}% occupied. Only ${frame.available} slots remain.`,
    },
  ]);

  return area.id as string;
}

/** Creates P01..Pnn slots laid out in a grid over the camera image. */
export async function seedSlots(areaId: string, count: number, startAt = 0) {
  const cols = 10;
  const rows = [];
  for (let i = 0; i < count; i++) {
    const idx = startAt + i;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const frame = simulateFrame(1);
    rows.push({
      area_id: areaId,
      slot_number: `P${String(idx + 1).padStart(2, "0")}`,
      coordinates: { x: 4 + col * 9.4, y: 8 + row * 14, w: 8, h: 11 },
      status: (frame.occupied ? "occupied" : "available") as SlotStatus,
    });
  }
  const { error } = await supabase.from("parking_slots").insert(rows);
  if (error) throw error;
}

/** Writes simulated hourly history rows for the past two weeks. */
export async function seedHistory(areaId: string, capacity: number) {
  const history = generateHistory(capacity, 14).map((r) => ({
    area_id: areaId,
    recorded_at: r.recorded_at,
    occupied: r.occupied,
    available: r.available,
    occupancy_percentage: r.occupancy_percentage,
    source: "demo",
  }));
  // Insert in chunks to stay within request limits.
  for (let i = 0; i < history.length; i += 120) {
    const { error } = await supabase.from("parking_records").insert(history.slice(i, i + 120));
    if (error) throw error;
  }
}
