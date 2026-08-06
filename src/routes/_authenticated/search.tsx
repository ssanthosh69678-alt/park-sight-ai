import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, Heart, MapPin, Search, Star } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import {
  VEHICLE_TYPES,
  rateFor,
  useFavorites,
  useSearchAreas,
  useToggleFavorite,
  type VehicleType,
} from "@/lib/booking";
import { PARKING_TYPES } from "@/lib/parking";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Find Parking — ParkSight AI" },
      { name: "description", content: "Search nearby parking areas by location, vehicle type, price and rating." },
      { property: "og:title", content: "Find Parking — ParkSight AI" },
      { property: "og:description", content: "Search nearby parking areas and reserve a slot before you arrive." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { user } = useAuth();
  const { data: areas, isLoading } = useSearchAreas();
  const { data: favorites } = useFavorites(user?.id);
  const toggleFav = useToggleFavorite(user?.id);

  const [q, setQ] = useState("");
  const [vehicle, setVehicle] = useState<VehicleType>("car");
  const [maxPrice, setMaxPrice] = useState(500);
  const [type, setType] = useState("any");
  const [minRating, setMinRating] = useState("0");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (areas ?? []).filter((a) => {
      if (term && ![a.area_name, a.address, a.location].join(" ").toLowerCase().includes(term)) return false;
      if (!(a.vehicle_types ?? []).includes(vehicle)) return false;
      if (rateFor(a, vehicle) > maxPrice) return false;
      if (type !== "any" && a.parking_type !== type) return false;
      if (Number(a.rating ?? 0) < Number(minRating)) return false;
      return true;
    });
  }, [areas, q, vehicle, maxPrice, type, minRating]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find parking"
        description="Search parking areas near you, compare prices and reserve a slot before you arrive."
      />

      <div className="surface-card grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-2 md:col-span-2 xl:col-span-2">
          <Label htmlFor="q">Location</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Area, address or city" className="pl-9" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Vehicle</Label>
          <Select value={vehicle} onValueChange={(v) => setVehicle(v as VehicleType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {VEHICLE_TYPES.map((v) => (
                <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Parking type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any type</SelectItem>
              {PARKING_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Max hourly price (₹{maxPrice})</Label>
          <Input
            id="price"
            type="range"
            min={10}
            max={500}
            step={10}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="p-0"
          />
          <Select value={minRating} onValueChange={setMinRating}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any rating</SelectItem>
              <SelectItem value="3">3★ and up</SelectItem>
              <SelectItem value="4">4★ and up</SelectItem>
              <SelectItem value="4.5">4.5★ and up</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : results.length === 0 ? (
        <p className="surface-card p-10 text-center text-sm text-muted-foreground">
          No parking areas match these filters yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((a) => {
            const fav = (favorites ?? []).find((f) => f.area_id === a.id);
            return (
              <article key={a.id} className="surface-card flex flex-col p-5 transition-transform duration-200 hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{a.area_name}</h2>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" /> {a.address || a.location || "No address"}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={fav ? "Remove from favourites" : "Save to favourites"}
                    onClick={() => toggleFav.mutate({ areaId: a.id, existingId: fav?.id })}
                    className="rounded-full p-1.5 hover:bg-accent"
                  >
                    <Heart className={cn("size-4", fav ? "fill-destructive text-destructive" : "text-muted-foreground")} />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-warning">
                    <Star className="size-3.5 fill-current" /> {Number(a.rating ?? 0).toFixed(1)}
                  </span>
                  <span className="capitalize">{a.parking_type}</span>
                  <span>{a.opening_time?.slice(0, 5)}–{a.closing_time?.slice(0, 5)}</span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/60 p-3">
                    <dt className="text-xs text-muted-foreground">Capacity</dt>
                    <dd className="font-bold tabular-nums">{a.capacity}</dd>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <dt className="text-xs text-muted-foreground">From</dt>
                    <dd className="font-bold tabular-nums">₹{rateFor(a, vehicle)}/hr</dd>
                  </div>
                </dl>

                <Button asChild className="mt-4 w-full">
                  <Link to="/book/$areaId" params={{ areaId: a.id }} search={{ vehicle }}>
                    <Car className="mr-2 size-4" /> Book slot
                  </Link>
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
