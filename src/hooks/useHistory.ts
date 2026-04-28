import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

export function useHistory(deviceUid: string | null, range?: string) {
  return useQuery({
    queryKey: ["history", deviceUid, range],
    enabled: !!deviceUid,
    staleTime: 30000,
    queryFn: async () => {
      const res = await apiClient.get("/telemetry/latest", {
        params: {
          deviceUid,
          range,
        },
      });

      return res.data?.data ?? [];
    },
  });
}