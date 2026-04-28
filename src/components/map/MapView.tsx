import { useMemo, useRef, type RefObject, useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { MarkerLayer }        from "./MarkerLayer";
import { HistoryPolyline }    from "./HistoryPolyline";
import { FitBounds }          from "./FitBounds";
import { PlaybackMarker }     from "./PlaybackMarker";
import { AutoFollowVehicle }  from "./AutoFollowVehicle";
import { GeofenceLayer }      from "./GeofenceLayer";
import { GeofenceMonitor }    from "./GeofenceMonitor";
import { useFleetStore }      from "@/hooks/useFleetStore";
import { useLatestPositions } from "@/hooks/useLatestPositions";
import { useFleetDevices }    from "@/hooks/useFleetDevices";
import { useAuthStore }       from "@/hooks/useAuthStore";
import { useHistory }         from "@/hooks/useHistory";
import { MapPinned, RefreshCcw, RadioTower } from "lucide-react";
import type { LivePosition }  from "@/types/fleet";

// Kenya centre — default view
const KENYA: [number, number] = [-0.0236, 37.9062];
const OFFLINE_MS = 3 * 60_000;
const PRIVILEGED = ["admin", "super_admin", "staff", "office_admin", "SUPER_ADMIN"];

function ResizeMap({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) {
  const map = useMap();
  useEffect(() => {
    const run = () => map.invalidateSize();
    const el  = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => requestAnimationFrame(run));
    obs.observe(el);
    const ts = [100, 300, 700].map(t => window.setTimeout(run, t));
    window.addEventListener("resize", run);
    return () => { obs.disconnect(); ts.forEach(clearTimeout); window.removeEventListener("resize", run); };
  }, [map, containerRef]);
  return null;
}

export function MapView() {
  const { selectedDeviceUid, historyMode, historyRange, playbackActive } = useFleetStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const user    = useAuthStore(s => s.user);

  const { data: rawPositions = [], isFetching } = useLatestPositions();
  const { data: devices = [] }                   = useFleetDevices();

  // Role filter for map markers
  const allowedIds = useMemo(() => {
    const role = user?.role ?? "";
    if (PRIVILEGED.includes(role)) return null;
    if (role === "client" && user?.id) {
      return new Set(
        devices.filter(d => d.account_id != null && d.account_id === user.id)
               .map(d => d.id).filter(Boolean) as number[]
      );
    }
    return null;
  }, [user, devices]);

  const positions: LivePosition[] = useMemo(() => {
    if (!allowedIds) return rawPositions;
    return rawPositions.filter(p => p.vehicleId != null && allowedIds.has(p.vehicleId));
  }, [rawPositions, allowedIds]);

  // History for selected vehicle — map historyRange to hours
  const hoursMap: Record<string, number> = { "30m": 0.5, "2h": 2, "24h": 24 };
  const historyHours = hoursMap[historyRange] ?? 2;
  const fromDate = new Date(Date.now() - historyHours * 3600_000).toISOString();

  const { data: historyPoints = [] } = useHistory(
    historyMode && selectedDeviceUid ? selectedDeviceUid : null,
    { from: fromDate, limit: 500 }
  );

  const summary = useMemo(() => {
    let online = 0;
    for (const p of positions) {
      const age = p.receivedAt ? Date.now() - new Date(p.receivedAt).getTime() : Infinity;
      if (age < OFFLINE_MS) online++;
    }
    return { total: positions.length, online, offline: Math.max(0, positions.length - online) };
  }, [positions]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <MapContainer center={KENYA} zoom={6} style={{ height: "100%", width: "100%" }}>
        <ResizeMap containerRef={containerRef} />
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Only fit bounds once — when positions first arrive */}
        {positions.length > 0 && (
          <FitBounds positions={positions} disabled={Boolean(selectedDeviceUid)} />
        )}

        {positions.length > 0 && <MarkerLayer vehicles={positions} />}

        <AutoFollowVehicle positions={positions as any} />
        <GeofenceLayer />
        <GeofenceMonitor positions={positions as any} />

        {/* History polyline — only when vehicle selected + history mode on */}
        {historyMode && historyPoints.length > 0 && (
          <HistoryPolyline points={historyPoints} />
        )}
        {historyMode && playbackActive && historyPoints.length > 0 && (
          <PlaybackMarker points={historyPoints} />
        )}
      </MapContainer>

      {/* Overlay */}
      <div className="pointer-events-none absolute left-4 top-4 z-[500] flex flex-col gap-3">
        <div className="rounded-2xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <MapPinned className="h-4 w-4 text-primary" />
            Live Fleet
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div><span className="text-muted-foreground">Total</span><div className="font-semibold">{summary.total}</div></div>
            <div><span className="text-muted-foreground">Online</span><div className="font-semibold text-primary">{summary.online}</div></div>
            <div><span className="text-muted-foreground">Offline</span><div className="font-semibold text-muted-foreground">{summary.offline}</div></div>
          </div>
          {isFetching && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <RefreshCcw className="h-3 w-3 animate-spin" /> Refreshing…
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <RadioTower className="h-4 w-4 text-primary" />
            Legend
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary"/>Online &lt;3 min</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-gray-400"/>Offline</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500"/>No signal 5h+</div>
          </div>
        </div>
      </div>

      {positions.length === 0 && !isFetching && (
        <div className="absolute inset-0 flex items-center justify-center">
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