import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Brain } from "lucide-react";

import { EmptyAreaState } from "@/components/EmptyAreaState";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useArea } from "@/lib/area";
import { getOccupancyForecast } from "@/lib/api.functions";
import { predictOccupancy, trainModel } from "@/lib/demo";
import { availabilityLevel } from "@/lib/parking";
import { useAreaStatus } from "@/lib/status";


export const Route = createFileRoute("/_authenticated/prediction")({
  head: () => ({
    meta: [
      { title: "Occupancy Prediction — ParkSight AI" },
      { name: "description", content: "Machine-learning forecast of parking occupancy for any hour and weekday." },
      { property: "og:title", content: "Occupancy Prediction — ParkSight AI" },
      { property: "og:description", content: "Machine-learning forecast of parking occupancy for any hour and weekday." },
    ],
  }),
  component: PredictionPage,
});

function PredictionPage() {
  const { area } = useArea();
  const status = useAreaStatus(area);
  const [hour, setHour] = useState(new Date().getHours());
  const [day, setDay] = useState(new Date().getDay());
  const [horizon, setHorizon] = useState(6);

  const fetchForecast = useServerFn(getOccupancyForecast);
  const history = status.records.map((r) => ({
    recorded_at: r.recorded_at,
    occupancy_percentage: r.occupancy_percentage,
  }));
  const api = useQuery({
    queryKey: ["flask-forecast", area?.id, horizon, history.length],
    enabled: !!area && history.length >= 24,
    queryFn: () =>
      fetchForecast({ data: { areaId: area!.id, history, horizonHours: horizon } }),
  });
  const remote = api.data?.online ? api.data.data : null;



  const model = useMemo(() => trainModel(status.records), [status.records]);
  const target = useMemo(() => {
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    d.setDate(d.getDate() + ((day - d.getDay() + 7) % 7));
    return d;
  }, [hour, day]);
  const capacityInput = status.configured || area?.capacity || 0;
  const result =
    model && capacityInput
      ? predictOccupancy(model, {
          date: target,
          recentOccupancyPct: status.occupancyPct,
          capacity: capacityInput,
        })
      : null;
  const predicted = result ? Math.round(result.occupancyPct) : null;

  if (!area) return <EmptyAreaState />;

  const capacity = status.configured || area.capacity;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Occupancy Prediction"
        description="A multiple linear regression model trained in your browser on this area's historical occupancy records."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card space-y-4 p-5">
          <h2 className="font-semibold">Prediction inputs</h2>
          <div className="space-y-2">
            <Label htmlFor="hour">Hour of day (0–23)</Label>
            <Input id="hour" type="number" min={0} max={23} value={hour} onChange={(e) => setHour(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="day">Day of week (0 = Sunday)</Label>
            <Input id="day" type="number" min={0} max={6} value={day} onChange={(e) => setDay(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="horizon">Forecast horizon (hours)</Label>
            <Input
              id="horizon"
              type="number"
              min={1}
              max={24}
              value={horizon}
              onChange={(e) => setHorizon(Math.min(24, Math.max(1, Number(e.target.value))))}
            />
          </div>
          <Button className="w-full" onClick={() => api.refetch()} disabled={api.isFetching}>
            <Brain className="mr-2 size-4" /> {api.isFetching ? "Running model…" : "Run REST forecast"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {remote
              ? `scikit-learn RandomForest · R² ${remote.r2}% on ${remote.samples} samples`
              : `In-browser regression · ${api.data && !api.data.online ? api.data.error : "Flask /api/predict not connected"}`}
          </p>
        </div>

        <div className="surface-card p-5">
          <h2 className="font-semibold">Forecast</h2>
          {predicted === null ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Not enough history to train a model yet. Enable Demo Mode or collect more records.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              <p className="text-5xl font-bold tabular-nums text-primary">{predicted}%</p>
              <p className="text-sm text-muted-foreground">
                Expected occupancy · about {Math.round((capacity * (100 - predicted)) / 100)} slots free of {capacity}
              </p>
              <p className="text-sm font-semibold">Availability: {result ? result.level : availabilityLevel(predicted)}</p>
              <p className="text-xs text-muted-foreground">
                Trained on {status.records.length} records · R² {model ? model.r2.toFixed(3) : "—"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
