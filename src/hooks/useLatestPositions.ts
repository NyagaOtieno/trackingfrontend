import { useQuery } from "@tanstack/react-query";
import { getLatestTelemetry } from "@/api/telemetry";

export function useLatestPositions() {
  return useQuery({
    queryKey: ["telemetry"],
    queryFn: getLatestTelemetry,

    refetchInterval: 5000,   // 🔁 live updates
    staleTime: 3000,

    // ✅ prevent UI crash on big data
    retry: 1,
  });
}