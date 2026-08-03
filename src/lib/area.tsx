import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import { useAreas } from "./data";
import type { ParkingArea } from "./parking";

type AreaContextValue = {
  areas: ParkingArea[];
  area: ParkingArea | undefined;
  areaId: string | undefined;
  setAreaId: (id: string) => void;
  loading: boolean;
};

const AreaContext = createContext<AreaContextValue>({
  areas: [],
  area: undefined,
  areaId: undefined,
  setAreaId: () => {},
  loading: true,
});

const KEY = "parksight-area";

export function AreaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: areas, isLoading } = useAreas(user?.id);
  const [areaId, setAreaIdState] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!areas?.length) return;
    const stored = window.localStorage.getItem(KEY);
    const valid = areas.find((a) => a.id === stored) ?? areas[0];
    setAreaIdState((current) => (areas.some((a) => a.id === current) ? current : valid?.id));
  }, [areas]);

  const value = useMemo<AreaContextValue>(
    () => ({
      areas: areas ?? [],
      areaId,
      area: (areas ?? []).find((a) => a.id === areaId),
      setAreaId: (id: string) => {
        window.localStorage.setItem(KEY, id);
        setAreaIdState(id);
      },
      loading: isLoading,
    }),
    [areas, areaId, isLoading],
  );

  return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>;
}

export function useArea() {
  return useContext(AreaContext);
}
