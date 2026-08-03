import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BarChart3,
  Brain,
  Camera,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User,
  Grid3x3,
} from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAlerts, useProfile } from "@/lib/data";
import { useArea } from "@/lib/area";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/live", label: "Live Monitor", icon: Camera },
  { to: "/areas", label: "Parking Areas", icon: MapPin },
  { to: "/slots", label: "Slot Management", icon: Grid3x3 },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/prediction", label: "ML Prediction", icon: Brain },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--sidebar-primary)]"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className={cn("size-4.5 shrink-0", active && "text-sidebar-primary")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState("");
  const { areas, setAreaId } = useArea();
  const navigate = useNavigate();

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const term = q.toLowerCase();
    return [
      ...NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(term)).map((n) => ({
        key: n.to,
        label: n.label,
        sub: "Page",
        run: () => navigate({ to: n.to }),
      })),
      ...areas
        .filter((a) => a.area_name.toLowerCase().includes(term) || a.location.toLowerCase().includes(term))
        .map((a) => ({
          key: a.id,
          label: a.area_name,
          sub: a.location || "Parking area",
          run: () => {
            setAreaId(a.id);
            navigate({ to: "/dashboard" });
          },
        })),
    ].slice(0, 6);
  }, [q, areas, navigate, setAreaId]);

  return (
    <div className="relative hidden max-w-xs flex-1 md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search pages and areas…"
        aria-label="Search"
        className="pl-9"
      />
      {results.length > 0 && (
        <div className="surface-card absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden p-1">
          {results.map((r) => (
            <button
              key={r.key + r.sub}
              onClick={() => {
                r.run();
                setQ("");
              }}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span>{r.label}</span>
              <span className="text-xs text-muted-foreground">{r.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertsBell() {
  const { user } = useAuth();
  const { data: alerts } = useAlerts(user?.id);
  const unread = (alerts ?? []).filter((a) => !a.is_read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">Smart alerts</div>
        <div className="max-h-80 overflow-y-auto">
          {(alerts ?? []).length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No alerts yet.</p>
          )}
          {(alerts ?? []).map((a) => (
            <div key={a.id} className="border-b px-4 py-3 last:border-0">
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    a.severity === "critical"
                      ? "bg-destructive"
                      : a.severity === "warning"
                        ? "bg-warning"
                        : "bg-primary",
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm leading-snug">{a.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AreaSwitcher() {
  const { areas, areaId, setAreaId } = useArea();
  if (areas.length === 0) return null;
  return (
    <Select value={areaId ?? ""} onValueChange={setAreaId}>
      <SelectTrigger className="hidden w-[200px] sm:flex" aria-label="Active parking area">
        <SelectValue placeholder="Select area" />
      </SelectTrigger>
      <SelectContent>
        {areas.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.area_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b px-4">
          <Link to="/dashboard">
            <Logo />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="border-t p-3 text-[11px] text-muted-foreground">
          ParkSight AI · v1.0 · Demo build
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-16 items-center border-b px-4">
                <Logo />
              </div>
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="lg:hidden">
            <Logo compact />
          </div>

          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1.5">
            <AreaSwitcher />
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
            <AlertsBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu">
                  <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {(profile?.full_name || user?.email || "U").slice(0, 2).toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {profile?.full_name || "Signed in"}
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                  <User className="mr-2 size-4" /> Profile & settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
