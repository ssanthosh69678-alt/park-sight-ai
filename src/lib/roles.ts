import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export type AppRole = "owner" | "customer";

/**
 * Roles live in the dedicated `user_roles` table (never on the profile) and are
 * assigned server-side by the signup trigger, so they cannot be escalated from
 * the browser.
 */
export function useRole() {
  const { user, loading } = useAuth();
  const query = useQuery({
    queryKey: ["user-role", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AppRole> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data?.role as AppRole | undefined) ?? "customer";
    },
  });

  return {
    role: query.data,
    isOwner: query.data === "owner",
    isCustomer: query.data === "customer",
    loading: loading || query.isLoading,
  };
}

export function homeRouteFor(role: AppRole | undefined) {
  return role === "customer" ? "/search" : "/dashboard";
}
