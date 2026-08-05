import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, CameraOff, CircleDot, Cpu, Loader2, Radio } from "lucide-react";
import { toast } from "sonner";

import { DemoBadge } from "@/components/DemoBadge";
import { EmptyAreaState } from "@/components/EmptyAreaState";
import { PageHeader } from "@/components/AppShell";
import { SlotGrid, SlotLegend } from "@/components/SlotGrid";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useArea } from "@/lib/area";
import type { FlaskCameraSession, FlaskStatus } from "@/lib/api";
import { getParkingStatus, startCameraSession, stopCameraSession } from "@/lib/api.functions";
import { detectFrame, getPipelineHealth } from "@/lib/detection.functions";
import {
  DETECTION_MODES,
  DETECTION_MODE_STORAGE_KEY,
  type DetectionMode,
  type DetectionResult,
} from "@/lib/detection";
import { occupancyPct } from "@/lib/parking";
import { useAreaStatus } from "@/lib/status";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/live")({
  head: () => ({
    meta: [
      { title: "Live Monitoring — ParkSight AI" },
      { name: "description", content: "Stream your camera and run the parking occupancy detection pipeline in real time." },
      { property: "og:title", content: "Live Monitoring — ParkSight AI" },
      { property: "og:description", content: "Stream your camera and run the parking occupancy detection pipeline in real time." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const { area } = useArea();
  const status = useAreaStatus(area);
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [on, setOn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<DetectionMode>("demo");
  const [last, setLast] = useState<DetectionResult | null>(null);
  const [session, setSession] = useState<FlaskCameraSession | null>(null);
  const [apiStatus, setApiStatus] = useState<FlaskStatus | null>(null);

  const runDetection = useServerFn(detectFrame);
  const fetchHealth = useServerFn(getPipelineHealth);
  const startSession = useServerFn(startCameraSession);
  const stopSession = useServerFn(stopCameraSession);
  const fetchStatus = useServerFn(getParkingStatus);
  const health = useQuery({ queryKey: ["pipeline-health"], queryFn: () => fetchHealth({}) });

  useEffect(() => {
    const saved = window.localStorage.getItem(DETECTION_MODE_STORAGE_KEY);
    if (saved === "real" || saved === "demo") setMode(saved);
  }, []);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  function selectMode(next: DetectionMode) {
    setMode(next);
    window.localStorage.setItem(DETECTION_MODE_STORAGE_KEY, next);
    if (next === "real" && !health.data?.online) {
      toast.warning("Real Mode needs the self-hosted YOLO service — see backend/README.md");
    }
  }

  /** Asks the Flask API for the authoritative occupancy summary of this area. */
  async function refreshApiStatus() {
    if (!area) return;
    const result = await fetchStatus({
      data: {
        areaId: area.id,
        capacity: status.configured || area.capacity,
        slots: status.slots.map((s) => ({ slot_number: s.slot_number, status: s.status })),
      },
    });
    setApiStatus(result.online ? result.data : null);
  }

  async function toggle() {
    if (!area) return;
    if (on) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setOn(false);
      const stopped = await stopSession({ data: { areaId: area.id } });
      if (stopped.online) {
        setSession(stopped.data);
        toast.success(`Camera session closed after ${stopped.data.duration_seconds ?? 0}s`);
      } else {
        setSession(null);
      }
      await refreshApiStatus();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setOn(true);
      const started = await startSession({ data: { areaId: area.id, source: "browser" } });
      if (started.online) {
        setSession(started.data);
        toast.success(`Camera session ${started.data.session_id.slice(0, 8)} streaming`);
      } else {
        setSession(null);
      }
      await refreshApiStatus();
    } catch {
      toast.error("Camera permission denied or unavailable");
    }
  }


  /** Grabs the current video frame as a JPEG data URL for the YOLO pipeline. */
  function grabFrame(): string | undefined {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return undefined;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  }

  async function captureFrame() {
    if (!area) return;
    if (mode === "real" && !on) {
      toast.error("Start the camera before running Real Mode inference");
      return;
    }
    setSaving(true);
    try {
      const capacity = status.configured || area.capacity;
      const slotNumbers = status.slots.map((s) => s.slot_number);
      const image = mode === "real" ? grabFrame() : undefined;

      const result = await runDetection({
        data: {
          mode,
          slotCount: capacity,
          ...(slotNumbers.length ? { slotNumbers } : {}),
          ...(image ? { imageBase64: image } : {}),
        },
      });
      setLast(result);

      const { error } = await supabase.from("parking_records").insert({
        area_id: area.id,
        recorded_at: result.captured_at,
        occupied: result.occupied,
        available: result.available,
        occupancy_percentage: result.total
          ? result.occupancy_percentage
          : occupancyPct(result.occupied, capacity),
        source: result.simulated ? "demo" : "yolo",
      });
      if (error) throw error;

      // Push per-slot statuses back onto the configured slot map.
      const byNumber = new Map(result.boxes.map((b) => [b.slot_number, b.status]));
      await Promise.all(
        status.slots
          .filter((s) => byNumber.has(s.slot_number))
          .map((s) =>
            supabase.from("parking_slots").update({ status: byNumber.get(s.slot_number)! }).eq("id", s.id),
          ),
      );

      await qc.invalidateQueries();
      toast.success(
        `${result.simulated ? "Simulated" : "YOLO"} frame — ${result.occupied} occupied, ${result.available} free (${result.inference_ms} ms)`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not run detection");
    } finally {
      setSaving(false);
    }
  }

  const activeMode = useMemo(() => DETECTION_MODES.find((m) => m.value === mode)!, [mode]);

  if (!area) return <EmptyAreaState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Monitoring"
        description="One adapter, two providers: the built-in simulator or a self-hosted Flask + YOLO/OpenCV pipeline. Both return identical detection results."
        actions={
          <>
            {mode === "demo" && <DemoBadge label="SIMULATED DETECTION" />}
            <Button onClick={toggle} variant={on ? "outline" : "default"}>
              {on ? <CameraOff className="mr-2 size-4" /> : <Camera className="mr-2 size-4" />}
              {on ? "Stop camera" : "Start camera"}
            </Button>
            <Button onClick={captureFrame} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />} Analyse frame
            </Button>
          </>
        }
      />

      {/* Detection adapter -------------------------------------------------- */}
      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <Cpu className="size-4 text-primary" /> Detection adapter
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{activeMode.hint}</p>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
            {DETECTION_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => selectMode(m.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === m.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <PipelineStat
            label="Pipeline status"
            value={
              health.isLoading
                ? "Checking…"
                : mode === "demo"
                  ? "Simulator active"
                  : health.data?.online
                    ? "YOLO service online"
                    : "YOLO service offline"
            }
            tone={mode === "demo" ? "muted" : health.data?.online ? "ok" : "bad"}
          />
          <PipelineStat label="Model" value={mode === "demo" ? "simulator-v1" : (health.data?.model ?? "—")} tone="muted" />
          <PipelineStat
            label="Endpoint"
            value={mode === "demo" ? "in-app" : (health.data?.endpoint ?? "not configured")}
            tone="muted"
          />
        </div>

        {mode === "real" && !health.data?.online && (
          <p className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            {health.data?.message ?? "Detection service unreachable."} Run the Flask service in{" "}
            <code>backend/</code> and set <code>DETECTION_API_URL</code> to its public URL. Pipeline
            endpoints: <code>GET /api/public/detection/health</code> and{" "}
            <code>POST /api/public/detection/detect</code>.
          </p>
        )}

        {last && (
          <p className="mt-3 text-xs text-muted-foreground">
            Last run · {last.model} · {last.inference_ms} ms · {last.boxes.length} boxes ·{" "}
            {last.simulated ? "DEMO / SIMULATED DATA" : "real inference"}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card overflow-hidden p-2">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
            <video ref={videoRef} autoPlay muted playsInline className="size-full object-cover" />
            {!on && (
              <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                Camera is off
              </div>
            )}
            {on && (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2 py-1 text-[11px] font-medium backdrop-blur">
                <Radio className="size-3 text-destructive" /> {mode === "real" ? "REAL MODE" : "DEMO MODE"}
              </span>
            )}
          </div>
        </div>
        <div className="surface-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Slot status</h2>
            <SlotLegend />
          </div>
          <SlotGrid slots={status.slots} />
        </div>
      </div>
    </div>
  );
}

function PipelineStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "bad" | "muted";
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 truncate text-sm font-medium">
        <CircleDot
          className={cn(
            "size-3 shrink-0",
            tone === "ok" ? "text-success" : tone === "bad" ? "text-destructive" : "text-muted-foreground",
          )}
        />
        <span className="truncate">{value}</span>
      </p>
    </div>
  );
}
