import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { Device } from "@/types/fleet";

export function useFleetDevices() {
  return useQuery<Device[]>({
    queryKey: ["telemetry"],
    queryFn: async () => {
      const res = await apiClient.get("/api/telemetry/latest");

      const data = res?.data?.data ?? [];

      return data
        .map((d: any) => {
          const latitude = Number(d.latitude);
          const longitude = Number(d.longitude);

          return {
            deviceId: Number(d.device_id),
            deviceUid: d.device_uid,

            latitude,
            longitude,

            speed: Number(d.speed ?? 0),
            heading: Number(d.heading ?? 0),

            lastSeen: d.recorded_at,

            vehicleReg: d.plate_number || d.serial || "Unknown",
            serial: d.serial,

            label: d.plate_number || "Vehicle",
          };
        })
        // 🔥 CRITICAL: remove invalid GPS points
        .filter(
          (v: any) =>
            v.latitude !== 0 &&
            v.longitude !== 0 &&
            !isNaN(v.latitude) &&
            !isNaN(v.longitude)
        );
    },

    refetchInterval: 10000,
    staleTime: 5000,
  });
}