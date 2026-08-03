import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DemoBadge } from "@/components/DemoBadge";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useArea } from "@/lib/area";
import { useAuth } from "@/lib/auth";
import { PARKING_TYPES } from "@/lib/parking";
import { seedDemoArea, seedHistory, seedSlots } from "@/lib/seed";

export const Route = createFileRoute("/_authenticated/areas")({
  head: () => ({
    meta: [
      { title: "Parking Areas — ParkSight AI" },
      { name: "description", content: "Create and manage parking areas, capacity and camera configuration." },
      { property: "og:title", content: "Parking Areas — ParkSight AI" },
      { property: "og:description", content: "Create and manage parking areas, capacity and camera configuration." },
    ],
  }),
  component: AreasPage,
});

function AreasPage() {
  const { areas, setAreaId, areaId } = useArea();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [form, setForm] = useState({
    area_name: "",
    location: "",
    description: "",
    capacity: 50,
    parking_type: "outdoor",
    demo_mode: true,
  });

  async function createArea(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (form.area_name.trim().length < 2) {
      toast.error("Enter a parking area name");
      return;
    }
    if (form.capacity < 1 || form.capacity > 2000) {
      toast.error("Capacity must be between 1 and 2000");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("parking_areas")
        .insert({ ...form, area_name: form.area_name.trim(), user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      await seedSlots(data.id, form.capacity);
      if (form.demo_mode) await seedHistory(data.id, form.capacity);
      await qc.invalidateQueries();
      setAreaId(data.id);
      setOpen(false);
      toast.success("Parking area created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create area");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("parking_areas").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries();
    toast.success("Parking area deleted");
  }


  async function loadDemo() {
    if (!user) return;
    setDemoBusy(true);
    try {
      const id = await seedDemoArea(user.id);
      await qc.invalidateQueries();
      setAreaId(id);
      toast.success("Demo area created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Parking Areas"
        description="Each area has its own capacity, slots, history and predictions. Capacity is always configured by you — never guessed from a camera angle."
        actions={
          <>
            <Button variant="outline" onClick={loadDemo} disabled={demoBusy}>
              {demoBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
              Demo area
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 size-4" /> New area
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create parking area</DialogTitle>
                </DialogHeader>
                <form onSubmit={createArea} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="an">Parking Area Name</Label>
                    <Input id="an" value={form.area_name} onChange={(e) => setForm({ ...form, area_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loc">Location</Label>
                    <Input id="loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc">Description</Label>
                    <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cap">Total Capacity</Label>
                      <Input
                        id="cap"
                        type="number"
                        min={1}
                        max={2000}
                        value={form.capacity}
                        onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Parking Type</Label>
                      <Select value={form.parking_type} onValueChange={(v) => setForm({ ...form, parking_type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PARKING_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Seed simulated history</p>
                      <p className="text-xs text-muted-foreground">14 days of demo occupancy for charts & ML</p>
                    </div>
                    <Switch checked={form.demo_mode} onCheckedChange={(v) => setForm({ ...form, demo_mode: v })} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Create area
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {areas.length === 0 ? (
        <p className="surface-card p-10 text-center text-sm text-muted-foreground">
          No parking areas yet. Create one, or load a demo area.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {areas.map((a) => (
            <div key={a.id} className={`surface-card p-5 ${a.id === areaId ? "ring-2 ring-primary" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{a.area_name}</h3>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="size-3" /> {a.location || "No location"}
                  </p>
                </div>
                {a.demo_mode && <DemoBadge label="DEMO" />}
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{a.description || "—"}</p>
              <dl className="mt-4 flex gap-6 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Capacity</dt>
                  <dd className="font-bold tabular-nums">{a.capacity}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Type</dt>
                  <dd className="font-medium capitalize">{a.parking_type}</dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant={a.id === areaId ? "secondary" : "default"} onClick={() => setAreaId(a.id)}>
                  {a.id === areaId ? "Active" : "Set active"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(a.id)} aria-label={`Delete ${a.area_name}`}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
