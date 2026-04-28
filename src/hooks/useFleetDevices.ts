import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useAuthStore } from "@/hooks/useAuthStore";
import type { Device, Vehicle } from "@/types/fleet";

const PRIVILEGED = ["admin", "super_admin", "staff", "office_admin", "SUPER_ADMIN"];

function mapVehicle(v: Vehicle): Device {
  return {
    id:           v.id,
    deviceUid:    String(v.id),   // ← single consistent key: String(id)
    label:        v.unit_name || v.plate_number || `Vehicle ${v.id}`,
    vehicleReg:   v.plate_number ?? null,
    plate_number: v.plate_number ?? null,
    unit_name:    v.unit_name ?? null,
    serial:       v.serial ?? null,
    account_id:   v.account_id ?? null,
    make:         v.make ?? null,
    model:        v.model ?? null,
    year:         v.year ?? null,
    status:       v.status ?? null,
    vehicleId:    v.id,
    vehicle_id:   v.id,
    isExpired:    false,
    clientId:     v.account_id ? String(v.account_id) : null,
  };
}

export function useFleetDevices() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["vehicles", user?.id, user?.role],
    queryFn: async (): Promise<Device[]> => {
      try {
        // Pass high limit to get ALL vehicles from backend
        const res = await apiClient.get("/vehicles", {
          params: { limit: 100000, offset: 0 },
        });
        const raw: Vehicle[] = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data) ? res.data : [];

        const all = raw.map(mapVehicle);

        const role = user?.role ?? "";
        if (role === "client" && user?.id && !PRIVILEGED.includes(role)) {
          return all.filter(d => d.account_id != null && d.account_id === user.id);
        }
        return all;
      } catch { return []; }
    },
    staleTime: 120_000,
    refetchInterval: 300_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}