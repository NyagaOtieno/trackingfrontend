import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";
import type { LivePosition } from "@/types/fleet";

interface Props {
  positions: LivePosition[];
  disabled?: boolean;
}

export function FitBounds({ positions, disabled = false }: Props) {
  const map = useMap();
  const hasFit = useRef(false);   // ← only fit ONCE

  useEffect(() => {
    if (disabled || hasFit.current || positions.length === 0) return;

    const points = positions
      .map(p => {
        const lat = Number(p.lat);
        const lon = Number(p.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
        if (lat === 0 && lon === 0) return null;
        return [lat, lon] as [number, number];
      })
      .filter((p): p is [number, number] => p !== null);

    if (points.length === 0) return;

    hasFit.current = true;   // ← never run again

    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, positions, disabled]);

  return null;
}
export default FitBounds;