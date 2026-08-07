import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, CalendarRange, Car, Gauge, TrendingUp } from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyAreaState } from "@/components/EmptyAreaState";
import { PageHeader } from "@/components/AppShell";
import { KpiCard } from "@/components/KpiCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getParkingAnalytics } from "@/lib/api.functions";
import { useArea } from "@/lib/area";
import { VEHICLE_TYPES, useOwnerBookings } from "@/lib/booking";
import { mean, median, mode, stdDev, variance } from "@/lib/stats";
import { formatHour, useAreaStatus } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — ParkSight AI" },
      {
        name: "description",
        content:
          "Interactive parking analytics: peak hours, weekly, monthly and yearly occupancy trends, vehicle growth and utilization.",
      },
      { property: "og:title", content: "Analytics — ParkSight AI" },
      {
        property: "og:description",
        content: "Interactive occupancy trends, peak hours, vehicle growth and utilization insights.",
      },
    ],
  }),
  component: AnalyticsPage,
});

type Range = "weekly" | "monthly" | "yearly";

const RANGES: { value: Range; label: string; days: number }[] = [
  { value: "weekly", label: "Weekly", days: 7 },
  { value: "monthly", label: "Monthly", days: 30 },
  { value: "yearly", label: "Yearly", days: 365 },
];

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
} as const;

const axis = { fontSize: 11 };

function bucketKey(date: Date, range: Range) {
  if (range === "yearly") return date.toLocaleString(undefined, { month: "short", year: "2-digit" });
  if (range === "monthly") return date.toLocaleString(undefined, { month: "short", day: "numeric" });
  return date.toLocaleString(undefined, { weekday: "short", day: "numeric" });
}

function AnalyticsPage() {
  const { area } = useArea();
  const status = useAreaStatus(area);
  const [range, setRange] = useState<Range>("weekly");
  const fetchAnalytics = useServerFn(getParkingAnalytics);
  const bookings = useOwnerBookings(area ? [area.id] : []);

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

  const days = RANGES.find((r) => r.value === range)!.days;
  const since = useMemo(() => Date.now() - days * 24 * 60 * 60 * 1000, [days]);

  const inRange = useMemo(
    () => status.records.filter((r) => new Date(r.recorded_at).getTime() >= since),
    [status.records, since],
  );

  /** Occupancy trend bucketed by day (or month for the yearly view). */
  const trend = useMemo(() => {
    const buckets = new Map<string, { sum: number; n: number; peak: number; order: number }>();
    for (const r of inRange) {
      const d = new Date(r.recorded_at);
      const key = bucketKey(d, range);
      const prev = buckets.get(key) ?? { sum: 0, n: 0, peak: 0, order: d.getTime() };
      buckets.set(key, {
        sum: prev.sum + r.occupancy_percentage,
        n: prev.n + 1,
        peak: Math.max(prev.peak, r.occupancy_percentage),
        order: Math.min(prev.order, d.getTime()),
      });
    }
    return [...buckets.entries()]
      .sort((a, b) => a[1].order - b[1].order)
      .map(([label, v]) => ({
        label,
        occupancy: Math.round(v.sum / v.n),
        peak: Math.round(v.peak),
      }));
  }, [inRange, range]);

  /** Average occupancy for each hour of the day — the peak-hour profile. */
  const hourly = useMemo(
    () =>
      Array.from({ length: 24 }, (_, h) => {
        const fromApi = remote?.hourly.find((p) => p.hour === h);
        const v = inRange
          .filter((r) => new Date(r.recorded_at).getHours() === h)
          .map((r) => r.occupancy_percentage);
        return {
          hour: `${String(h).padStart(2, "0")}:00`,
          hourNum: h,
          occupancy: Math.round(fromApi ? fromApi.occupancy : mean(v)),
        };
      }),
    [inRange, remote],
  );

  const peak = useMemo(
    () => hourly.reduce((best, cur) => (cur.occupancy > best.occupancy ? cur : best), hourly[0]!),
    [hourly],
  );
  const quietest = useMemo(
    () => hourly.reduce((best, cur) => (cur.occupancy < best.occupancy ? cur : best), hourly[0]!),
    [hourly],
  );

  /** Weekday profile — which days of the week are busiest. */
  const weekday = useMemo(
    () =>
      ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => {
        const v = inRange.filter((r) => new Date(r.recorded_at).getDay() === i).map((r) => r.occupancy_percentage);
        return { day: d, occupancy: Math.round(mean(v)) };
      }),
    [inRange],
  );

  /** Vehicle growth — bookings per vehicle type across the selected range. */
  const vehicleGrowth = useMemo(() => {
    type Row = { label: string; order: number; bike: number; car: number; suv: number; truck: number };
    const buckets = new Map<string, Row>();
    const list = (bookings.data ?? []).filter((b) => new Date(b.start_time).getTime() >= since);
    for (const b of list) {
      const d = new Date(b.start_time);
      const key = bucketKey(d, range);
      const row: Row = buckets.get(key) ?? {
        label: key,
        order: d.getTime(),
        bike: 0,
        car: 0,
        suv: 0,
        truck: 0,
      };
      const type = (["bike", "car", "suv", "truck"] as const).find((t) => t === b.vehicle_type) ?? "car";
      row[type] += 1;
      row.order = Math.min(row.order, d.getTime());
      buckets.set(key, row);
    }
    return [...buckets.values()].sort((a, b) => a.order - b.order);
  }, [bookings.data, since, range]);

  const count = (rows: typeof vehicleGrowth) =>
    rows.reduce((s, r) => s + r.bike + r.car + r.suv + r.truck, 0);
  const totalVehicles = count(vehicleGrowth);
  const firstHalf = vehicleGrowth.slice(0, Math.floor(vehicleGrowth.length / 2));
  const secondHalf = vehicleGrowth.slice(Math.floor(vehicleGrowth.length / 2));
  const growthPct =
    count(firstHalf) > 0 ? Math.round(((count(secondHalf) - count(firstHalf)) / count(firstHalf)) * 100) : 0;


  const values = inRange.map((r) => r.occupancy_percentage);
  const utilization = Math.round(mean(values));
  const utilizationData = [{ name: "Utilization", value: utilization, fill: "var(--color-chart-1)" }];

  const stats = [
    ["Mean", remote?.mean ?? mean(values)],
    ["Median", remote?.median ?? median(values)],
    ["Mode", remote?.mode ?? mode(values)],
    ["Variance", remote?.variance ?? variance(values)],
    ["Std deviation", remote?.std_dev ?? stdDev(values)],
    ["Samples", values.length],
  ] as const;

  if (!area) return <EmptyAreaState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`Interactive occupancy intelligence for ${area.area_name}.`}
        actions={
          <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
            <TabsList>
              {RANGES.map((r) => (
                <TabsTrigger key={r.value} value={r.value}>
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Peak hour" value={formatHour(peak?.hourNum ?? null)} hint={`${peak?.occupancy ?? 0}% average occupancy`} icon={TrendingUp} tone="warning" />
        <KpiCard label="Quietest hour" value={formatHour(quietest?.hourNum ?? null)} hint={`${quietest?.occupancy ?? 0}% average occupancy`} icon={Activity} tone="success" />
        <KpiCard label="Utilization" value={`${utilization}%`} hint={`${values.length} samples in range`} icon={Gauge} tone="primary" />
        <KpiCard
          label="Vehicle growth"
          value={`${growthPct > 0 ? "+" : ""}${growthPct}%`}
          hint={`${totalVehicles} vehicles booked`}
          icon={Car}
          tone={growthPct >= 0 ? "success" : "destructive"}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {remote
          ? `Hourly profile computed by the Flask REST API (${remote.engine}).`
          : `Computed in-app · ${api.data && !api.data.online ? api.data.error : "Flask analytics endpoint not connected"}`}
      </p>

      <div className="surface-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarRange className="size-4 text-primary" />
          <h2 className="font-semibold">Occupancy trend — {RANGES.find((r) => r.value === range)!.label.toLowerCase()}</h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="occFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={axis} stroke="var(--color-muted-foreground)" minTickGap={16} />
            <YAxis tick={axis} stroke="var(--color-muted-foreground)" unit="%" domain={[0, 100]} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              name="Average"
              dataKey="occupancy"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              fill="url(#occFill)"
            />
            <Line type="monotone" name="Peak" dataKey="peak" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Peak hour profile</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="hour" tick={axis} stroke="var(--color-muted-foreground)" minTickGap={16} />
              <YAxis tick={axis} stroke="var(--color-muted-foreground)" unit="%" />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)", opacity: 0.3 }} />
              <Bar dataKey="occupancy" radius={[6, 6, 0, 0]}>
                {hourly.map((h) => (
                  <Cell
                    key={h.hour}
                    fill={h.hourNum === peak?.hourNum ? "var(--color-chart-3)" : "var(--color-chart-2)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="surface-card p-5">
          <h2 className="mb-4 font-semibold">Utilization</h2>
          <ResponsiveContainer width="100%" height={260}>
            <RadialBarChart
              data={utilizationData}
              innerRadius="70%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background dataKey="value" cornerRadius={12} />
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="-mt-32 text-center text-4xl font-bold tabular-nums">{utilization}%</p>
          <p className="mt-24 text-center text-xs text-muted-foreground">
            Average occupancy across {values.length} samples · capacity {area.capacity}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="mb-4 font-semibold">Vehicle growth by type</h2>
          {vehicleGrowth.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No bookings in this range yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={vehicleGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={axis} stroke="var(--color-muted-foreground)" minTickGap={16} />
                <YAxis tick={axis} stroke="var(--color-muted-foreground)" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)", opacity: 0.3 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {VEHICLE_TYPES.map((v, i) => (
                  <Bar
                    key={v.value}
                    dataKey={v.value}
                    name={v.label}
                    stackId="vehicles"
                    fill={`var(--color-chart-${i + 1})`}
                    radius={i === VEHICLE_TYPES.length - 1 ? [6, 6, 0, 0] : undefined}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="surface-card p-5">
          <h2 className="mb-4 font-semibold">Weekday demand</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weekday}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" tick={axis} stroke="var(--color-muted-foreground)" />
              <YAxis tick={axis} stroke="var(--color-muted-foreground)" unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="occupancy"
                name="Average occupancy"
                stroke="var(--color-chart-4)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="surface-card p-5">
        <h2 className="mb-4 font-semibold">Statistical summary</h2>
        <dl className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-lg bg-muted/60 p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">
                {typeof value === "number" ? Math.round(value * 100) / 100 : value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
