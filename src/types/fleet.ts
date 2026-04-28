// ─── Filter ───────────────────────────────────────────────────────────────────
export type FilterStatus = "all" | "online" | "offline" | "expired" | "alerts";

export interface FilterCountMap {
  all: number;
  online: number;
  offline: number;
  expired: number;
  alerts: number;
}

// ─── Vehicle (from /api/vehicles) ─────────────────────────────────────────────
export interface Vehicle {
  id: number;
  plate_number: string | null;
  unit_name: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  status?: string | null;
  serial?: string | null;
  account_id?: number | null;
  created_at?: string | null;
}

// ─── Device (normalized vehicle for UI) ───────────────────────────────────────
export interface Device {
  id?: number;
  deviceUid: string;
  label: string;
  vehicleReg?: string | null;
  plate_number?: string | null;
  unit_name?: string | null;
  serial?: string | null;
  account_id?: number | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  status?: string | null;
  expiresAt?: string | null;
  isExpired?: boolean;
  alertCount?: number;
  clientId?: string | null;
  vehicleId?: number | null;
  vehicle_id?: number | null;
  device_uid?: string;
}

// ─── Position (from /api/positions/latest) ────────────────────────────────────
export interface LivePosition {
  deviceId: number;
  deviceUid: string;
  lat: string | number;
  lon: string | number;
  speedKph: string | number;
  heading: string | number;
  deviceTime?: string | null;
  receivedAt: string | null;
  vehicleId: number;
  plateNumber?: string | null;
  unitName?: string | null;
  accountId?: number | null;
}

// ─── Telemetry (from /api/telemetry/latest) ───────────────────────────────────
export interface TelemetryRow {
  device_id: string;
  device_uid: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  recorded_at: string | null;
  signal_time?: string | null;
  received_at?: string | null;
  plate_number?: string | null;
  serial?: string | null;
}

// ─── VehicleState (merged for sidebar) ───────────────────────────────────────
export interface VehicleState extends Device {
  position?: LivePosition | null;
  isOnline: boolean;
  isAlert: boolean;
  isExpiredResolved: boolean;
  lastSeen: string | null;
  displayName: string;
}

// ─── Alert ────────────────────────────────────────────────────────────────────
export interface AlertItem {
  id?: string | number;
  deviceId?: string | number;
  deviceUid?: string;
  type?: string;
  severity?: string;
  message?: string;
  createdAt?: string;
  plate_number?: string;
}

// ─── Generic API wrapper ──────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  message?: string;
  error?: string;
}

// ─── History ─────────────────────────────────────────────────────────────────
export interface HistoryPoint {
  lat?: number | null;
  lon?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  speedKph?: number | null;
  speed_kph?: number | null;
  speed?: number | null;
  heading?: number | null;
  receivedAt?: string | null;
  received_at?: string | null;
  deviceTime?: string | null;
  device_time?: string | null;
}

export interface Position {
  deviceUid?: string;
  device_uid?: string;
  lat?: number | null;
  lon?: number | null;
  speedKph?: number | null;
  speed_kph?: number | null;
  heading?: number | null;
  receivedAt?: string | null;
  received_at?: string | null;
  deviceTime?: string | null;
  device_time?: string | null;
  locationName?: string | null;
  location_name?: string | null;
  signalWire?: boolean | null;
  signal_wire?: boolean | null;
  powerWire?: boolean | null;
  power_wire?: boolean | null;
  inMotion?: boolean | null;
  in_motion?: boolean | null;
  antennaConnected?: boolean | null;
  antenna_connected?: boolean | null;
  totalDistance?: number | null;
  total_distance?: number | null;
}