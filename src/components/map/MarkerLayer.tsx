import { memo, useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useFleetStore } from "@/hooks/useFleetStore";
import type { LivePosition } from "@/types/fleet";

// ─── Thresholds ────────────────────────────────────────────────────────────────
// GPS devices batch every ~5 min; use 15 min so a vehicle is "online"
// as long as it reported in the last polling window.
const ONLINE_MS  = 15 * 60_000;  // 15 minutes
const ALERT_MS   =  5 * 3600_000; // 5 hours — no signal at all
const SELECTED_ZOOM = 16;
const MAX_MARKERS   = 15_000;
const ANIM_MS       = 3_800; // smooth slide duration (just under poll interval)

// ─── Icon cache ────────────────────────────────────────────────────────────────
const iconCache = new Map<string, L.DivIcon>();

// ─── Status helpers ────────────────────────────────────────────────────────────
function getStatus(receivedAt?: string | null): "online" | "offline" | "alert" {
  if (!receivedAt) return "alert";
  const ts = new Date(receivedAt).getTime();
  if (!Number.isFinite(ts)) return "alert";
  const age = Date.now() - ts;
  if (age < ONLINE_MS) return "online";
  if (age < ALERT_MS)  return "offline";
  return "alert";
}

function getColors(status: string, speedKph: number) {
  if (status === "alert")   return { fill: "#f59e0b", glow: "#f59e0b" };
  if (status === "offline") return { fill: "#6b7280", glow: "#6b7280" };
  if (speedKph > 0)         return { fill: "#16a34a", glow: "#16a34a" };
  return                           { fill: "#2563eb", glow: "#2563eb" };
}

// ─── Icon builder – shows heading arrow when moving ───────────────────────────
function makeIcon(
  status: string,
  speedKph: number,
  heading: number,
  isSelected: boolean
): L.DivIcon {
  const { fill, glow } = getColors(status, speedKph);
  const isMoving = speedKph > 1;
  const size     = isSelected ? 20 : 14;
  const border   = isSelected ? "3px solid white" : "2px solid white";

  const arrow = isMoving
    ? `<div style="
          position:absolute;
          top:-${size * 0.7}px;
          left:50%;
          transform:translateX(-50%) rotate(${heading}deg);
          width:0;
          height:0;
          border-left:${size * 0.35}px solid transparent;
          border-right:${size * 0.35}px solid transparent;
          border-bottom:${size * 0.7}px solid ${fill};
          filter:drop-shadow(0 0 3px ${glow}88);
        "></div>`
    : "";

  const html = `
    <div style="position:relative;width:${size}px;height:${size}px;">
      ${arrow}
      <div style="
        width:${size}px;
        height:${size}px;
        background:${fill};
        border-radius:50%;
        border:${border};
        box-shadow:0 0 ${isSelected ? 10 : 6}px ${glow}88;
        ${isSelected ? `outline:2px solid ${fill};outline-offset:2px;` : ""}
      "></div>
    </div>`;

  return L.divIcon({
    className: "",
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    html,
  });
}

// ─── Smooth marker animation (Uber-style) ──────────────────────────────────────
function animateTo(
  marker: L.Marker,
  toLatLng: L.LatLngExpression,
  ms: number
) {
  const from   = marker.getLatLng();
  const to     = L.latLng(toLatLng);
  const start  = performance.now();

  // If distance is tiny, skip animation
  if (Math.abs(from.lat - to.lat) < 0.000005 &&
      Math.abs(from.lng - to.lng) < 0.000005) return;

  function step(now: number) {
    const t0 = Math.min((now - start) / ms, 1);
    // ease-in-out cubic
    const t = t0 < 0.5 ? 4 * t0 * t0 * t0 : 1 - Math.pow(-2 * t0 + 2, 3) / 2;
    marker.setLatLng([
      from.lat + (to.lat - from.lat) * t,
      from.lng + (to.lng - from.lng) * t,
    ]);
    if (t0 < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─── Safe vehicle type ────────────────────────────────────────────────────────
interface SafeVehicle {
  uid:         string;
  plateNumber: string;
  lat:         number;
  lon:         number;
  speedKph:    number;
  heading:     number;
  receivedAt:  string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { vehicles: LivePosition[] }

export const MarkerLayer = memo(function MarkerLayer({ vehicles }: Props) {
  const map = useMap();
  const { selectedDeviceUid, setSelectedDevice } = useFleetStore();
  const markersRef  = useRef<Map<string, L.Marker>>(new Map());
  const lastFlyRef  = useRef<string | null>(null);

  // ── Validate + normalise incoming positions ──────────────────────────────
  const safe = useMemo<SafeVehicle[]>(() => {
    if (!Array.isArray(vehicles)) return [];

    return vehicles
      .map((v) => {
        const lat = Number(v.lat);
        const lon = Number(v.lon);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        if (lat < -90  || lat > 90)   return null;
        if (lon < -180 || lon > 180)  return null;
        if (lat === 0  && lon === 0)   return null;

        // Prefer deviceUid (string like "016200001215"), fall back to vehicleId
        const uid = (
          String(v.deviceUid ?? "").trim() ||
          String(v.vehicleId  ?? "").trim()
        );
        if (!uid) return null;

        return {
          uid,
          plateNumber: String(v.plateNumber ?? v.unitName ?? "Unknown"),
          lat,
          lon,
          speedKph: Number(v.speedKph ?? 0),
          heading:  Number(v.heading  ?? 0),
          receivedAt: v.receivedAt ?? null,
        } satisfies SafeVehicle;
      })
      .filter(Boolean)
      .slice(0, MAX_MARKERS) as SafeVehicle[];
    // Stringify to detect deep changes without a heavy dependency array
  }, [JSON.stringify(vehicles)]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Create / update / remove markers ─────────────────────────────────────
  useEffect(() => {
    const active = new Set<string>();

    for (const v of safe) {
      active.add(v.uid);

      const status     = getStatus(v.receivedAt);
      const isSelected = String(selectedDeviceUid) === v.uid;
      const iconKey    = `${status}-${v.speedKph > 1}-${isSelected}-${Math.round(v.heading / 10) * 10}`;

      let icon = iconCache.get(iconKey);
      if (!icon) {
        icon = makeIcon(status, v.speedKph, v.heading, isSelected);
        iconCache.set(iconKey, icon);
      }

      const latlng: [number, number] = [v.lat, v.lon];
      let marker = markersRef.current.get(v.uid);

      if (!marker) {
        // ── New marker ──────────────────────────────────────────────────
        marker = L.marker(latlng, { icon, zIndexOffset: isSelected ? 1000 : 0 })
          .addTo(map)
          .bindTooltip(
            `<div style="font-size:12px;line-height:1.4;">
               <b>${v.plateNumber}</b><br/>
               ${status.toUpperCase()} · ${v.speedKph.toFixed(0)} km/h
             </div>`,
            { direction: "top", offset: [0, -10], className: "leaflet-tooltip" }
          )
          .on("click", () => setSelectedDevice(v.uid));

        markersRef.current.set(v.uid, marker);
      } else {
        // ── Update existing ─────────────────────────────────────────────
        // Smooth-animate moving vehicles; snap stopped ones
        if (v.speedKph > 1) {
          animateTo(marker, latlng, ANIM_MS);
        } else {
          marker.setLatLng(latlng);
        }
        marker.setIcon(icon);
        marker.setZIndexOffset(isSelected ? 1000 : 0);
        // Refresh tooltip
        marker.setTooltipContent(
          `<div style="font-size:12px;line-height:1.4;">
             <b>${v.plateNumber}</b><br/>
             ${status.toUpperCase()} · ${v.speedKph.toFixed(0)} km/h
           </div>`
        );
      }
    }

    // Remove stale markers
    markersRef.current.forEach((marker, uid) => {
      if (!active.has(uid)) {
        map.removeLayer(marker);
        markersRef.current.delete(uid);
      }
    });
  }, [safe, map, selectedDeviceUid, setSelectedDevice]);

  // ── Fly to selected vehicle (Uber-style) ──────────────────────────────────
  useEffect(() => {
    if (!selectedDeviceUid) return;

    const uid = String(selectedDeviceUid).trim();
    if (!uid || lastFlyRef.current === uid) return;

    const vehicle = safe.find((v) => v.uid === uid);
    if (!vehicle) return;

    const lat = vehicle.lat;
    const lon = vehicle.lon;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    // Guard: map must have a non-zero size (hidden on mobile = {x:0, y:0})
    // Calling flyTo on a zero-size map causes Leaflet to compute NaN
    // coordinates internally, crashing the animation frame.
    const size = map.getSize();
    if (!size || size.x === 0 || size.y === 0) return;

    lastFlyRef.current = uid;

    map.flyTo([lat, lon], SELECTED_ZOOM, { duration: 1.2, animate: true });
  }, [selectedDeviceUid, safe, map]);

  // Reset lastFlyRef when selection is cleared so the next selection always flies
  useEffect(() => {
    if (!selectedDeviceUid) lastFlyRef.current = null;
  }, [selectedDeviceUid]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current.clear();
    };
  }, [map]);

  return null;
});