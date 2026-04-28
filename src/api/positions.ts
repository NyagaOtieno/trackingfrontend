import { apiClient } from "./client";
import type { LivePosition } from "@/types/fleet";

export async function fetchLatestPositions(): Promise<LivePosition[]> {
  try {
    const res = await apiClient.get("/positions/latest");
    const raw = res.data?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((p: any) => ({
      deviceId:    Number(p.deviceId ?? 0),
      deviceUid:   String(p.deviceUid ?? ""),
      lat:         p.lat,
      lon:         p.lon,
      speedKph:    p.speedKph,
      heading:     p.heading,
      deviceTime:  p.deviceTime ?? null,
      receivedAt:  p.receivedAt ?? null,
      vehicleId:   Number(p.vehicleId ?? 0),
      plateNumber: p.plateNumber ?? null,
      unitName:    p.unitName ?? null,
      accountId:   p.accountId ?? null,
    })) as LivePosition[];
  } catch { return []; }
}

export async function fetchHistory(
  deviceUid: string,
  range?: { from?: string; to?: string; limit?: number }
): Promise<import("@/types/fleet").HistoryPoint[]> {
  try {
    const params: Record<string, any> = { vehicleId: deviceUid, limit: range?.limit ?? 500 };
    if (range?.from) params.from = range.from;
    if (range?.to)   params.to   = range.to;

    const res = await apiClient.get("/telemetry/latest", { params });
    const raw = res.data?.data ?? [];
    if (!Array.isArray(raw)) return [];

    return raw
      .map((r: any) => {
        const lat = Number(r.latitude ?? r.lat);
        const lon = Number(r.longitude ?? r.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        if (lat === 0 && lon === 0) return null;
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
        return {
          lat,
          lon,
          speedKph:   Number(r.speed ?? r.speed_kph ?? 0),
          heading:    Number(r.heading ?? 0),
          receivedAt: r.signal_time ?? r.recorded_at ?? r.received_at ?? null,
        };
      })
      .filter(Boolean) as import("@/types/fleet").HistoryPoint[];
  } catch { return []; }
}