import { Link } from "@tanstack/react-router";
import { MapPin, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { seedDemoArea } from "@/lib/seed";

/** Shown on every data page when the user has not created a parking area yet. */
export function EmptyAreaState() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function loadDemo() {
    if (!user) return;
    setBusy(true);
    try {
      await seedDemoArea(user.id);
      await qc.invalidateQueries();
      toast.success("Demo parking area created with simulated data");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create demo area");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface-card mx-auto max-w-xl p-10 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary">
        <MapPin className="size-7" />
      </span>
      <h2 className="mt-5 text-xl font-bold">Create your first parking area</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Add a parking area with its capacity and slots, or start with a Demo Mode area seeded with
        clearly-labelled simulated data.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/areas">Create parking area</Link>
        </Button>
        <Button variant="outline" onClick={loadDemo} disabled={busy}>
          {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
          Load demo area
        </Button>
      </div>
    </div>
  );
}
