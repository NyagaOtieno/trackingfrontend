import { useQuery } from "@tanstack/react-query";
import { apiClient, unwrapApiResponse } from "@/api/client";

export function useFleetDevices() {
  return useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await apiClient.get("/api/vehicles");
      const data = unwrapApiResponse<Record<string, unknown>[]>(res.data);
      return (data ?? []).map((v) => ({
        ...v,
        deviceUid: String(v.device_uid ?? v.id ?? ""),
        vehicleReg: (v.plate_number as string) ?? "Unknown",
        label: (v.unit_name as string) ?? "",
      }));
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}