import { memo } from 'react';
import { useMap } from 'react-leaflet';
import { Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import type { HistoryPoint } from '@/types/fleet';
import { format } from 'date-fns';

interface HistoryPolylineProps {
  points: HistoryPoint[];
}

export const HistoryPolyline = memo(function HistoryPolyline({ points }: HistoryPolylineProps) {
  if (points.length === 0) return null;

  const latLngs = points.map((p) => [p.lat, p.lon] as [number, number]);

  return (
    <>
      <Polyline
        positions={latLngs}
        pathOptions={{
          color: '#dc2626',
          weight: 3,
          opacity: 0.7,
          dashArray: '8 4',
        }}
      />
      {points.filter((_, i) => i % 10 === 0 || i === points.length - 1).map((p, i) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lon]}
          radius={i === points.length - 1 ? 6 : 3}
          pathOptions={{
            fillColor: '#dc2626',
            fillOpacity: 0.8,
            color: '#7f1d1d',
            weight: 1,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <div className="text-xs">
              <p className="font-semibold">{p.speedKph} km/h</p>
              <p className="opacity-70">{format(new Date(p.receivedAt), 'HH:mm:ss')}</p>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
});
