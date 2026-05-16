import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useAuthStore } from "@/hooks/useAuthStore";
import type { Device, Vehicle } from "@/types/fleet";

const PRIVILEGED = ["admin", "super_admin", "staff", "office_admin", "SUPER_ADMIN"];

function mapVehicle(v: Vehicle): Device {
  const vehicleId = v.vehicleId ?? v.id;
  return {
    id: vehicleId,
    vehicleId,
    vehicle_id: vehicleId,
    deviceUid: String(vehicleId),
    label: v.unit_name || v.plate_number || `Vehicle ${vehicleId}`,
    plate_number: v.plate_number ?? null,
    unit_name: v.unit_name ?? null,
    serial: v.serial ?? null,
    account_id: v.account_id ?? null,
  };
}

// ─── Internal full result (never exposed directly to callers) ────────────────
interface FleetRaw {
  devices: Device[];
  serverTotal: number;
}

function buildQueryOptions(user: any, params?: {
  search?: string; limit?: number; offset?: number; enabled?: boolean;
}) {
  return {
    queryKey: [
      "vehicles",
      user?.id,
      user?.role,
      params?.search ?? "",
      params?.limit,
      params?.offset,
    ] as const,

    enabled: params?.enabled ?? true,

    queryFn: async (): Promise<FleetRaw> => {
      const res = await apiClient.get("/vehicles", {
        params: {
          limit: params?.limit ?? 100,   // small page keeps browser fast
          offset: params?.offset ?? 0,
          ...(params?.search?.trim() ? { search: params.search.trim() } : {}),
        },
      });

      const raw: Vehicle[] = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];

      const serverTotal: number =
        typeof res.data?.total === "number" ? res.data.total : raw.length;

      const all = raw.map(mapVehicle);
      const role = user?.role ?? "";
      const devices =
        role === "client" && user?.id && !PRIVILEGED.includes(role)
          ? all.filter((d: Device) => d.account_id === user.id)
          : all;

      return { devices, serverTotal };
    },

    staleTime: 120_000,
    refetchInterval: 300_000,
    placeholderData: (prev: FleetRaw | undefined) => prev,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY HOOK — data is Device[] (backward-compatible, no callers break)
// ─────────────────────────────────────────────────────────────────────────────
export function useFleetDevices(params?: {
  search?: string; limit?: number; offset?: number; enabled?: boolean;
}) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    ...buildQueryOptions(user, params),
    select: (raw: FleetRaw): Device[] => raw.devices,  // callers get Device[]
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TOTAL HOOK — shares the SAME cache entry (zero extra network requests)
// Use this only where you need the real DB count for the bracket.
// ─────────────────────────────────────────────────────────────────────────────
export function useFleetServerTotal(params?: {
  search?: string; limit?: number; offset?: number; enabled?: boolean;
}) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    ...buildQueryOptions(user, params),
    select: (raw: FleetRaw): number => raw.serverTotal,
  });
}