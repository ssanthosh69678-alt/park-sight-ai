import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  Brain,
  Camera,
  ChevronRight,
  Cpu,
  Database,
  Gauge,
  LineChart,
  ScanEye,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import heroImage from "@/assets/hero-parking.jpg";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { Moon, Sun } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ParkSight AI — See. Analyze. Predict. Park Smarter." },
      {
        name: "description",
        content:
          "ParkSight AI combines computer-vision parking detection, statistical analytics and machine-learning availability prediction in one clean dashboard.",
      },
      { property: "og:title", content: "ParkSight AI — Intelligent Parking Detection & Prediction" },
      {
        property: "og:description",
        content:
          "AI vehicle detection, real-time monitoring, statistics and ML occupancy forecasting for any parking area.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    icon: ScanEye,
    title: "AI Vehicle Detection",
    body: "Camera frames are passed to an OpenCV + YOLO pipeline that locates vehicles and maps them onto your configured parking regions.",
  },
  {
    icon: Activity,
    title: "Real-Time Monitoring",
    body: "Each slot is classified as available, occupied or unknown, and the dashboard updates as detection results arrive.",
  },
  {
    icon: BarChart3,
    title: "Statistical Analytics",
    body: "Mean, median, mode, variance, standard deviation, peak-hour and correlation analysis over your occupancy history.",
  },
  {
    icon: Brain,
    title: "Machine Learning Prediction",
    body: "A regression model trained on historical occupancy forecasts how full the lot will be at any future date and time.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    body: "Get notified when a lot passes 90% occupancy, when availability drops, or when the camera feed fails.",
  },
];

const FEATURES = [
  { icon: Camera, title: "Camera configuration", body: "Upload a lot image or use your browser camera, then mark each parking region." },
  { icon: Gauge, title: "Capacity calibration", body: "You define the true capacity — never guessed from a single camera angle." },
  { icon: LineChart, title: "Trend charts", body: "Hourly, daily and weekly occupancy trends with date filtering." },
  { icon: ShieldCheck, title: "Per-user isolation", body: "Row-level security keeps every user's parking data completely private." },
  { icon: Database, title: "Full history", body: "Occupancy records, camera sessions and predictions are stored and exportable." },
  { icon: Sparkles, title: "Honest demo mode", body: "Simulated data is always labelled — never presented as real detections." },
];

const TECH = [
  "React + TypeScript",
  "Tailwind CSS",
  "Recharts",
  "Python Flask REST API",
  "SQLAlchemy + SQLite",
  "Pandas / NumPy",
  "Scikit-learn",
  "OpenCV",
  "YOLO / Ultralytics",
  "JWT authentication",
];

function Landing() {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/auth" search={{ mode: "login" }}>
                Login
              </Link>
            </Button>
            <Button asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" />
                Statistics + Machine Learning for smart parking
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
                See. Analyze. <span className="gradient-text">Predict.</span> Park Smarter.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                AI-powered parking monitoring, statistical analytics and intelligent availability
                prediction in one platform.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Get Started <ChevronRight className="ml-1 size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/auth" search={{ mode: "login" }}>
                    Login
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/auth" search={{ mode: "demo" }}>
                    Explore Demo
                  </Link>
                </Button>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
                {[
                  ["6", "Live modules"],
                  ["11", "Statistical metrics"],
                  ["100%", "Data isolation"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <dt className="text-2xl font-bold">{v}</dt>
                    <dd className="text-xs text-muted-foreground">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-2xl border glow-ring">
                <img
                  src={heroImage}
                  alt="Aerial view of a parking lot with AI detection boxes over each vehicle"
                  width={1600}
                  height={1008}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="surface-card absolute -bottom-6 left-4 hidden items-center gap-3 px-4 py-3 sm:flex">
                <span className="size-2.5 animate-pulse rounded-full bg-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Occupancy right now</p>
                  <p className="text-lg font-bold tabular-nums">64% · 18 free</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-secondary/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">How ParkSight AI works</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            A five-stage pipeline from camera frame to forecast — each stage is a separate, replaceable
            module.
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="surface-card p-6 transition-transform hover:-translate-y-1">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                    <s.icon className="size-5" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    STAGE {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold">Features</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-border/70 p-5 transition-colors hover:border-primary/40">
                <f.icon className="size-5 text-primary" />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="gradient-hero border-y py-20 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center gap-3">
            <Cpu className="size-6" />
            <h2 className="text-3xl font-bold">Technology</h2>
          </div>
          <p className="mt-3 max-w-2xl text-white/75">
            A modern web front end, a Python REST API and a computer-vision + machine-learning service —
            cleanly separated so each layer can be swapped or run locally.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {TECH.map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-sm font-medium"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <Logo />
          <p className="text-xs text-muted-foreground">
            ParkSight AI — Intelligent Parking Space Detection, Monitoring & Availability Prediction.
            Demo data is always labelled.
          </p>
        </div>
      </footer>
    </div>
  );
}
