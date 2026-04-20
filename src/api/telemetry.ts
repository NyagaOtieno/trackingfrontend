import { apiClient, unwrapApiResponse } from "./client";

export type TelemetryNormalized = {
  deviceUid: string;     // ✅ string (CRITICAL)
  lat: number;
  lon: number;
  speedKph: number;
  ignition: boolean;
  receivedAt: string;    // ISO timestamp
  vehicleReg: string;
};

export async function getLatestTelemetry(): Promise<TelemetryNormalized[]> {
  const res = await apiClient.get("/telemetry/latest");

  const data = unwrapApiResponse<any[]>(res.data);

  return data
    // ✅ remove invalid coordinates
    .filter((t) => t.latitude !== 0 && t.longitude !== 0)
    .map((t) => ({
      deviceUid: String(t.device_uid), // ✅ FIXED
      lat: Number(t.latitude),
      lon: Number(t.longitude),
      speedKph: Number(t.speed ?? 0),
      ignition: Boolean(t.ignition ?? false),
      receivedAt: t.recorded_at, // ✅ FIXED
      vehicleReg: t.plate_number ?? "Unknown",
    }));
}