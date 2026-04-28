import { apiClient } from "./client";

export interface TelemetryNormalized {
  deviceUid: string;
  plateNumber: string;
  serial?: string;
  lat: number;
  lon: number;
  speedKph: number;
  heading: number;
  receivedAt: string | null;
}

/**
 * Used by MapView for legacy compatibility.
 * Fetches from /api/telemetry/latest — returns rows with latitude/longitude.
 */
export async function getLatestTelemetry(): Promise<TelemetryNormalized[]> {
  try {
    const res = await apiClient.get("/telemetry/latest?limit=10000");
    const rows = res.data?.data ?? [];
    if (!Array.isArray(rows)) return [];

    return rows
      .map((r: Record<string, unknown>) => {
        const lat = Number(r.latitude);
        const lon = Number(r.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
        if (lat === 0 && lon === 0) return null;

        const receivedAt =
          (r.signal_time as string) ||
          (r.recorded_at as string) ||
          (r.received_at as string) ||
          null;

        return {
          deviceUid: String(r.device_uid ?? r.device_id ?? ""),
          plateNumber: String(r.plate_number ?? "Unknown"),
          serial: r.serial ? String(r.serial) : undefined,
          lat,
          lon,
          speedKph: Number(r.speed ?? 0),
          heading: Number(r.heading ?? 0),
          receivedAt,
        } as TelemetryNormalized;
      })
      .filter(Boolean) as TelemetryNormalized[];
  } catch {
    return [];
  }
}