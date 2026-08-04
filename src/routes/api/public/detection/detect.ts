import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  mode: z.enum(["demo", "real"]).default("demo"),
  slot_count: z.number().int().min(1).max(500).default(12),
  slot_numbers: z.array(z.string().max(24)).max(500).optional(),
  image: z.string().max(12_000_000).optional(),
});

/**
 * Backend-ready processing endpoint.
 * Demo mode is open (it returns synthetic numbers only); Real Mode requires
 * the shared pipeline key so the self-hosted GPU service is not abused.
 */
export const Route = createFileRoute("/api/public/detection/detect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "Invalid request body" }, { status: 400 });
        }
        const body = parsed.data;

        const { runRealDetection, simulateDetection } = await import("@/lib/detection.server");

        if (body.mode === "real") {
          const key = process.env["DETECTION_API_KEY"];
          if (key && request.headers.get("x-api-key") !== key) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
          try {
            const result = await runRealDetection({
              imageBase64: body.image,
              slots: (body.slot_numbers ?? []).map((slot_number) => ({
                slot_number,
                coordinates: null,
              })),
            });
            return Response.json(result);
          } catch (error) {
            return Response.json(
              { error: error instanceof Error ? error.message : "Detection failed" },
              { status: 502 },
            );
          }
        }

        return Response.json(simulateDetection(body.slot_count, body.slot_numbers));
      },
    },
  },
});
