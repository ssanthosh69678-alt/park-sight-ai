import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useArea } from "@/lib/area";
import { bookingTone, useOwnerBookings, useSetBookingStatus } from "@/lib/booking";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings — ParkSight AI" },
      { name: "description", content: "Approve, reject and track customer bookings across your parking areas." },
      { property: "og:title", content: "Bookings — ParkSight AI" },
      { property: "og:description", content: "Manage customer parking bookings and reservations." },
    ],
  }),
  component: OwnerBookingsPage,
});

const FILTERS = ["all", "pending", "confirmed", "active", "completed", "cancelled"] as const;

function OwnerBookingsPage() {
  const { areas } = useArea();
  const areaIds = useMemo(() => areas.map((a) => a.id), [areas]);
  const { data: bookings, isLoading } = useOwnerBookings(areaIds);
  const setStatus = useSetBookingStatus();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const rows = (bookings ?? []).filter((b) => filter === "all" || b.status === filter);
  const areaName = (id: string) => areas.find((a) => a.id === id)?.area_name ?? "—";

  return (
    <div className="space-y-6">
      <PageHeader title="Bookings" description="Approve or reject reservations and follow every active booking." />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="capitalize" onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <p className="surface-card p-10 text-center text-sm text-muted-foreground">No bookings in this view yet.</p>
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Start</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.booking_ref}</TableCell>
                  <TableCell className="whitespace-nowrap">{areaName(b.area_id)}</TableCell>
                  <TableCell className="whitespace-nowrap uppercase">
                    {b.vehicle_type} {b.vehicle_number}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{new Date(b.start_time).toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">₹{b.amount}</TableCell>
                  <TableCell className={cn("text-xs font-semibold uppercase", bookingTone(b.status))}>{b.status}</TableCell>
                  <TableCell className="text-right">
                    {b.status === "pending" || b.status === "confirmed" ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await setStatus.mutateAsync({ id: b.id, status: "active" });
                            toast.success("Booking approved");
                          }}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={async () => {
                            await setStatus.mutateAsync({ id: b.id, status: "rejected" });
                            toast.success("Booking rejected");
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
