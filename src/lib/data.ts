import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Alert, ParkingArea, ParkingRecord, ParkingSlot, Prediction, SlotStatus } from "./parking";

/**
 * Data access layer.
 * Every query runs through Lovable Cloud with row-level security, so a user
 * can only ever read or write rows belonging to their own account.
 */

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAreas(userId: string | undefined) {
  return useQuery({
    queryKey: ["areas", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parking_areas")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as ParkingArea[];
    },
  });
}

export function useSlots(areaId: string | undefined) {
  return useQuery({
    queryKey: ["slots", areaId],
    enabled: !!areaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parking_slots")
        .select("*")
        .eq("area_id", areaId!)
        .order("slot_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ParkingSlot[];
    },
  });
}

export function useRecords(areaId: string | undefined, limit = 800) {
  return useQuery({
    queryKey: ["records", areaId, limit],
    enabled: !!areaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parking_records")
        .select("*")
        .eq("area_id", areaId!)
        .order("recorded_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data ?? []) as unknown as ParkingRecord[]).reverse();
    },
  });
}

export function usePredictions(areaId: string | undefined) {
  return useQuery({
    queryKey: ["predictions", areaId],
    enabled: !!areaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("area_id", areaId!)
        .order("prediction_time", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as Prediction[];
    },
  });
}

export function useAlerts(userId: string | undefined) {
  return useQuery({
    queryKey: ["alerts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as Alert[];
    },
  });
}

export function useUpdateSlotStatus(areaId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SlotStatus }) => {
      const { error } = await supabase.from("parking_slots").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["slots", areaId] }),
  });
}

export async function createAlert(input: {
  user_id: string;
  area_id: string | null;
  alert_type: string;
  severity: string;
  message: string;
}) {
  await supabase.from("alerts").insert(input);
}
