import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useFleetStore } from "@/hooks/useFleetStore";
import type { LivePosition } from "@/types/fleet";

// ─── Thresholds ───────────────────────────────────────────────────────────────
const ONLINE_MS     = 15 * 60_000;
const ALERT_MS      =  5 * 3_600_000;
const SELECTED_ZOOM = 16;
const ANIM_MS       = 3_800;
const VIEW_PAD      = 0.4; // 40% buffer — loads slightly outside screen edges

// ─── Icon cache ───────────────────────────────────────────────────────────────
const iconCache = new Map<string, L.DivIcon>();

function getStatus(receivedAt?: string | null): "online" | "offline" | "alert" {
  if (!receivedAt) return "alert";
  const age = Date.now() - new Date(receivedAt).getTime();
  if (!Number.isFinite(age)) return "alert";
  if (age < ONLINE_MS) return "online";
  if (age < ALERT_MS)  return "offline";
  return "alert";
}

function statusColor(status: string, speedKph: number): string {
  if (status === "alert")   return "#f59e0b";
  if (status === "offline") return "#6b7280";
  if (speedKph > 0)         return "#16a34a";
  return "#2563eb";
}

function makeIcon(
  status: string, speedKph: number, heading: number, isSelected: boolean
): L.DivIcon {
  const fill = statusColor(status, speedKph);
  const move = speedKph > 1;
  const size = isSelected ? 20 : 14;
  const hdg  = Math.round(heading / 10) * 10; // quantise to 10° to limit cache size
  const key  = `${status[0]}${move ? 1 : 0}${isSelected ? 1 : 0}${hdg}`;

  const hit = iconCache.get(key);
  if (hit) return hit;

  const arrow = move
    ? `<div style="position:absolute;top:-${size * 0.7}px;left:50%;` +
      `transform:translateX(-50%) rotate(${hdg}deg);width:0;height:0;` +
      `border-left:${size * 0.35}px solid transparent;` +
      `border-right:${size * 0.35}px solid transparent;` +
      `border-bottom:${size * 0.7}px solid ${fill};` +
      `filter:drop-shadow(0 0 3px ${fill}88)"></div>`
    : "";

  const ring = isSelected ? `outline:2px solid ${fill};outline-offset:2px;` : "";

  const html =
    `<div style="position:relative;width:${size}px;height:${size}px;">` +
    arrow +
    `<div style="width:${size}px;height:${size}px;background:${fill};` +
    `border-radius:50%;border:${isSelected ? 3 : 2}px solid white;` +
    `box-shadow:0 0 ${isSelected ? 10 : 5}px ${fill}88;${ring}"></div></div>`;

  const icon = L.divIcon({
    className:  "",
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    html,
  });
  iconCache.set(key, icon);
  return icon;
}

// ─── Smooth animation (ease-in-out cubic) ────────────────────────────────────
function animateTo(marker: L.Marker, to: [number, number], ms: number) {
  const from = marker.getLatLng();
  if (
    Math.abs(from.lat - to[0]) < 0.000005 &&
    Math.abs(from.lng - to[1]) < 0.000005
  ) return;
  const start = performance.now();
  function step(now: number) {
    const t0 = Math.min((now - start) / ms, 1);
    const t  = t0 < 0.5 ? 4 * t0 * t0 * t0 : 1 - Math.pow(-2 * t0 + 2, 3) / 2;
    marker.setLatLng([
      from.lat + (to[0] - from.lat) * t,
      from.lng + (to[1] - from.lng) * t,
    ]);
    if (t0 < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

interface SafeVehicle {
  uid:         string;
  vehicleId:   number;
  plateNumber: string;
  lat:         number;
  lon:         number;
  speedKph:    number;
  heading:     number;
  receivedAt:  string | null;
}

interface Props { vehicles: LivePosition[] }

export const MarkerLayer = memo(function MarkerLayer({ vehicles }: Props) {
  const map = useMap();
  const { selectedDeviceUid, setSelectedDevice } = useFleetStore();

  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const lastFlyRef = useRef<string | null>(null);

  // ── Viewport version — increments on pan/zoom to trigger re-sync ──────────
  const [viewVersion, setViewVersion] = useState(0);
  useEffect(() => {
    const tick = () => setViewVersion((n) => n + 1);
    map.on("moveend zoomend", tick);
    return () => { map.off("moveend zoomend", tick); };
  }, [map]);

  // ── Normalise positions — no JSON.stringify ───────────────────────────────
  const safe = useMemo<SafeVehicle[]>(() => {
    if (!Array.isArray(vehicles)) return [];
    const out: SafeVehicle[] = [];
    for (const v of vehicles) {
      if ((v as any)._placeholder) continue;
      const lat = Number(v.lat);
      const lon = Number(v.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (lat === 0 && lon === 0) continue;
      if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
      const uid =
        String(v.deviceUid  ?? "").trim() ||
        String(v.vehicleId  ?? "").trim();
      if (!uid) continue;
      out.push({
        uid,
        vehicleId:   Number(v.vehicleId ?? 0),
        plateNumber: String(v.plateNumber ?? v.unitName ?? uid),
        lat, lon,
        speedKph: Number(v.speedKph ?? 0),
        heading:  Number(v.heading  ?? 0),
        receivedAt: v.receivedAt ?? null,
      });
    }
    return out;
  }, [vehicles]);

  // Keep latest safe list in a ref so viewport-change effect can read it
  const safeRef = useRef(safe);
  useEffect(() => { safeRef.current = safe; }, [safe]);

  // ── Resolve selected uid (GPS serial) from selectedDeviceUid (vehicleId) ──
  // selectedDeviceUid is stored as String(vehicleId) e.g. "42"
  // but marker keys are GPS serials e.g. "13045099819"
  // → scan both fields so the lookup always succeeds
  const selectedUid = useMemo<string | null>(() => {
    if (!selectedDeviceUid) return null;
    const sel = String(selectedDeviceUid);
    const match = safe.find(
      (v) => v.uid === sel || String(v.vehicleId) === sel
    );
    return match?.uid ?? null;
  }, [selectedDeviceUid, safe]);

  // ── MAIN SYNC ─────────────────────────────────────────────────────────────
  //
  // STRATEGY — prevents the "all markers vanish on pan" problem:
  //
  //  • CREATION  : only when vehicle enters viewport (or is selected)
  //  • POSITION  : always updated cheaply for every marker already created
  //  • ICON/TIP  : expensive — only for markers currently in viewport
  //  • REMOVAL   : ONLY when vehicle disappears from API data, NEVER because
  //                it scrolled off screen — this is the key difference
  //
  // Result: panning adds new markers at edges, never flashes existing ones.
  // Memory stays bounded by dataset size (~5 000).
  //
  useEffect(() => {
    const current  = safeRef.current;
    const bounds   = map.getBounds().pad(VIEW_PAD);
    const inData   = new Set<string>();

    for (const v of current) {
      inData.add(v.uid);

      const isSelected = v.uid === selectedUid;
      const inView     = isSelected || bounds.contains([v.lat, v.lon]);
      const latlng: [number, number] = [v.lat, v.lon];

      let marker = markersRef.current.get(v.uid);

      if (!marker) {
        // ── Create — only when entering viewport or selected ──────────────
        if (!inView) continue; // not visible yet — skip, will be created on next pan

        const status = getStatus(v.receivedAt);
        const icon   = makeIcon(status, v.speedKph, v.heading, isSelected);

        marker = L.marker(latlng, { icon, zIndexOffset: isSelected ? 1000 : 0 })
          .addTo(map)
          .bindTooltip(
            buildTip(v.plateNumber, status, v.speedKph),
            { direction: "top", offset: [0, -10] }
          )
          .on("click", () => setSelectedDevice(v.uid));

        markersRef.current.set(v.uid, marker);

      } else {
        // ── Update position (always — cheap, keeps coords current) ────────
        if (v.speedKph > 1) animateTo(marker, latlng, ANIM_MS);
        else                 marker.setLatLng(latlng);

        // ── Update icon & tooltip ONLY when in viewport (expensive ops) ───
        if (inView) {
          const status = getStatus(v.receivedAt);
          const icon   = makeIcon(status, v.speedKph, v.heading, isSelected);
          marker.setIcon(icon);
          marker.setZIndexOffset(isSelected ? 1000 : 0);
          marker.setTooltipContent(buildTip(v.plateNumber, status, v.speedKph));
        }
      }
    }

    // ── Remove ONLY vehicles no longer returned by the API ─────────────────
    // Never remove because of viewport — that causes the flash.
    markersRef.current.forEach((marker, uid) => {
      if (!inData.has(uid)) {
        map.removeLayer(marker);
        markersRef.current.delete(uid);
      }
    });

  }, [safe, viewVersion, selectedUid, map, setSelectedDevice]);

  // ── Fly to selected vehicle ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedUid) { lastFlyRef.current = null; return; }
    if (lastFlyRef.current === selectedUid) return;

    const v    = safe.find((v) => v.uid === selectedUid);
    if (!v) return;

    const size = map.getSize();
    if (!size?.x || !size?.y) return;

    lastFlyRef.current = selectedUid;
    map.flyTo([v.lat, v.lon], SELECTED_ZOOM, { duration: 1.2, animate: true });
  }, [selectedUid, safe, map]);

  useEffect(() => {
    if (!selectedDeviceUid) lastFlyRef.current = null;
  }, [selectedDeviceUid]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => {
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current.clear();
  }, [map]);

  return null;
});

// ─── Tooltip helper ───────────────────────────────────────────────────────────
function buildTip(plate: string, status: string, speed: number): string {
  return (
    `<div style="font-size:12px;line-height:1.5">` +
    `<b>${plate}</b><br>${status.toUpperCase()} · ${speed.toFixed(0)} km/h` +
    `</div>`
  );
}
