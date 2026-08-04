import type { DetectionBox, DetectionResult, PipelineHealth } from "./detection";
import { expectedOccupancyRatio } from "./demo";

/**
 * Server-side helpers shared by the detection server functions and the
 * public pipeline routes. Kept out of *.functions.ts so the server-fn
 * splitter never drops them.
 */

export function getDetectionEndpoint(): string | null {
  return process.env["DETECTION_API_URL"]?.replace(/\/+$/, "") ?? null;
}

export function simulateDetection(slotCount: number, slotNumbers?: string[]): DetectionResult {
  const started = Date.now();
  const now = new Date();
  const ratio = expectedOccupancyRatio(now.getHours(), now.getDay());
  const boxes: DetectionBox[] = [];
  const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, slotCount))));

  for (let i = 0; i < slotCount; i++) {
    const occupied = Math.random() < ratio;
    boxes.push({
      slot_number: slotNumbers?.[i] ?? `S${String(i + 1).padStart(2, "0")}`,
      status: occupied ? "occupied" : "available",
      confidence: Math.round((0.72 + Math.random() * 0.26) * 100) / 100,
      x: Math.round(((i % cols) / cols) * 1000) / 1000,
      y: Math.round((Math.floor(i / cols) / cols) * 1000) / 1000,
      w: Math.round((1 / cols) * 1000) / 1000,
      h: Math.round((1 / cols) * 1000) / 1000,
    });
  }

  const occupied = boxes.filter((b) => b.status === "occupied").length;
  return {
    mode: "demo",
    simulated: true,
    occupied,
    available: slotCount - occupied,
    total: slotCount,
    occupancy_percentage: slotCount ? Math.round((occupied / slotCount) * 1000) / 10 : 0,
    boxes,
    model: "simulator-v1",
    inference_ms: Date.now() - started + Math.round(8 + Math.random() * 22),
    captured_at: now.toISOString(),
  };
}

/** POST a frame to the self-hosted Flask + YOLO service. */
export async function runRealDetection(input: {
  imageBase64?: string;
  slots?: { slot_number: string; coordinates: unknown }[];
}): Promise<DetectionResult> {
  const endpoint = getDetectionEndpoint();
  if (!endpoint) {
    throw new Error(
      "Real Mode is not connected. Set DETECTION_API_URL to your self-hosted YOLO service (see /backend).",
    );
  }

  const started = Date.now();
  const response = await fetch(`${endpoint}/api/detect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env["DETECTION_API_KEY"] ? { "X-API-Key": process.env["DETECTION_API_KEY"] } : {}),
    },
    body: JSON.stringify({ image: input.imageBase64 ?? null, slots: input.slots ?? [] }),
  });

  if (!response.ok) {
    throw new Error(`Detection service responded with ${response.status}`);
  }

  const payload = (await response.json()) as Partial<DetectionResult> & { boxes?: DetectionBox[] };
  const boxes = payload.boxes ?? [];
  const occupied = payload.occupied ?? boxes.filter((b) => b.status === "occupied").length;
  const total = payload.total ?? boxes.length;

  return {
    mode: "real",
    simulated: false,
    occupied,
    available: payload.available ?? Math.max(0, total - occupied),
    total,
    occupancy_percentage:
      payload.occupancy_percentage ?? (total ? Math.round((occupied / total) * 1000) / 10 : 0),
    boxes,
    model: payload.model ?? "yolov8n",
    inference_ms: payload.inference_ms ?? Date.now() - started,
    captured_at: payload.captured_at ?? new Date().toISOString(),
  };
}

export async function checkPipelineHealth(): Promise<PipelineHealth> {
  const endpoint = getDetectionEndpoint();
  if (!endpoint) {
    return {
      mode: "demo",
      online: false,
      endpoint: null,
      model: "simulator-v1",
      message: "No detection service configured — the app runs on DEMO / SIMULATED DATA.",
    };
  }
  try {
    const response = await fetch(`${endpoint}/api/health`, { method: "GET" });
    const payload = (await response.json().catch(() => ({}))) as { model?: string };
    return {
      mode: "real",
      online: response.ok,
      endpoint,
      model: payload.model ?? "yolov8n",
      message: response.ok ? "YOLO pipeline reachable." : `Service returned ${response.status}.`,
    };
  } catch (error) {
    return {
      mode: "real",
      online: false,
      endpoint,
      model: "unknown",
      message: error instanceof Error ? error.message : "Detection service unreachable.",
    };
  }
}
