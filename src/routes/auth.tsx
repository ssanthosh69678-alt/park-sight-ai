import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Building2, Car, Eye, EyeOff, Loader2 } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

const searchSchema = z.object({
  mode: z.enum(["login", "signup", "demo"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — ParkSight AI" },
      { name: "description", content: "Create your ParkSight AI account or sign in to your parking dashboard." },
      { property: "og:title", content: "Sign in — ParkSight AI" },
      { property: "og:description", content: "Access your intelligent parking monitoring dashboard." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your full name").max(100),
    email: z.string().trim().email("Enter a valid email").max(255),
    phone: z.string().trim().min(6, "Enter a valid phone number").max(20),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirm: z.string(),
    role: z.enum(["customer", "owner"]),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });


function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState(mode === "login" ? "login" : mode ? "signup" : "login");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="gradient-hero relative hidden flex-col justify-between p-12 text-white lg:flex">
        <div className="grid-backdrop absolute inset-0 opacity-30" />
        <Link to="/" className="relative">
          <Logo />
        </Link>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">See. Analyze. Predict. Park Smarter.</h2>
          <p className="mt-4 text-white/75">
            Detection, statistics and machine-learning forecasting for your parking areas — with every
            simulated value clearly labelled.
          </p>
        </div>
        <p className="relative text-xs text-white/60">© ParkSight AI</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          {mode === "demo" && (
            <p className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              Demo Mode creates a parking area seeded with clearly-labelled simulated data. Create an
              account to try it.
            </p>
          )}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            <TabsContent value="signup">
              <SignupForm onDone={() => setTab("login")} />
            </TabsContent>
          </Tabs>
          <GoogleButton />
        </div>
      </div>
    </div>
  );
}

function GoogleButton() {
  const [busy, setBusy] = useState(false);
  async function signInWithGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    window.location.href = "/dashboard";
  }
  return (
    <>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
      <Button variant="outline" className="w-full" onClick={signInWithGoogle} disabled={busy}>
        {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Continue with Google
      </Button>
    </>
  );
}

async function routeForCurrentUser() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return "/dashboard" as const;
  const { data: row } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .limit(1)
    .maybeSingle();
  return row?.role === "customer" ? ("/search" as const) : ("/dashboard" as const);
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    if (remember) window.localStorage.setItem("parksight-remember-email", email.trim());
    else window.localStorage.removeItem("parksight-remember-email");
    const to = await routeForCurrentUser();
    setBusy(false);
    toast.success("Welcome back");
    navigate({ to });
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <Link to="/forgot-password" className="text-xs text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="login-password"
            type={show ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="size-4 accent-[var(--primary)]"
        />
        Remember me
      </label>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Login
      </Button>
    </form>
  );
}

function SignupForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    role: "customer" as "customer" | "owner",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
          role: parsed.data.role,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setSent(true);
      toast.success("Check your email to confirm your account");
      return;
    }
    toast.success("Account created");
    onDone();
  }

  if (sent) {
    return (
      <div className="mt-8 rounded-xl border p-6 text-center">
        <h3 className="font-semibold">Confirm your email</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to <strong>{form.email}</strong>. Click it, then sign in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="space-y-2">
        <Label>I am a</Label>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { value: "customer", label: "Customer", hint: "Find & book parking", icon: Car },
              { value: "owner", label: "Parking Owner", hint: "Manage my parking", icon: Building2 },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set("role", opt.value)}
              className={
                "rounded-xl border p-3 text-left transition-colors " +
                (form.role === opt.value
                  ? "border-primary bg-primary/10"
                  : "hover:border-primary/40 hover:bg-accent/50")
              }
            >
              <opt.icon className="mb-1.5 size-4 text-primary" />
              <span className="block text-sm font-semibold">{opt.label}</span>
              <span className="block text-xs text-muted-foreground">{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
        {errors["fullName"] && <p className="text-xs text-destructive">{errors["fullName"]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        {errors["email"] && <p className="text-xs text-destructive">{errors["email"]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        {errors["phone"] && <p className="text-xs text-destructive">{errors["phone"]}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors["password"] && <p className="text-xs text-destructive">{errors["password"]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <Input
            id="confirm"
            type={show ? "text" : "password"}
            value={form.confirm}
            onChange={(e) => set("confirm", e.target.value)}
          />
          {errors["confirm"] && <p className="text-xs text-destructive">{errors["confirm"]}</p>}
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Create account
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Passwords are hashed by the authentication service — never stored in plain text.
      </p>
    </form>
  );
}

