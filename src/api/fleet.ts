import { apiClient, unwrapApiResponse } from "./client";
import type { Device } from "@/types/fleet";

/**
 * ======================================================
 * RAW API TYPE
 * ======================================================
 */
type VehicleApiItem = {
  id?: number;
  plate_number?: string | null;
  unit_name?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  account_id?: number | null;
  status?: string | null;
  device_uid?: string | null;
  label?: string | null;
  vehicle_id?: number | null;
  expires_at?: string | null;
};

/**
 * ======================================================
 * POSITION TYPE
 * ======================================================
 */
export type Position = {
  deviceUid: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  receivedAt?: string;
};

/**
 * ======================================================
 * REAL-TIME CACHE
 * ======================================================
 */
const deviceCache = new Map<string, Device>();
const positionCache = new Map<string, Position>();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

/**
 * ======================================================
 * SAFE UID RESOLUTION (STABLE IDENTITY)
 * ======================================================
 */
function resolveDeviceUid(item: VehicleApiItem): string {
  if (item.device_uid?.trim()) return item.device_uid;

  if (item.id != null) return `vehicle-${item.id}`;

  // DO NOT use randomUUID (breaks identity tracking)
  return `vehicle-unknown-${item.plate_number ?? "x"}`;
}

/**
 * ======================================================
 * VEHICLE MAPPER
 * ======================================================
 */
function mapVehicleToDevice(item: VehicleApiItem): Device {
  const deviceUid = resolveDeviceUid(item);

  const vehicleReg =
    item.plate_number ||
    item.unit_name ||
    item.label ||
    "Unknown Vehicle";

  const label =
    item.label ||
    [item.make, item.model].filter(Boolean).join(" ").trim() ||
    vehicleReg;

  const expiresAt = item.expires_at ?? null;

  return {
    id: item.id,
    deviceUid,
    label,
    vehicleReg,

    vehicleId: item.id ?? null,
    vehicle_id: item.vehicle_id ?? item.id ?? null,

    expiresAt,
    isExpired:
      !!expiresAt && new Date(expiresAt).getTime() < Date.now(),

    status: item.status ?? "active",

    plate_number: item.plate_number ?? null,
    unit_name: item.unit_name ?? null,
    make: item.make ?? null,
    model: item.model ?? null,
    year: item.year ?? null,

    clientId: item.account_id ? String(item.account_id) : null,
  };
}

/**
 * ======================================================
 * FETCH DEVICES (SAFE + CACHE CONTROLLED)
 * ======================================================
 */
export async function fetchDevices(force = false): Promise<Device[]> {
  const now = Date.now();

  // cache valid check
  if (!force && deviceCache.size > 0) {
    return Array.from(deviceCache.values());
  }

  const res = await apiClient.get("/vehicles");

  const rows =
    unwrapApiResponse<VehicleApiItem[]>(res?.data) ??
    [];

  if (!Array.isArray(rows)) {
    console.warn("Invalid vehicles payload");
    return [];
  }

  const seen = new Set<string>();
  const devices: Device[] = [];

  for (const row of rows) {
    const mapped = mapVehicleToDevice(row);

    if (!mapped.deviceUid) continue;
    if (seen.has(mapped.deviceUid)) continue;

    seen.add(mapped.deviceUid);

    deviceCache.set(mapped.deviceUid, mapped);
    devices.push(mapped);
  }

  return devices;
}

/**
 * ======================================================
 * UPSERT DEVICE (REALTIME SAFE MERGE)
 * ======================================================
 */
export function upsertDeviceRealtime(
  update: Partial<Device> & { deviceUid: string }
): Device {
  const existing = deviceCache.get(update.deviceUid);

  const merged: Device = {
    ...(existing ?? {}),
    ...update,
    deviceUid: update.deviceUid,
  };

  deviceCache.set(update.deviceUid, merged);

  return merged;
}

/**
 * ======================================================
 * POSITION UPSERT (MAP OPTIMIZED)
 * ======================================================
 */
export function upsertPositionRealtime(pos: Position) {
  const existing = positionCache.get(pos.deviceUid);

  const merged: Position = {
    ...(existing ?? {}),
    ...pos,
  };

  positionCache.set(pos.deviceUid, merged);

  return merged;
}

/**
 * ======================================================
 * READ HELPERS
 * ======================================================
 */
export const getCachedDevices = () =>
  Array.from(deviceCache.values());

export const getDevice = (deviceUid: string) =>
  deviceCache.get(deviceUid);

export const getCachedPositions = () =>
  Array.from(positionCache.values());

export const getPosition = (deviceUid: string) =>
  positionCache.get(deviceUid);

/**
 * ======================================================
 * SAFE CACHE CLEANUP
 * ======================================================
 */
export const clearFleetCache = () => {
  deviceCache.clear();
  positionCache.clear();
};