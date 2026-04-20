import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";

type PositionLike = {
  lat?: number | string;
  lon?: number | string;
};

interface FitBoundsProps {
  positions?: PositionLike[];
  disabled?: boolean;
}

function toNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.trim()) : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function FitBounds({
  positions = [],
  disabled = false,
}: FitBoundsProps) {
  const map = useMap();

  useEffect(() => {
    if (disabled) return;

    const points = positions
      .map((p) => {
        const lat = toNumber(p.lat);
        const lon = toNumber(p.lon);
        if (lat === null || lon === null) return null;
        return [lat, lon] as [number, number];
      })
      .filter((p): p is [number, number] => p !== null);

    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }

    map.fitBounds(latLngBounds(points), { padding: [40, 40] });
  }, [map, positions, disabled]);

  return null;
}

export default FitBounds;