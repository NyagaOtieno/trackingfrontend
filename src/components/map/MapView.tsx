import {
  useMemo,
  useRef,
  type RefObject,
  useEffect,
} from "react";

import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { MarkerLayer }        from "./MarkerLayer";
import { HistoryPolyline }    from "./HistoryPolyline";
import { FitBounds }          from "./FitBounds";
import { PlaybackMarker }     from "./PlaybackMarker";
import { AutoFollowVehicle }  from "./AutoFollowVehicle";
import { GeofenceLayer }      from "./GeofenceLayer";
import { GeofenceMonitor }    from "./GeofenceMonitor";

import { useFleetStore }       from "@/hooks/useFleetStore";
import { useLatestPositions }  from "@/hooks/useLatestPositions";
import { useFleetDevices }     from "@/hooks/useFleetDevices";
import { useAuthStore }        from "@/hooks/useAuthStore";
import { useHistory }          from "@/hooks/useHistory";

import { MapPinned, RefreshCcw, RadioTower } from "lucide-react";
import type { LivePosition } from "@/types/fleet";

// ─── Constants ────────────────────────────────────────────────────────────────
// Kenya geographic center
const KENYA: [number, number] = [-0.0236, 37.9062];

// Must match MarkerLayer.tsx — 15 min accounts for ~5-min GPS batch cycles
const ONLINE_MS = 15 * 60_000;

const PRIVILEGED = [
  "admin", "super_admin", "staff", "office_admin", "SUPER_ADMIN",
];

// ─── Map resize helper ────────────────────────────────────────────────────────
function ResizeMap({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) {
  const map = useMap();

  useEffect(() => {
    const resize = () => requestAnimationFrame(() => map.invalidateSize());
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(resize);
    observer.observe(el);
    const timers = [100, 300, 700].map((t) => window.setTimeout(resize, t));
    window.addEventListener("resize", resize);

    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", resize);
    };
  }, [map, containerRef]);

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { selectedDeviceUid, historyMode, historyRange, playbackActive } =
    useFleetStore();

  const user = useAuthStore((s) => s.user);

  const { data: rawPositions = [], isFetching } = useLatestPositions();
  const { data: devices = [] }                  = useFleetDevices();

  // ── Role-based position filtering ─────────────────────────────────────────
  const allowedIds = useMemo(() => {
    const role = user?.role ?? "";
    if (PRIVILEGED.includes(role)) return null;

    if (role === "client" && user?.id) {
      return new Set(
        devices
          .filter((d) => d.account_id != null && d.account_id === user.id)
          .map((d) => d.id)
          .filter(Boolean) as number[]
      );
    }
    return null;
  }, [user, devices]);

  const positions: LivePosition[] = useMemo(() => {
    if (!allowedIds) return rawPositions;
    return rawPositions.filter(
      (p) => p.vehicleId != null && allowedIds.has(p.vehicleId)
    );
  }, [rawPositions, allowedIds]);

  // ── History ────────────────────────────────────────────────────────────────
  const hoursMap: Record<string, number> = { "30m": 0.5, "2h": 2, "24h": 24 };
  const historyHours = hoursMap[historyRange] ?? 2;
  const fromDate = new Date(Date.now() - historyHours * 3_600_000).toISOString();

  const { data: historyPoints = [] } = useHistory(
    historyMode && selectedDeviceUid ? selectedDeviceUid : null,
    { from: fromDate, limit: 500 }
  );

  // ── Fleet summary ──────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    let online = 0;
    for (const p of positions) {
      if (!p.receivedAt) continue;
      const age = Date.now() - new Date(p.receivedAt).getTime();
      if (Number.isFinite(age) && age < ONLINE_MS) online++;
    }
    return {
      total:   positions.length,
      online,
      offline: Math.max(0, positions.length - online),
    };
  }, [positions]);

  return (
    <div
      ref={containerRef}
      className="relative h-[100dvh] w-full overflow-hidden bg-background"
    >
      <MapContainer
        center={KENYA}
        zoom={6}
        zoomControl={true}
        attributionControl={false}
        preferCanvas={true}
        className="h-full w-full z-0"
      >
        <ResizeMap containerRef={containerRef} />

        {/* OpenStreetMap tiles */}
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Auto-fit to all positions once on load */}
        {positions.length > 0 && !selectedDeviceUid && (
          <FitBounds positions={positions} disabled={false} />
        )}

        {/* Vehicle markers */}
        {positions.length > 0 && (
          <MarkerLayer vehicles={positions} />
        )}

        {/* Auto-follow selected vehicle */}
        <AutoFollowVehicle positions={positions as any} />

        {/* Geofences */}
        <GeofenceLayer />
        <GeofenceMonitor positions={positions as any} />

        {/* History polyline */}
        {historyMode && historyPoints.length > 0 && (
          <HistoryPolyline points={historyPoints} />
        )}

        {/* Playback marker */}
        {historyMode && playbackActive && historyPoints.length > 0 && (
          <PlaybackMarker points={historyPoints} />
        )}
      </MapContainer>

      {/* ── Top-left overlay ── */}
      <div className="pointer-events-none absolute left-4 top-4 z-[900] flex flex-col gap-3">

        {/* Fleet summary card */}
        <div className="rounded-2xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <MapPinned className="h-4 w-4 text-primary" />
            Live Fleet
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Total</span>
              <div className="font-semibold">{summary.total}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Online</span>
              <div className="font-semibold text-primary">{summary.online}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Offline</span>
              <div className="font-semibold text-muted-foreground">{summary.offline}</div>
            </div>
          </div>
          {isFetching && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <RefreshCcw className="h-3 w-3 animate-spin" />
              Refreshing…
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="rounded-2xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <RadioTower className="h-4 w-4 text-primary" />
            Legend
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
              Moving
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              Online · stopped
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
              Offline &gt;15 min
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              No signal 5 h+
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {positions.length === 0 && !isFetching && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center">
          <div className="rounded-2xl border bg-card/95 px-6 py-4 text-center shadow">
            <p className="text-sm font-semibold">No live positions</p>
            <p className="text-xs text-muted-foreground">Waiting for telemetry data…</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapView;