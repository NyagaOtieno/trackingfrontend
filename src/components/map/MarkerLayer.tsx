import { memo, useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useFleetStore } from "@/hooks/useFleetStore";

// ✅ SAME thresholds as sidebar
const ONLINE_MS = 60_000;
const ALERT_MS = 5 * 3600_000;

const SELECTED_ZOOM = 18;
const MAX_MARKERS = 5000; // increase safely

function getStatus(ts?: string) {
  if (!ts) return "alert";
  const age = Date.now() - new Date(ts).getTime();
  if (age < ONLINE_MS) return "online";
  if (age < ALERT_MS) return "offline";
  return "alert";
}

function getColor(status: string, speed: number) {
  if (status === "alert") return "#f59e0b"; // amber
  if (status === "offline") return "#6b7280";
  if (speed <= 5) return "#64748b";
  if (speed <= 30) return "#16a34a";
  if (speed <= 80) return "#2563eb";
  return "#dc2626";
}

function createIcon(status: string, speed: number) {
  const color = getColor(status, speed);

  return L.divIcon({
    className: "",
    iconSize: [14, 14],
    html: `<div style="
      width:14px;height:14px;
      background:${color};
      border-radius:50%;
      border:2px solid white;
    "></div>`,
  });
}

export const MarkerLayer = memo(function MarkerLayer({ vehicles }: any) {
  const map = useMap();
  const { selectedDeviceUid, setSelectedDevice } = useFleetStore();

  const markersRef = useRef(new Map());

  const safeVehicles = useMemo(
    () => vehicles.filter((v: any) => v.position).slice(0, MAX_MARKERS),
    [vehicles]
  );

  useEffect(() => {
    const active = new Set();

    for (const v of safeVehicles) {
      const p = v.position;
      if (!p) continue;

      const lat = Number(p.lat);
      const lon = Number(p.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      const uid = String(v.deviceUid);
      active.add(uid);

      const status = getStatus(p.receivedAt);
      const icon = createIcon(status, p.speedKph || 0);

      let marker = markersRef.current.get(uid);

      if (!marker) {
        marker = L.marker([lat, lon], { icon })
          .addTo(map)
          .on("click", () => setSelectedDevice(uid));

        markersRef.current.set(uid, marker);
      } else {
        marker.setLatLng([lat, lon]);
        marker.setIcon(icon);
      }
    }

    markersRef.current.forEach((marker, uid) => {
      if (!active.has(uid)) {
        map.removeLayer(marker);
        markersRef.current.delete(uid);
      }
    });
  }, [safeVehicles]);

  useEffect(() => {
    if (!selectedDeviceUid) return;
    const marker = markersRef.current.get(selectedDeviceUid);
    if (marker) {
      map.flyTo(marker.getLatLng(), SELECTED_ZOOM);
    }
  }, [selectedDeviceUid]);

  return null;
});