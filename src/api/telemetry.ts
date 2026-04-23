import { apiClient } from "./client";

export interface TelemetryNormalized {
  deviceUid: string;
  lat: number;
  lon: number;
  speedKph: number;
  heading: number;
  ignition: boolean;
  receivedAt: string | null;
  vehicleReg: string;
  signal_time?: string | null;
}

export async function getLatestTelemetry(): Promise<TelemetryNormalized[]> {
  const res = await apiClient.get("/api/telemetry/latest?limit=10000");
  const rows = res.data?.data ?? [];

  return rows
    .map((r: Record<string, unknown>) => {
      const lat = Number(r.latitude);
      const lon = Number(r.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      if (lat === 0 && lon === 0) return null;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

      const receivedAt =
        (r.signal_time as string) ||
        (r.recorded_at as string) ||
        (r.received_at as string) ||
        null;

      return {
        deviceUid: String(r.device_uid ?? r.device_id ?? ""),
        lat,
        lon,
        speedKph: Number(r.speed ?? 0),
        heading: Number(r.heading ?? 0),
        ignition: Boolean(r.ignition),
        receivedAt,
        vehicleReg: (r.plate_number as string) ?? "Unknown",
        signal_time: receivedAt,
      } as TelemetryNormalized;
    })
    .filter(Boolean) as TelemetryNormalized[];
}