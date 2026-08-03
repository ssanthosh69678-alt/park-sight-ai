import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DemoBadge } from "@/components/DemoBadge";
import { EmptyAreaState } from "@/components/EmptyAreaState";
import { PageHeader } from "@/components/AppShell";
import { SlotGrid, SlotLegend } from "@/components/SlotGrid";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useArea } from "@/lib/area";
import { simulateFrame } from "@/lib/demo";
import { occupancyPct } from "@/lib/parking";
import { useAreaStatus } from "@/lib/status";

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

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  async function toggle() {
    if (on) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setOn(true);
    } catch {
      toast.error("Camera permission denied or unavailable");
    }
  }

  async function captureFrame() {
    if (!area) return;
    setSaving(true);
    try {
      const capacity = status.configured || area.capacity;
      const frame = simulateFrame(capacity);
      const { error } = await supabase.from("parking_records").insert({
        area_id: area.id,
        recorded_at: new Date().toISOString(),
        occupied: frame.occupied,
        available: frame.available,
        occupancy_percentage: occupancyPct(frame.occupied, capacity),
        source: "demo",
      });
      if (error) throw error;
      await qc.invalidateQueries();
      toast.success(`Frame analysed — ${frame.occupied} occupied, ${frame.available} free`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save detection");
    } finally {
      setSaving(false);
    }
  }

  if (!area) return <EmptyAreaState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Monitoring"
        description="The browser camera provides the video feed. Detection results shown here are simulated in the hosted app; the Flask + YOLO pipeline in /backend performs real inference when self-hosted."
        actions={
          <>
            <DemoBadge label="SIMULATED DETECTION" />
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card overflow-hidden p-2">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
            <video ref={videoRef} autoPlay muted playsInline className="size-full object-cover" />
            {!on && (
              <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                Camera is off
              </div>
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
