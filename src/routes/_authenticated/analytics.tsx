import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyAreaState } from "@/components/EmptyAreaState";
import { PageHeader } from "@/components/AppShell";
import { useArea } from "@/lib/area";
import { mean, median, mode, stdDev, variance } from "@/lib/stats";
import { useAreaStatus } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — ParkSight AI" },
      { name: "description", content: "Descriptive statistics and occupancy trends: mean, median, mode, variance and standard deviation." },
      { property: "og:title", content: "Analytics — ParkSight AI" },
      { property: "og:description", content: "Descriptive statistics and occupancy trends for your parking areas." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { area } = useArea();
  const status = useAreaStatus(area);
  const fetchAnalytics = useServerFn(getParkingAnalytics);

  const records = status.records.map((r) => ({
    recorded_at: r.recorded_at,
    occupancy_percentage: r.occupancy_percentage,
  }));

  const api = useQuery({
    queryKey: ["flask-analytics", area?.id, records.length],
    enabled: !!area && records.length > 0,
    queryFn: () => fetchAnalytics({ data: { areaId: area!.id, records } }),
  });
  const remote = api.data?.online ? api.data.data : null;

  if (!area) return <EmptyAreaState />;

  const values = status.records.map((r) => r.occupancy_percentage);
  const stats = [
    ["Mean", remote?.mean ?? mean(values)],
    ["Median", remote?.median ?? median(values)],
    ["Mode", remote?.mode ?? mode(values)],
    ["Variance", remote?.variance ?? variance(values)],
    ["Std deviation", remote?.std_dev ?? stdDev(values)],
    ["Samples", remote?.samples ?? values.length],
  ] as const;

  const hourly = Array.from({ length: 24 }, (_, h) => {
    const fromApi = remote?.hourly.find((p) => p.hour === h);
    if (fromApi) return { hour: `${h}:00`, occupancy: Math.round(fromApi.occupancy) };
    const v = status.records.filter((r) => new Date(r.recorded_at).getHours() === h).map((r) => r.occupancy_percentage);
    return { hour: `${h}:00`, occupancy: Math.round(mean(v)) };
  });

  const daily = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => {
    // Flask (pandas) reports Monday = 0; the UI axis starts on Sunday.
    const fromApi = remote?.daily.find((p) => p.day === (i + 6) % 7);
    if (fromApi) return { day: d, occupancy: Math.round(fromApi.occupancy) };
    const v = status.records.filter((r) => new Date(r.recorded_at).getDay() === i).map((r) => r.occupancy_percentage);
    return { day: d, occupancy: Math.round(mean(v)) };
  });

  const axis = { fontSize: 11 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`Statistical analysis of ${values.length} occupancy records for ${area.area_name}.`}
      />

      <p className="text-xs text-muted-foreground">
        {remote
          ? `Computed by the Flask REST API (${remote.engine}) · peak hour ${remote.peak_hour}:00 · quietest ${remote.quietest_hour}:00`
          : `Computed in-app · ${api.data && !api.data.online ? api.data.error : "Flask analytics endpoint not connected"}`}
      </p>


      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map(([label, value]) => (
          <div key={label} className="surface-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {typeof value === "number" ? Math.round(value * 100) / 100 : value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="mb-4 font-semibold">Average occupancy by hour</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="hour" tick={axis} stroke="var(--color-muted-foreground)" minTickGap={20} />
              <YAxis tick={axis} stroke="var(--color-muted-foreground)" unit="%" />
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                }}
              />
              <Line type="monotone" dataKey="occupancy" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="surface-card p-5">
          <h2 className="mb-4 font-semibold">Average occupancy by weekday</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" tick={axis} stroke="var(--color-muted-foreground)" />
              <YAxis tick={axis} stroke="var(--color-muted-foreground)" unit="%" />
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="occupancy" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
