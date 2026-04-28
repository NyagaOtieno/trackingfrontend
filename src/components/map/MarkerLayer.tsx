import { memo, useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useFleetStore } from "@/hooks/useFleetStore";
import type { LivePosition } from "@/types/fleet";

const OFFLINE_MS   = 3 * 60_000;
const ALERT_MS     = 5 * 3600_000;
const SELECTED_ZOOM = 16;
const MAX_MARKERS   = 10000;

function getStatus(receivedAt?: string | null) {
  if (!receivedAt) return "alert";
  const age = Date.now() - new Date(receivedAt).getTime();
  if (age < OFFLINE_MS) return "online";
  if (age < ALERT_MS)   return "offline";
  return "alert";
}

function getColor(status: string, speed: number) {
  if (status === "alert")   return "#f59e0b";
  if (status === "offline") return "#6b7280";
  if (speed > 0)  return "#16a34a";
  return "#6b7280";
}

function makeIcon(status: string, speed: number) {
  const color = getColor(status, speed);
  return L.divIcon({
    className: "",
    iconSize: [14, 14],
    html: `<div style="width:14px;height:14px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 0 6px ${color}88;"></div>`,
  });
}

interface Props { vehicles: LivePosition[]; }

export const MarkerLayer = memo(function MarkerLayer({ vehicles }: Props) {
  const map = useMap();
  const { selectedDeviceUid, setSelectedDevice } = useFleetStore();
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  const safe = useMemo(() => {
    if (!Array.isArray(vehicles)) return [];
    return vehicles
      .map(v => {
        const lat = Number(v.lat);
        const lon = Number(v.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        if (lat === 0 && lon === 0) return null;
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

        // KEY FIX: use String(vehicleId) — matches device.deviceUid = String(vehicle.id)
        const uid = v.vehicleId ? String(v.vehicleId) : String(v.deviceUid ?? "");
        if (!uid) return null;

        return {
          uid,
          plateNumber: v.plateNumber ?? "Unknown",
          lat, lon,
          speed: Number(v.speedKph ?? 0),
          receivedAt: v.receivedAt ?? null,
        };
      })
      .filter(Boolean)
      .slice(0, MAX_MARKERS) as { uid: string; plateNumber: string; lat: number; lon: number; speed: number; receivedAt: string | null }[];
  }, [vehicles]);

  useEffect(() => {
    const active = new Set<string>();

    for (const v of safe) {
      active.add(v.uid);
      const status   = getStatus(v.receivedAt);
      const icon     = makeIcon(status, v.speed);
      const latlng: [number, number] = [v.lat, v.lon];
      const isSelected = selectedDeviceUid === v.uid;

      let marker = markersRef.current.get(v.uid);
      if (!marker) {
        marker = L.marker(latlng, { icon, zIndexOffset: isSelected ? 1000 : 0 })
          .addTo(map)
          .bindTooltip(
            `<b>${v.plateNumber}</b><br/><span style="color:#888">${status}</span>`,
            { direction: "top", offset: [0, -8] }
          )
          .on("click", () => setSelectedDevice(v.uid));
        markersRef.current.set(v.uid, marker);
      } else {
        marker.setLatLng(latlng);
        marker.setIcon(icon);
        (marker as any).setZIndexOffset?.(isSelected ? 1000 : 0);
      }
    }

    // Remove stale
    markersRef.current.forEach((marker, uid) => {
      if (!active.has(uid)) {
        map.removeLayer(marker);
        markersRef.current.delete(uid);
      }
    });
  }, [safe, map, setSelectedDevice, selectedDeviceUid]);

  // Fly to selected
  useEffect(() => {
    if (!selectedDeviceUid) return;
    const marker = markersRef.current.get(String(selectedDeviceUid));
    if (marker) {
      map.flyTo(marker.getLatLng(), SELECTED_ZOOM, { duration: 1.2 });
    }
  }, [selectedDeviceUid, map]);

  // Cleanup
  useEffect(() => {
    return () => {
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current.clear();
    };
  }, [map]);

  return null;
});