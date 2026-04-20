import type { AuthUser } from "@/types/auth";
import type { Device, HistoryPoint, Position } from "@/types/fleet";

export function normalizeAuthUser(user: AuthUser | null | undefined): AuthUser | null {
  if (!user) return null;

  return {
    ...user,
    fullName: user.fullName || user.full_name || user.name || "",
  };
}

export function normalizeDevice(device: Device): Device {
  return {
    ...device,
    deviceUid: device.deviceUid || device.device_uid || "",
    expiresAt: device.expiresAt || device.expires_at || null,
    simNumber: device.simNumber || device.sim_number || null,
    protocolType: device.protocolType || device.protocol_type || null,
    vehicleId: device.vehicleId ?? device.vehicle_id ?? null,
    vehicleReg: device.vehicleReg || device.plate_number || device.unit_name || null,
  };
}

export function normalizePosition(position: Position): Position {
  return {
    ...position,
    deviceUid: position.deviceUid || position.device_uid || "",
    speedKph: position.speedKph ?? position.speed_kph ?? null,
    deviceTime: position.deviceTime || position.device_time || null,
    receivedAt: position.receivedAt || position.received_at || null,
    locationName: position.locationName || position.location_name || null,
    signalWire: position.signalWire || position.signal_wire || null,
    powerWire: position.powerWire || position.power_wire || null,
    inMotion: position.inMotion ?? position.in_motion ?? null,
    antennaConnected:
      position.antennaConnected ?? position.antenna_connected ?? null,
    totalDistance: position.totalDistance ?? position.total_distance ?? null,
  };
}

export function normalizeHistoryPoint(point: HistoryPoint): HistoryPoint {
  return {
    ...point,
    speedKph: point.speedKph ?? point.speed_kph ?? null,
    receivedAt: point.receivedAt || point.received_at || null,
    deviceTime: point.deviceTime || point.device_time || null,
  };
}