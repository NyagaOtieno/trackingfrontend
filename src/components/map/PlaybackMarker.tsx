import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useFleetStore } from "@/hooks/useFleetStore";
import type { HistoryPoint } from "@/types/fleet";

interface PlaybackMarkerProps {
  points: HistoryPoint[];
}

function toNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.trim()) : Number(value);
  return Number.isFinite(n) ? n : null;
}

const playbackIcon = L.divIcon({
  className: "fleet-vehicle-marker-wrapper",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  html: `
    <div class="fleet-vehicle-shell fleet-vehicle-pulse">
      <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#dc2626" opacity="0.28"/>
        <circle cx="12" cy="12" r="6" fill="#dc2626"/>
        <circle cx="12" cy="12" r="3" fill="white"/>
      </svg>
    </div>
  `,
});

export function PlaybackMarker({ points }: PlaybackMarkerProps) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const timerRef = useRef<number | null>(null);

  const {
    playbackActive,
    playbackIndex,
    playbackSpeedMs,
    autoFollow,
    stepPlaybackForward,
    setPlaybackActive,
  } = useFleetStore();

  const currentPoint = useMemo(() => {
    if (!points.length) return null;
    return points[playbackIndex] ?? null;
  }, [points, playbackIndex]);

  useEffect(() => {
    if (!playbackActive || points.length === 0) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      stepPlaybackForward(points.length);
    }, playbackSpeedMs);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playbackActive, playbackSpeedMs, points.length, stepPlaybackForward]);

  useEffect(() => {
    if (!currentPoint) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }

    const lat = toNumber(currentPoint.lat);
    const lon = toNumber(currentPoint.lon);

    if (lat === null || lon === null) return;

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lon], {
        icon: playbackIcon,
        keyboard: false,
      }).addTo(map);
    } else {
      markerRef.current.setLatLng([lat, lon]);
    }

    const speed = currentPoint.speedKph ?? 0;
    const time = currentPoint.receivedAt ?? "-";

    markerRef.current
      .unbindPopup()
      .bindPopup(
        `
          <div style="min-width:190px;">
            <div style="font-size:13px;font-weight:700;margin-bottom:6px;">
              Playback
            </div>
            <div style="font-size:11px;margin-bottom:4px;">
              <strong>Speed:</strong> ${speed} km/h
            </div>
            <div style="font-size:11px;">
              <strong>Time:</strong> ${time}
            </div>
          </div>
        `
      );

    if (autoFollow) {
      map.flyTo([lat, lon], Math.max(map.getZoom(), 17), {
        animate: true,
        duration: 0.6,
      });
    }
  }, [currentPoint, map, autoFollow]);

  useEffect(() => {
    if (!points.length && playbackActive) {
      setPlaybackActive(false);
    }
  }, [points.length, playbackActive, setPlaybackActive]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map]);

  return null;
}

export default PlaybackMarker;