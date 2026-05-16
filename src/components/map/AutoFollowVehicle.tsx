import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { useFleetStore }       from "@/hooks/useFleetStore";
import { useVehiclePosition }  from "@/hooks/useVehiclePosition";

function toNumber(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function validCoords(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lon) &&
    Math.abs(lat) <= 90  && Math.abs(lon) <= 180 &&
    !(lat === 0 && lon === 0)
  );
}

/**
 * Tries all three ID keys so selection works regardless of which identifier
 * was stored in the fleet store (vehicleId string, GPS serial, or raw id).
 */
function matchesSelected(p: any, id: string): boolean {
  return (
    String(p.deviceUid) === id ||
    String(p.vehicleId) === id ||
    String(p.id)        === id
  );
}

interface Props {
  positions: any[]; // batch positions from useLatestPositions
}

export function AutoFollowVehicle({ positions }: Props) {
  const map = useMap();
  const { selectedDeviceUid, autoFollow, playbackActive, centerRequested } = useFleetStore();

  // ── On-demand fetch for the selected vehicle ─────────────────────────────
  // Runs every 5 seconds while a vehicle is selected so the map follows it
  // live. Covers vehicles that are NOT in the batch (beyond top 15 000).
  const vehiclePos = useVehiclePosition(selectedDeviceUid);

  const lastPinnedId = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedDeviceUid) return;
    if (playbackActive)     return;

    // ── Find position ──────────────────────────────────────────────────────
    // Priority 1: dedicated per-vehicle fetch (always up to date, no batch limit)
    // Priority 2: batch positions (faster, already in memory)
    const pos: any =
      vehiclePos ||
      positions.find((p) => matchesSelected(p, String(selectedDeviceUid)));

    if (!pos || pos._placeholder) return;

    const lat = toNumber(pos.lat ?? pos.latitude);
    const lon = toNumber(pos.lon ?? pos.lng ?? pos.longitude);

    if (lat === null || lon === null) return;
    if (!validCoords(lat, lon))      return;

    // Don't re-fly to same vehicle unless autoFollow is on or user re-clicked
    if (!autoFollow && lastPinnedId.current === selectedDeviceUid) return;

    try {
      map.flyTo([lat, lon], 17, { animate: true, duration: 0.6 });
      lastPinnedId.current = selectedDeviceUid;
    } catch (e) {
      console.warn("flyTo blocked:", e);
    }

  // centerRequested increments each time setSelectedDevice() is called,
  // so re-clicking the same card re-triggers the zoom.
  }, [vehiclePos, positions, selectedDeviceUid, autoFollow, playbackActive, map, centerRequested]);

  return null;
}
