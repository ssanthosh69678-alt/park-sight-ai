import type {
  FlaskAnalytics,
  FlaskCameraSession,
  FlaskForecast,
  FlaskRecord,
  FlaskResult,
  FlaskStatus,
} from "./api";
import { getDetectionEndpoint } from "./detection.server";

/**
 * Server-only HTTP client for the Flask REST API.
 * Never throws for connectivity problems — callers get a discriminated
 * `FlaskResult` so the UI can fall back to in-app computation.
 */
async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<FlaskResult<T>> {
  const endpoint = getDetectionEndpoint();
  if (!endpoint) {
    return {
      online: false,
      error: "Flask API not connected — set DETECTION_API_URL to your service (see /backend).",
    };
  }

  const key = process.env["DETECTION_API_KEY"];
  try {
    const response = await fetch(`${endpoint}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "X-API-Key": key } : {}),
      },
      ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });
    const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!response.ok || !payload) {
      return { online: false, error: payload?.error ?? `Flask API responded with ${response.status}` };
    }
    return { online: true, data: payload };
  } catch (error) {
    return { online: false, error: error instanceof Error ? error.message : "Flask API unreachable" };
  }
}

export function fetchStatus(input: {
  areaId: string;
  capacity: number;
  slots: { slot_number: string; status: string }[];
}) {
  return call<FlaskStatus>("/api/status", {
    method: "POST",
    body: { area_id: input.areaId, capacity: input.capacity, slots: input.slots },
  });
}

export function fetchAnalytics(input: { areaId: string; records: FlaskRecord[] }) {
  return call<FlaskAnalytics>("/api/analytics", {
    method: "POST",
    body: { area_id: input.areaId, records: input.records },
  });
}

export function fetchForecast(input: { areaId: string; history: FlaskRecord[]; horizonHours: number }) {
  return call<FlaskForecast>("/api/predict", {
    method: "POST",
    body: { area_id: input.areaId, history: input.history, horizon_hours: input.horizonHours },
  });
}

export function startCamera(input: { areaId: string; source: string }) {
  return call<FlaskCameraSession>("/api/camera/start", {
    method: "POST",
    body: { area_id: input.areaId, source: input.source },
  });
}

export function stopCamera(input: { areaId: string }) {
  return call<FlaskCameraSession>("/api/camera/stop", {
    method: "POST",
    body: { area_id: input.areaId },
  });
}
