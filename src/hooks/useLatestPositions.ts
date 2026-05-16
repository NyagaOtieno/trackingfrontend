import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchLatestPositions } from "@/api/positions";
import { useFleetStore } from "@/hooks/useFleetStore";

/**
 * Loads the 5 000 most-recently-heard positions every 5 seconds.
 *
 * Why 5 000 and not 15 000 (3 pages)?
 * - The 5 000 most recent records are the "live" vehicles. Older ones are
 *   offline/idle and their positions are already in MarkerLayer memory from
 *   previous ticks — no need to re-fetch them every 5 s.
 * - Selected vehicles outside the top 5 000 are fetched on-demand by
 *   useVehiclePosition() inside AutoFollowVehicle.
 * - 5 000 rows ≈ 1–2 MB JSON — fast to parse and keeps React renders cheap.
 */
export function useLatestPositions() {
  const setIsConnected = useFleetStore((s) => s.setIsConnected);
  const setLastUpdated = useFleetStore((s) => s.setLastUpdated);

  const query = useQuery({
    queryKey: ["positions"],
    queryFn:  () => fetchLatestPositions({ limit: 5_000, offset: 0 }),
    refetchInterval:      5_000,
    staleTime:            4_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    if (query.isSuccess) {
      setIsConnected(true);
      setLastUpdated(new Date());
    }
    if (query.isError) setIsConnected(false);
  }, [query.isSuccess, query.isError, setIsConnected, setLastUpdated]);

  return query;
}
