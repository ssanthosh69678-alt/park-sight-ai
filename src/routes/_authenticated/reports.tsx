import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";

import { EmptyAreaState } from "@/components/EmptyAreaState";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useArea } from "@/lib/area";
import { mean, median, stdDev, variance } from "@/lib/stats";
import { useAreaStatus } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — ParkSight AI" },
      { name: "description", content: "Export parking occupancy history and summary statistics as CSV." },
      { property: "og:title", content: "Reports — ParkSight AI" },
      { property: "og:description", content: "Export parking occupancy history and summary statistics as CSV." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { area } = useArea();
  const status = useAreaStatus(area);
  if (!area) return <EmptyAreaState />;

  const values = status.records.map((r) => r.occupancy_percentage);

  function download() {
    const rows = [
      ["recorded_at", "occupied", "available", "occupancy_percentage", "source"],
      ...status.records.map((r) => [r.recorded_at, r.occupied, r.available, r.occupancy_percentage, r.source]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `parksight-${area?.area_name.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={`Summary and raw export for ${area.area_name}.`}
        actions={
          <Button onClick={download} disabled={status.records.length === 0}>
            <Download className="mr-2 size-4" /> Export CSV
          </Button>
        }
      />
      <div className="surface-card p-5">
        <h2 className="font-semibold">Summary</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Records", status.records.length],
            ["Mean occupancy", `${Math.round(mean(values))}%`],
            ["Median occupancy", `${Math.round(median(values))}%`],
            ["Std deviation", Math.round(stdDev(values) * 100) / 100],
            ["Variance", Math.round(variance(values) * 100) / 100],
            ["Capacity", area.capacity],
            ["Currently occupied", status.occupied],
            ["Currently available", status.available],
          ].map(([k, v]) => (
            <div key={String(k)} className="rounded-lg bg-muted/60 p-3">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="text-lg font-bold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
