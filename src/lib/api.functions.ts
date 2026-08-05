import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  FlaskAnalytics,
  FlaskCameraSession,
  FlaskForecast,
  FlaskRecord,
  FlaskResult,
  FlaskStatus,
} from "@/lib/api";

/**
 * Thin RPC wrappers around the Flask REST API. Handlers import the HTTP
 * client lazily so nothing server-only leaks into the client bundle.
 */

export const getParkingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { areaId: string; capacity: number; slots: { slot_number: string; status: string }[] }) =>
      input,
  )
  .handler(async ({ data }): Promise<FlaskResult<FlaskStatus>> => {
    const { fetchStatus } = await import("@/lib/api.server");
    return fetchStatus(data);
  });

export const getParkingAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { areaId: string; records: FlaskRecord[] }) => input)
  .handler(async ({ data }): Promise<FlaskResult<FlaskAnalytics>> => {
    const { fetchAnalytics } = await import("@/lib/api.server");
    return fetchAnalytics(data);
  });

export const getOccupancyForecast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { areaId: string; history: FlaskRecord[]; horizonHours: number }) => input)
  .handler(async ({ data }): Promise<FlaskResult<FlaskForecast>> => {
    const { fetchForecast } = await import("@/lib/api.server");
    return fetchForecast(data);
  });

export const startCameraSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { areaId: string; source: string }) => input)
  .handler(async ({ data }): Promise<FlaskResult<FlaskCameraSession>> => {
    const { startCamera } = await import("@/lib/api.server");
    return startCamera(data);
  });

export const stopCameraSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { areaId: string }) => input)
  .handler(async ({ data }): Promise<FlaskResult<FlaskCameraSession>> => {
    const { stopCamera } = await import("@/lib/api.server");
    return stopCamera(data);
  });
