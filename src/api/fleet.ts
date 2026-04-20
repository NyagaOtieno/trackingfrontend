import { apiClient, unwrapApiResponse } from "./client";
import type { Device, ApiResponse } from "@/types/fleet";

type VehicleApiItem = {
  id?: number;
  plate_number?: string | null;
  unit_name?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  account_id?: number | null;
  status?: string | null;

  // optional joined device fields if backend includes them
  device_uid?: string | null;
  label?: string | null;
  imei?: string | null;
  sim_number?: string | null;
  protocol_type?: string | null;
  vehicle_id?: number | null;
  expires_at?: string | null;
};

function mapVehicleToDevice(item: VehicleApiItem): Device {
  const deviceUid =
    item.device_uid ||
    `vehicle-${item.id ?? item.plate_number ?? Math.random().toString(36).slice(2)}`;

  const vehicleReg = item.plate_number || item.unit_name || "Unknown Vehicle";
  const label =
    item.label ||
    [item.make, item.model].filter(Boolean).join(" ").trim() ||
    item.unit_name ||
    vehicleReg;

  const expiresAt = item.expires_at ?? null;
  const isExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;

  return {
    id: item.id,
    deviceUid,
    device_uid: item.device_uid ?? undefined,
    label,
    vehicleReg,
    vehicleId: item.id ?? null,
    vehicle_id: item.vehicle_id ?? item.id ?? null,
    expiresAt,
    expires_at: expiresAt,
    isExpired,
    status: item.status ?? "active",
    plate_number: item.plate_number ?? null,
    unit_name: item.unit_name ?? null,
    make: item.make ?? null,
    model: item.model ?? null,
    year: item.year ?? null,
    clientId: item.account_id ? String(item.account_id) : null,
  };
}

export async function fetchDevices(): Promise<Device[]> {
  const response = await apiClient.get<ApiResponse<VehicleApiItem[]> | VehicleApiItem[]>(
    "/api/vehicles"
  );

  const rows = unwrapApiResponse<VehicleApiItem[]>(response.data) ?? [];
  return rows.map(mapVehicleToDevice);
}