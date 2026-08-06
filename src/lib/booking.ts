import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ParkingArea } from "./parking";

export type VehicleType = "bike" | "car" | "suv" | "truck";

export const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: "bike", label: "Bike / Scooter" },
  { value: "car", label: "Car" },
  { value: "suv", label: "SUV" },
  { value: "truck", label: "Truck" },
];

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "rejected";

export type PaymentMethod = "upi" | "card" | "netbanking" | "wallet";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "netbanking", label: "Net Banking" },
  { value: "wallet", label: "Wallet" },
];

export type Booking = {
  id: string;
  booking_ref: string;
  customer_id: string;
  area_id: string;
  slot_id: string | null;
  vehicle_type: string;
  vehicle_number: string;
  start_time: string;
  end_time: string;
  hours: number;
  amount: number;
  status: BookingStatus | string;
  payment_status: string;
  notes: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  booking_id: string;
  customer_id: string;
  area_id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transaction_ref: string;
  receipt_no: string;
  paid_at: string | null;
  created_at: string;
};

/** Hourly rate for a vehicle type, falling back to the generic hourly price. */
export function rateFor(area: Pick<ParkingArea, "id"> & Record<string, unknown>, vehicle: VehicleType) {
  const key = `price_${vehicle}` as const;
  const specific = Number(area[key] ?? 0);
  if (specific > 0) return specific;
  return Number(area["price_hourly"] ?? 0);
}

export function quote(area: Record<string, unknown>, vehicle: VehicleType, hours: number) {
  const hourly = rateFor(area as never, vehicle);
  const daily = Number(area["price_daily"] ?? 0);
  const byHour = hourly * hours;
  // A full day never costs more than the daily cap.
  const days = Math.floor(hours / 24);
  const capped = daily > 0 ? days * daily + rateFor(area as never, vehicle) * (hours % 24) : byHour;
  return Math.round(Math.min(byHour, capped || byHour) * 100) / 100;
}

/* ---------------- Customer-facing ---------------- */

export function useSearchAreas() {
  return useQuery({
    queryKey: ["public-areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parking_areas")
        .select("*")
        .eq("is_active", true)
        .order("rating", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as (ParkingArea & Record<string, number | string>)[];
    },
  });
}

export function useMyBookings(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-bookings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, parking_areas(area_name, address, location)")
        .eq("customer_id", userId!)
        .order("start_time", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as (Booking & {
        parking_areas: { area_name: string; address: string; location: string } | null;
      })[];
    },
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      customer_id: string;
      area_id: string;
      slot_id?: string | null;
      vehicle_type: VehicleType;
      vehicle_number: string;
      start_time: string;
      end_time: string;
      hours: number;
      amount: number;
    }) => {
      const { data, error } = await supabase
        .from("bookings")
        .insert({ ...input, status: "pending", payment_status: "unpaid" })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Booking;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function usePayForBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      booking: Booking;
      method: PaymentMethod;
    }) => {
      const { booking, method } = input;
      const { data, error } = await supabase
        .from("payments")
        .insert({
          booking_id: booking.id,
          customer_id: booking.customer_id,
          area_id: booking.area_id,
          amount: booking.amount,
          method,
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      const { error: upErr } = await supabase
        .from("bookings")
        .update({ payment_status: "paid", status: "confirmed" })
        .eq("id", booking.id);
      if (upErr) throw upErr;

      await supabase.from("notifications").insert({
        user_id: booking.customer_id,
        title: "Booking confirmed",
        message: `Booking ${booking.booking_ref} is confirmed and paid.`,
        type: "booking",
      });

      return data as unknown as Payment;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useFavorites(userId: string | undefined) {
  return useQuery({
    queryKey: ["favorites", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("*").eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as { id: string; area_id: string }[];
    },
  });
}

export function useToggleFavorite(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ areaId, existingId }: { areaId: string; existingId?: string }) => {
      if (existingId) {
        const { error } = await supabase.from("favorites").delete().eq("id", existingId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("favorites").insert({ user_id: userId!, area_id: areaId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites", userId] }),
  });
}

/* ---------------- Owner-facing ---------------- */

export function useOwnerBookings(areaIds: string[]) {
  return useQuery({
    queryKey: ["owner-bookings", areaIds.join(",")],
    enabled: areaIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .in("area_id", areaIds)
        .order("start_time", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Booking[];
    },
  });
}

export function useOwnerPayments(areaIds: string[]) {
  return useQuery({
    queryKey: ["owner-payments", areaIds.join(",")],
    enabled: areaIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .in("area_id", areaIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Payment[];
    },
  });
}

export function useSetBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function bookingTone(status: string) {
  switch (status) {
    case "confirmed":
    case "completed":
      return "text-success";
    case "cancelled":
    case "rejected":
      return "text-destructive";
    case "active":
      return "text-primary";
    default:
      return "text-warning";
  }
}

export function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}
