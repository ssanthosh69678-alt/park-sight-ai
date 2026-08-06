import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarClock, Download, MapPin, Ticket } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { bookingTone, useCancelBooking, useMyBookings } from "@/lib/booking";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/my-bookings")({
  head: () => ({
    meta: [
      { title: "My Bookings — ParkSight AI" },
      { name: "description", content: "View, cancel and download receipts for your parking bookings." },
      { property: "og:title", content: "My Bookings — ParkSight AI" },
      { property: "og:description", content: "Track your parking reservations and receipts." },
    ],
  }),
  component: MyBookingsPage,
});

function downloadReceipt(b: {
  booking_ref: string;
  vehicle_type: string;
  vehicle_number: string;
  start_time: string;
  end_time: string;
  amount: number;
  status: string;
  payment_status: string;
  parking_areas: { area_name: string; address: string; location: string } | null;
}) {
  const lines = [
    "ParkSight AI — Booking receipt",
    "==============================",
    `Booking ID:   ${b.booking_ref}`,
    `Parking:      ${b.parking_areas?.area_name ?? "—"}`,
    `Address:      ${b.parking_areas?.address || b.parking_areas?.location || "—"}`,
    `Vehicle:      ${b.vehicle_type.toUpperCase()} ${b.vehicle_number}`,
    `From:         ${new Date(b.start_time).toLocaleString()}`,
    `To:           ${new Date(b.end_time).toLocaleString()}`,
    `Amount:       INR ${b.amount}`,
    `Status:       ${b.status} / ${b.payment_status}`,
  ].join("\n");
  const url = URL.createObjectURL(new Blob([lines], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${b.booking_ref}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function MyBookingsPage() {
  const { user } = useAuth();
  const { data: bookings, isLoading } = useMyBookings(user?.id);
  const cancel = useCancelBooking();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My bookings"
        description="Every reservation you have made, with receipts and cancellation."
        actions={
          <Button asChild>
            <Link to="/search">Find parking</Link>
          </Button>
        }
      />

      {(bookings ?? []).length === 0 ? (
        <p className="surface-card p-10 text-center text-sm text-muted-foreground">
          No bookings yet — <Link to="/search" className="text-primary hover:underline">search for parking</Link>.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(bookings ?? []).map((b) => (
            <article key={b.id} className="surface-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{b.parking_areas?.area_name ?? "Parking area"}</h2>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="size-3 shrink-0" />
                    {b.parking_areas?.address || b.parking_areas?.location || "—"}
                  </p>
                </div>
                <span className={cn("text-xs font-semibold uppercase", bookingTone(b.status))}>{b.status}</span>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Ticket className="size-3.5" />
                  <span className="font-mono text-xs">{b.booking_ref}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  <span className="text-xs">
                    {new Date(b.start_time).toLocaleString()} · {b.hours}h
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="font-bold tabular-nums">₹{b.amount}</dd>
                </div>
              </dl>

              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => downloadReceipt(b)}>
                  <Download className="mr-2 size-4" /> Receipt
                </Button>
                {["pending", "confirmed"].includes(b.status) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={async () => {
                      await cancel.mutateAsync(b.id);
                      toast.success("Booking cancelled");
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
