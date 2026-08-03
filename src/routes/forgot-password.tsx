import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — ParkSight AI" },
      { name: "description", content: "Request a password reset link for your ParkSight AI account." },
      { property: "og:title", content: "Reset your password — ParkSight AI" },
      { property: "og:description", content: "Request a password reset link for your ParkSight AI account." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 inline-block">
          <Logo />
        </Link>
        <div className="surface-card p-6">
          {sent ? (
            <div className="text-center">
              <MailCheck className="mx-auto size-8 text-success" />
              <h1 className="mt-3 text-xl font-bold">Check your inbox</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                If an account exists for {email}, a reset link is on its way.
              </p>
              <Button variant="outline" className="mt-5 w-full" asChild>
                <Link to="/auth" search={{ mode: "login" }}>
                  Back to login
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <h1 className="text-xl font-bold">Forgot password</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your email and we'll send a secure reset link.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Send reset link
              </Button>
              <Button variant="ghost" className="w-full" asChild>
                <Link to="/auth" search={{ mode: "login" }}>
                  Back to login
                </Link>
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
