import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Receipt, TrendingUp } from "lucide-react";

import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/AppShell";
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
import { isToday, useOwnerPayments } from "@/lib/booking";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Payments — ParkSight AI" },
      { name: "description", content: "Revenue, transactions and receipts collected across your parking areas." },
      { property: "og:title", content: "Payments — ParkSight AI" },
      { property: "og:description", content: "Track parking revenue and payment history." },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { areas } = useArea();
  const areaIds = useMemo(() => areas.map((a) => a.id), [areas]);
  const { data: payments, isLoading } = useOwnerPayments(areaIds);

  const rows = payments ?? [];
  const paid = rows.filter((p) => p.status === "paid");
  const today = paid.filter((p) => isToday(p.paid_at ?? p.created_at));
  const sum = (list: typeof rows) => Math.round(list.reduce((t, p) => t + Number(p.amount), 0) * 100) / 100;

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Every transaction collected through online booking." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Today's Revenue" value={`₹${sum(today)}`} hint={`${today.length} payments`} icon={Banknote} tone="success" />
        <KpiCard label="Total Revenue" value={`₹${sum(paid)}`} hint={`${paid.length} settled`} icon={TrendingUp} tone="primary" />
        <KpiCard label="Transactions" value={rows.length} hint="All statuses" icon={Receipt} />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <p className="surface-card p-10 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.receipt_no}</TableCell>
                  <TableCell className="font-mono text-xs">{p.transaction_ref}</TableCell>
                  <TableCell className="uppercase">{p.method}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(p.paid_at ?? p.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs font-semibold uppercase">{p.status}</TableCell>
                  <TableCell className="text-right tabular-nums">₹{p.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
