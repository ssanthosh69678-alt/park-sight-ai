import { createFileRoute } from "@tanstack/react-router";

/** Public readiness probe for the YOLO/OpenCV processing pipeline. */
export const Route = createFileRoute("/api/public/detection/health")({
  server: {
    handlers: {
      GET: async () => {
        const { checkPipelineHealth } = await import("@/lib/detection.server");
        const health = await checkPipelineHealth();
        return Response.json(health, { status: health.online || !health.endpoint ? 200 : 503 });
      },
    },
  },
});
