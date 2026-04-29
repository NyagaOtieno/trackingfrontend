import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useAuthStore } from "@/hooks/useAuthStore";
import type { Device, Vehicle } from "@/types/fleet";

const PRIVILEGED = ["admin", "super_admin", "staff", "office_admin", "SUPER_ADMIN"];
function mapVehicle(v: Vehicle): Device {
  const vehicleId = v.vehicleId ?? v.id;

  return {
    id: vehicleId,
    vehicleId: vehicleId,
    vehicle_id: vehicleId,

    // 🔥 SINGLE SOURCE OF TRUTH
    deviceUid: String(vehicleId),

    label: v.unit_name || v.plate_number || `Vehicle ${vehicleId}`,
    plate_number: v.plate_number ?? null,
    unit_name: v.unit_name ?? null,
    serial: v.serial ?? null,
    account_id: v.account_id ?? null,
  };
}

export function useFleetDevices() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["vehicles", user?.id, user?.role],
    queryFn: async (): Promise<Device[]> => {
      try {
        const res = await apiClient.get("/vehicles", {
          params: { limit: 100000, offset: 0 }, // 🔥 remove 200 limit
        });

        const raw: Vehicle[] = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data) ? res.data : [];

        const all = raw.map(mapVehicle);

        const role = user?.role ?? "";
        if (role === "client" && user?.id && !PRIVILEGED.includes(role)) {
          return all.filter(d => d.account_id === user.id);
        }

        return all;
      } catch {
        return [];
      }
    },
    staleTime: 120_000,
    refetchInterval: 300_000,
  });
}