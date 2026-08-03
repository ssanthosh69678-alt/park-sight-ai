import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ParkSight AI" },
      { name: "description", content: "Manage your ParkSight AI account, appearance and session." },
      { property: "og:title", content: "Settings — ParkSight AI" },
      { property: "og:description", content: "Manage your ParkSight AI account, appearance and session." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Account and appearance preferences." />
      <div className="surface-card max-w-xl space-y-5 p-5">
        <div>
          <Label>Signed in as</Label>
          <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div>
          <Label>Appearance</Label>
          <div className="mt-2 flex gap-2">
            {(["light", "dark"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={theme === t ? "default" : "outline"}
                className="capitalize"
                onClick={() => {
                  if (theme !== t) toggle();
                }}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
        <Button variant="destructive" onClick={() => void supabase.auth.signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
