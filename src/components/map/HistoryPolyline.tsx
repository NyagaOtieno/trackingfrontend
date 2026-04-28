import { memo } from "react";
import { Polyline, CircleMarker, Tooltip } from "react-leaflet";
import type { HistoryPoint } from "@/types/fleet";

interface Props { points: HistoryPoint[]; }

function getLat(p: HistoryPoint): number | null {
  const v = Number(p.lat ?? p.latitude);
  return Number.isFinite(v) ? v : null;
}
function getLon(p: HistoryPoint): number | null {
  const v = Number(p.lon ?? p.longitude);
  return Number.isFinite(v) ? v : null;
}

export const HistoryPolyline = memo(function HistoryPolyline({ points }: Props) {
  if (!points || points.length === 0) return null;

  // Filter valid, non-zero coords
  const valid = points.filter(p => {
    const lat = getLat(p), lon = getLon(p);
    if (lat === null || lon === null) return false;
    if (lat === 0 && lon === 0)       return false;
    if (lat < -90 || lat > 90)        return false;
    if (lon < -180 || lon > 180)      return false;
    return true;
  });

  if (valid.length === 0) return null;

  const latLngs = valid.map(p => [getLat(p)!, getLon(p)!] as [number, number]);

  // Downsample dots — show every 5th point + last
  const dots = valid.filter((_, i) => i % 5 === 0 || i === valid.length - 1);

  return (
    <>
      <Polyline
        positions={latLngs}
        pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.85 }}
        smoothFactor={2}
      />
      {dots.map((p, i) => {
        const lat = getLat(p)!;
        const lon = getLon(p)!;
        const ts  = p.receivedAt ?? p.received_at ?? null;
        const spd = Number(p.speedKph ?? p.speed_kph ?? p.speed ?? 0);
        return (
          <CircleMarker
            key={`${lat}-${lon}-${i}`}
            center={[lat, lon]}
            radius={i === dots.length - 1 ? 7 : 4}
            pathOptions={{
              fillColor: i === dots.length - 1 ? "#16a34a" : "#2563eb",
              fillOpacity: 0.9,
              color: "#fff",
              weight: 1.5,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <div className="text-xs">
                <p className="font-semibold">{spd.toFixed(0)} km/h</p>
                {ts && <p className="opacity-70">{new Date(ts).toLocaleTimeString()}</p>}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
});
export default HistoryPolyline;