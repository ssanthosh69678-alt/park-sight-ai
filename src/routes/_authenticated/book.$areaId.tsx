import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarClock, CircleCheck as CheckCircle2, CreditCard, Loader as Loader2, MapPin } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  PAYMENT_METHODS,
  VEHICLE_TYPES,
  quote,
  useCreateBooking,
  usePayForBooking,
  type Booking,
  type PaymentMethod,
  type VehicleType,
} from "@/lib/booking";
import type { ParkingArea, ParkingSlot } from "@/lib/parking";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/book/$areaId")({
  validateSearch: z.object({ vehicle: z.enum(["bike", "car"]).optional() }),
  head: () => ({
    meta: [
      { title: "Book parking — ParkSight AI" },
      { name: "description", content: "Reserve a parking slot, choose your vehicle and time, and pay online." },
      { property: "og:title", content: "Book parking — ParkSight AI" },
      { property: "og:description", content: "Reserve a parking slot and pay online in a few steps." },
    ],
  }),
  component: BookPage,
});

const STEPS = ["Slot", "Vehicle & time", "Payment", "Done"] as const;

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function BookPage() {
  const { areaId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<VehicleType>(search.vehicle ?? "car");
  const [plate, setPlate] = useState("");
  const [start, setStart] = useState(() => toLocalInput(new Date(Date.now() + 30 * 60000)));
  const [hours, setHours] = useState(2);
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [booking, setBooking] = useState<Booking | null>(null);

  const createBooking = useCreateBooking();
  const pay = usePayForBooking();

  const areaQuery = useQuery({
    queryKey: ["area", areaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("parking_areas").select("*").eq("id", areaId).maybeSingle();
      if (error) throw error;
      return data as unknown as ParkingArea | null;
    },
  });

  const slotsQuery = useQuery({
    queryKey: ["book-slots", areaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parking_slots")
        .select("*")
        .eq("area_id", areaId)
        .order("slot_number");
      if (error) throw error;
      return (data ?? []) as unknown as ParkingSlot[];
    },
  });

  const area = areaQuery.data;
  const amount = useMemo(
    () => (area ? quote(area as unknown as Record<string, unknown>, vehicle, hours) : 0),
    [area, vehicle, hours],
  );

  if (areaQuery.isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!area) {
    return (
      <p className="surface-card p-10 text-center text-sm text-muted-foreground">
        This parking area is no longer available. <Link to="/search" className="text-primary hover:underline">Back to search</Link>
      </p>
    );
  }

  const bookable = (slotsQuery.data ?? []).filter((s) => s.status === "available" || s.status === "unknown");

  async function confirmBooking() {
    if (!slotId) {
      toast.error("Select a slot first");
      return;
    }
    if (plate.trim().length < 3) {
      toast.error("Enter your vehicle number");
      return;
    }
    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) {
      toast.error("Choose a valid start time");
      return;
    }
    const endDate = new Date(startDate.getTime() + hours * 3600 * 1000);
    try {
      const created = await createBooking.mutateAsync({
        area_id: areaId,
        slot_id: slotId,
        vehicle_type: vehicle,
        vehicle_number: plate.trim().toUpperCase(),
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
      });
      setBooking(created);
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the booking");
    }
  }

  async function payNow() {
    if (!booking) return;
    try {
      await pay.mutateAsync({ booking, method });
      setStep(3);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Book at ${area.area_name}`}
        description={`${area.address || area.location || "No address"} · open ${area.opening_time?.slice(0, 5)}–${area.closing_time?.slice(0, 5)}`}
        actions={
          <Button variant="outline" asChild>
            <Link to="/search">Back to search</Link>
          </Button>
        }
      />

      <ol className="flex flex-wrap gap-2 text-xs font-medium">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={cn(
              "rounded-full border px-3 py-1.5",
              i === step ? "border-primary bg-primary/10 text-primary" : i < step ? "border-success/40 text-success" : "text-muted-foreground",
            )}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          {step === 0 && (
            <>
              <h2 className="font-semibold">Choose a slot</h2>
              <p className="text-xs text-muted-foreground">Reserved and occupied slots are not selectable.</p>
              {slotsQuery.isLoading ? (
                <Skeleton className="mt-4 h-32 w-full" />
              ) : bookable.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No free slots right now — try another area or time.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-6 lg:grid-cols-8">
                  {bookable.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSlotId(s.id)}
                      className={cn(
                        "rounded-lg border px-2 py-3 text-sm font-semibold transition-colors",
                        slotId === s.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-success/40 bg-success/10 text-success hover:bg-success/20",
                      )}
                    >
                      {s.slot_number}
                    </button>
                  ))}
                </div>
              )}
              <Button className="mt-5" disabled={!slotId} onClick={() => setStep(1)}>
                Continue
              </Button>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="font-semibold">Vehicle & time</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Vehicle type</Label>
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
                  <Label htmlFor="plate">Vehicle number</Label>
                  <Input id="plate" value={plate} maxLength={16} onChange={(e) => setPlate(e.target.value)} placeholder="KA01AB1234" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start">Start time</Label>
                  <Input id="start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Duration (hours)</Label>
                  <Input
                    id="hours"
                    type="number"
                    min={1}
                    max={72}
                    value={hours}
                    onChange={(e) => setHours(Math.min(72, Math.max(1, Number(e.target.value) || 1)))}
                  />
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
                <Button onClick={confirmBooking} disabled={createBooking.isPending}>
                  {createBooking.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Confirm booking
                </Button>
              </div>
            </>
          )}

          {step === 2 && booking && (
            <>
              <h2 className="font-semibold">Demo Payment</h2>
              <p className="text-xs text-muted-foreground">
                Booking <span className="font-mono">{booking.booking_ref}</span> is held until payment completes.
                This is a clearly labelled demo payment — no real money is charged.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors",
                      method === m.value ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent/50",
                    )}
                  >
                    <CreditCard className="size-4" /> {m.label}
                  </button>
                ))}
              </div>
              <Button className="mt-5" onClick={payNow} disabled={pay.isPending}>
                {pay.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Pay ₹{booking.amount}
              </Button>
            </>
          )}

          {step === 3 && booking && (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto size-12 text-success" />
              <h2 className="mt-4 text-xl font-bold">Booking confirmed</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your slot is reserved. Booking ID <span className="font-mono font-semibold">{booking.booking_ref}</span>
              </p>
              <div className="mt-6 flex justify-center gap-2">
                <Button onClick={() => navigate({ to: "/my-bookings" })}>View my bookings</Button>
                <Button variant="outline" asChild>
                  <Link to="/search">Book another</Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        <aside className="surface-card h-fit p-5">
          <h2 className="font-semibold">Summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Area</dt>
              <dd className="text-right font-medium">{area.area_name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="flex items-center gap-1 text-muted-foreground"><MapPin className="size-3.5" /> Address</dt>
              <dd className="text-right">{area.address || area.location || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Slot</dt>
              <dd className="font-medium">
                {bookable.find((s) => s.id === slotId)?.slot_number ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="flex items-center gap-1 text-muted-foreground"><CalendarClock className="size-3.5" /> Duration</dt>
              <dd className="font-medium">{hours} h</dd>
            </div>
            <div className="flex justify-between gap-3 border-t pt-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-bold tabular-nums">₹{amount}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
