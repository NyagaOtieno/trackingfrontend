import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { TelemetryNormalized } from "@/api/telemetry";
import { useFleetStore } from "@/hooks/useFleetStore";

const ONLINE_THRESHOLD_MS = 10 * 60 * 1000;
const SELECTED_ZOOM = 18;
const MAX_MARKERS = 1500;

interface MarkerLayerProps {
  positions: TelemetryNormalized[];
}

function getSpeedColor(speed: number, isOnline: boolean): string {
  if (!isOnline) return "#737373";
  if (speed <= 5) return "#64748b";
  if (speed <= 30) return "#16a34a";
  if (speed <= 80) return "#2563eb";
  return "#dc2626";
}

function createVehicleIcon(isOnline: boolean, speed: number) {
  const color = getSpeedColor(speed, isOnline);

  return L.divIcon({
    className: "",
    iconSize: [12, 12],
    html: `<div style="
      width:12px;
      height:12px;
      background:${color};
      border-radius:50%;
      border:1px solid white;
    "></div>`,
  });
}

export const MarkerLayer = memo(function MarkerLayer({
  positions,
}: MarkerLayerProps) {
  const map = useMap();
  const { selectedDeviceUid, setSelectedDevice } = useFleetStore();

  // ✅ FIXED TYPES
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const iconCacheRef = useRef<Map<string, string>>(new Map());
  const lastCenteredUidRef = useRef<string | null>(null);

  const [, forceRender] = useState(0);

  const safePositions = useMemo(
    () => positions.slice(0, MAX_MARKERS),
    [positions]
  );

  useEffect(() => {
    const existingIds = new Set<string>();

    for (const pos of safePositions) {
      const { lat, lon, speedKph, deviceUid, vehicleReg, receivedAt } = pos;

      if (!lat || !lon) continue;

      existingIds.add(deviceUid);

      const isOnline =
        Date.now() - new Date(receivedAt).getTime() < ONLINE_THRESHOLD_MS;

      const iconKey = `${isOnline}-${Math.round(speedKph / 5)}-${vehicleReg}`;

      let marker = markersRef.current.get(deviceUid);

      if (!marker) {
        marker = L.marker([lat, lon], {
          icon: createVehicleIcon(isOnline, speedKph),
        })
          .addTo(map)
          .on("click", () => {
            setSelectedDevice(deviceUid);
          });

        marker.bindPopup(
          `<div>
            <strong>${vehicleReg}</strong><br/>
            Device: ${deviceUid}<br/>
            Speed: ${Math.round(speedKph)} km/h<br/>
            Status: ${isOnline ? "Online" : "Offline"}
          </div>`
        );

        markersRef.current.set(deviceUid, marker);
        iconCacheRef.current.set(deviceUid, iconKey);
      } else {
        const cur = marker.getLatLng();

        if (cur.lat !== lat || cur.lng !== lon) {
          marker.setLatLng([lat, lon]);
        }

        if (iconCacheRef.current.get(deviceUid) !== iconKey) {
          marker.setIcon(createVehicleIcon(isOnline, speedKph));
          iconCacheRef.current.set(deviceUid, iconKey);
        }
      }
    }

    // cleanup removed markers
    markersRef.current.forEach((marker, uid) => {
      if (!existingIds.has(uid)) {
        map.removeLayer(marker);
        markersRef.current.delete(uid);
        iconCacheRef.current.delete(uid);
      }
    });
  }, [safePositions, map, setSelectedDevice]);

  // center selected
  useEffect(() => {
    if (!selectedDeviceUid) return;

    const marker = markersRef.current.get(selectedDeviceUid);
    if (!marker) return;

    const latLng = marker.getLatLng();

    if (lastCenteredUidRef.current !== selectedDeviceUid) {
      map.flyTo(latLng, SELECTED_ZOOM);
      lastCenteredUidRef.current = selectedDeviceUid;
    }

    marker.openPopup();
  }, [selectedDeviceUid, map]);

  return null;
});