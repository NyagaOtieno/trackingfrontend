import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { useFleetStore } from "@/hooks/useFleetStore";
import type { Position } from "@/types/fleet";

interface AutoFollowVehicleProps {
  positions: Position[];
}

function toNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.trim()) : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function AutoFollowVehicle({ positions }: AutoFollowVehicleProps) {
  const map = useMap();
  const {
    selectedDeviceUid,
    autoFollow,
    playbackActive,
    centerRequested,
  } = useFleetStore();

  const lastHandledCenterRef = useRef<number>(0);
  const lastFollowedUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedDeviceUid) return;

    const selected = positions.find((p) => p.deviceUid === selectedDeviceUid);
    if (!selected) return;

    const lat = toNumber(selected.lat);
    const lon = toNumber(selected.lon);

    if (lat === null || lon === null) return;

    const explicitCenter = centerRequested !== lastHandledCenterRef.current;
    const newSelection = lastFollowedUidRef.current !== selectedDeviceUid;

    if (!autoFollow && !explicitCenter && !newSelection) return;
    if (playbackActive) return;

    map.flyTo([lat, lon], Math.max(map.getZoom(), 17), {
      animate: true,
      duration: 0.5,
    });

    lastHandledCenterRef.current = centerRequested;
    lastFollowedUidRef.current = selectedDeviceUid;
  }, [positions, selectedDeviceUid, autoFollow, playbackActive, centerRequested, map]);

  return null;
}

export default AutoFollowVehicle;