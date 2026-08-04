import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DetectionMode, DetectionResult, PipelineHealth } from "@/lib/detection";
import { checkPipelineHealth, runRealDetection, simulateDetection } from "@/lib/detection.server";

export const getPipelineHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<PipelineHealth> => checkPipelineHealth());

export const detectFrame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      mode: DetectionMode;
      slotCount: number;
      slotNumbers?: string[];
      imageBase64?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<DetectionResult> => {
    if (data.mode === "real") {
      return runRealDetection({
        imageBase64: data.imageBase64,
        slots: (data.slotNumbers ?? []).map((slot_number) => ({ slot_number, coordinates: null })),
      });
    }
    return simulateDetection(Math.max(1, data.slotCount), data.slotNumbers);
  });
