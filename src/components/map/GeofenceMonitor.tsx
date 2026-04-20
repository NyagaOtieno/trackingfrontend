import { useEffect, useRef } from "react";
import { useFleetStore } from "@/hooks/useFleetStore";
import type { Position } from "@/types/fleet";

interface GeofenceMonitorProps {
  positions: Position[];
}

function toNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.trim()) : Number(value);
  return Number.isFinite(n) ? n : null;
}

function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function GeofenceMonitor({ positions }: GeofenceMonitorProps) {
  const { geofences, addGeofenceAlert } = useFleetStore();
  const stateRef = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    positions.forEach((pos) => {
      const lat = toNumber(pos.lat);
      const lon = toNumber(pos.lon);
      if (lat === null || lon === null) return;

      geofences
        .filter((g) => g.active !== false)
        .forEach((g) => {
          const dist = distanceMeters(lat, lon, g.center[0], g.center[1]);
          const inside = dist <= g.radius;

          const stateKey = `${pos.deviceUid}:${g.id}`;
          const previous = stateRef.current.get(stateKey);

          if (previous === undefined) {
            stateRef.current.set(stateKey, inside);
            return;
          }

          if (previous !== inside) {
            addGeofenceAlert({
              id: `${stateKey}:${Date.now()}`,
              deviceUid: pos.deviceUid,
              geofenceId: g.id,
              geofenceName: g.name,
              type: inside ? "ENTER" : "EXIT",
              time: new Date().toISOString(),
            });

            stateRef.current.set(stateKey, inside);
          }
        });
    });
  }, [positions, geofences, addGeofenceAlert]);

  return null;
}

export default GeofenceMonitor;