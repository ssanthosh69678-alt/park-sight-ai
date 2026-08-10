export type SlotStatus = "available" | "occupied" | "reserved" | "maintenance" | "offline" | "unknown";

export type VehicleType = "car" | "bike";

export const VEHICLE_CATEGORIES: { value: VehicleType; label: string }[] = [
  { value: "car", label: "Car" },
  { value: "bike", label: "Bike / Scooter" },
];

export type ParkingArea = {
  id: string;
  user_id: string;
  area_name: string;
  location: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  description: string | null;
  capacity: number;
  parking_type: string;
  camera_image_url: string | null;
  camera_stream_url: string | null;
  demo_mode: boolean;
  created_at: string;
  updated_at: string;
  latitude: number | null;
  longitude: number | null;
  opening_time: string;
  closing_time: string;
  vehicle_types: string[];
  price_bike: number;
  price_car: number;
  price_suv: number;
  price_truck: number;
  price_hourly: number;
  price_daily: number;
  rating: number;
  is_active: boolean;
  parking_rules: string | null;
  contact_number: string | null;
};

export type ParkingSlot = {
  id: string;
  area_id: string;
  slot_number: string;
  coordinates: { x?: number; y?: number; w?: number; h?: number } | null;
  status: SlotStatus;
  vehicle_type: string;
  updated_at: string;
  created_at: string;
};

export type ParkingRecord = {
  id: string;
  area_id: string;
  recorded_at: string;
  occupied: number;
  available: number;
  occupancy_percentage: number;
  source: string;
};

export type Prediction = {
  id: string;
  area_id: string;
  prediction_time: string;
  predicted_occupancy: number;
  predicted_occupied: number;
  predicted_available: number;
  status: AvailabilityLevel;
  confidence: number | null;
  model_version: string;
  is_simulated: boolean;
};

export type Alert = {
  id: string;
  user_id: string;
  area_id: string | null;
  alert_type: string;
  severity: "info" | "warning" | "critical" | string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type AvailabilityLevel = "LOW" | "MODERATE" | "HIGH" | "NEARLY FULL";

export const PARKING_TYPES = [
  { value: "outdoor", label: "Outdoor lot" },
  { value: "indoor", label: "Indoor garage" },
  { value: "multilevel", label: "Multi-level" },
  { value: "street", label: "Street side" },
  { value: "campus", label: "Campus / institutional" },
];

export const SLOT_STATUS_LIST: SlotStatus[] = ["available", "occupied", "reserved", "maintenance"];

export const SLOT_STATUS_META: Record<SlotStatus, { label: string; short: string; color: string }> = {
  available: { label: "Available", short: "free", color: "success" },
  occupied: { label: "Occupied", short: "busy", color: "destructive" },
  reserved: { label: "Reserved", short: "held", color: "primary" },
  maintenance: { label: "Maintenance", short: "maint", color: "warning" },
  offline: { label: "Offline", short: "off", color: "muted" },
  unknown: { label: "Unknown", short: "?", color: "warning" },
};

export function availabilityLevel(occupancyPct: number): AvailabilityLevel {
  if (occupancyPct >= 90) return "NEARLY FULL";
  if (occupancyPct >= 70) return "HIGH";
  if (occupancyPct >= 40) return "MODERATE";
  return "LOW";
}

export function levelTone(level: AvailabilityLevel) {
  switch (level) {
    case "NEARLY FULL":
      return "destructive";
    case "HIGH":
      return "warning";
    case "MODERATE":
      return "primary";
    default:
      return "success";
  }
}

export function statusLabel(status: SlotStatus) {
  return SLOT_STATUS_META[status]?.label ?? status;
}

export function occupancyPct(occupied: number, capacity: number) {
  if (!capacity) return 0;
  return Math.round((occupied / capacity) * 1000) / 10;
}

/** Haversine distance in km between two lat/lng points. */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
