import { useQuery } from "@tanstack/react-query";
import { fetchVehiclePosition } from "@/api/positions";
import type { LivePosition } from "@/types/fleet";

/**
 * Fetches the latest known position for a single selected vehicle.
 *
 * Used by AutoFollowVehicle to guarantee we always have coordinates for the
 * selected vehicle even when it's outside the top 15 000 in the batch fetch.
 *
 * - Enabled only when a vehicle is selected
 * - Refetches every 5 seconds while the vehicle is selected (live tracking)
 * - Shares the React Query cache — no duplicate requests if already fetched
 */
export function useVehiclePosition(vehicleId: string | null): LivePosition | null {
  const { data } = useQuery<LivePosition | null>({
    queryKey: ["vehicle-position", vehicleId],
    queryFn:  () => fetchVehiclePosition(vehicleId!),
    enabled:  !!vehicleId,
    refetchInterval:      5_000,
    staleTime:            4_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return data ?? null;
}