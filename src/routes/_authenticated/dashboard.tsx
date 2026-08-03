import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Brain,
  CarFront,
  CircleParking,
  Clock,
  Gauge,
  LayoutGrid,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DemoBadge } from "@/components/DemoBadge";
import { EmptyAreaState } from "@/components/EmptyAreaState";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/AppShell";
import { SlotGrid, SlotLegend } from "@/components/SlotGrid";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useArea } from "@/lib/area";
import { useAuth } from "@/lib/auth";
import { useAlerts } from "@/lib/data";
import { availabilityLevel } from "@/lib/parking";
import { formatHour, useAreaStatus } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ParkSight AI" },
      { name: "description", content: "Live occupancy KPIs, slot status and trends for your parking areas." },
      { property: "og:title", content: "Dashboard — ParkSight AI" },
      { property: "og:description", content: "Live occupancy KPIs, slot status and trends for your parking areas." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { area, loading } = useArea();
  const { user } = useAuth();
  const { data: alerts } = useAlerts(user?.id);
  const status = useAreaStatus(area);

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!area) return <EmptyAreaState />;

  const level = availabilityLevel(status.occupancyPct);
  const chartData = status.records.slice(-48).map((r) => ({
    time: new Date(r.recorded_at).toLocaleTimeString([], { hour: "2-digit" }),
    occupancy: r.occupancy_percentage,
    available: r.available,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={area.area_name}
        description={`${area.location || "No location set"} · ${area.parking_type} parking`}
        actions={
          <>
            {area.demo_mode && <DemoBadge />}
            <Button variant="outline" asChild>
              <Link to="/live">Open Live Monitor</Link>
            </Button>
            <Button asChild>
              <Link to="/prediction">Run prediction</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Total Capacity" value={area.capacity} hint="Configured by you" icon={CircleParking} />
        <KpiCard
          label="Available Slots"
          value={status.available}
          hint={`${status.configured} slots configured`}
          icon={LayoutGrid}
          tone="success"
        />
        <KpiCard label="Occupied Slots" value={status.occupied} hint="From latest detection" icon={CarFront} tone="destructive" />
        <KpiCard label="Occupancy" value={`${status.occupancyPct}%`} hint={`Level: ${level}`} icon={Gauge} tone="primary" />
        <KpiCard
          label="Peak Hour"
          value={formatHour(status.peakHour)}
          hint={`${status.peakValue}% average occupancy`}
          icon={Clock}
          tone="warning"
        />
        <KpiCard
          label="Prediction Status"
          value={level}
          hint={area.demo_mode ? "Demo model output" : "Model output"}
          icon={Brain}
          tone={level === "NEARLY FULL" ? "destructive" : level === "HIGH" ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Occupancy — last 48 hours</h2>
              <p className="text-xs text-muted-foreground">Percentage of configured slots occupied</p>
            </div>
            <TrendingUp className="size-4 text-primary" />
          </div>
          {chartData.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No occupancy records yet. Start the Live Monitor or enable Demo Mode.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="occ" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" minTickGap={24} />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-popover-foreground)",
                  }}
                />
                <Area type="monotone" dataKey="occupancy" stroke="var(--color-chart-1)" fill="url(#occ)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="surface-card p-5">
          <h2 className="font-semibold">Capacity breakdown</h2>
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-muted-foreground">Occupancy</span>
                <span className="font-semibold tabular-nums">{status.occupancyPct}%</span>
              </div>
              <Progress value={status.occupancyPct} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Configured slots", status.configured],
                ["Unconfigured", Math.max(0, area.capacity - status.configured)],
                ["Available", status.available],
                ["Unknown", status.unknown],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-lg bg-muted/60 p-3">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="text-lg font-bold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-5 border-t pt-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="size-4 text-primary" /> Recent alerts
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {(alerts ?? []).slice(0, 3).map((a) => (
                <li key={a.id} className="text-muted-foreground">
                  {a.message}
                </li>
              ))}
              {(alerts ?? []).length === 0 && <li className="text-muted-foreground">No alerts yet.</li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="surface-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Parking layout</h2>
            <p className="text-xs text-muted-foreground">Select a slot in Slot Management to edit it</p>
          </div>
          <SlotLegend />
        </div>
        {status.slots.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No slots configured yet —{" "}
            <Link to="/slots" className="text-primary hover:underline">
              configure parking slots
            </Link>
            .
          </p>
        ) : (
          <SlotGrid slots={status.slots} />
        )}
      </div>
    </div>
  );
}
