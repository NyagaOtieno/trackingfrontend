import {
  useEffect,
  useMemo,
  useRef,
  type RefObject,
  useState,
} from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { MarkerLayer } from "./MarkerLayer";
import { HistoryPolyline } from "./HistoryPolyline";
import { FitBounds } from "./FitBounds";
import { PlaybackMarker } from "./PlaybackMarker";
import { AutoFollowVehicle } from "./AutoFollowVehicle";
import { GeofenceLayer } from "./GeofenceLayer";
import { GeofenceMonitor } from "./GeofenceMonitor";
import { useFleetStore } from "@/hooks/useFleetStore";
import { MapPinned, RefreshCcw, RadioTower } from "lucide-react";
import {
  getLatestTelemetry,
  type TelemetryNormalized,
} from "@/api/telemetry";

const NAIROBI: [number, number] = [-1.2921, 36.8219];
const ONLINE_THRESHOLD_MS = 10 * 60 * 1000;

// ---------- Resize Fix ----------
function ResizeMapOnContainerChange({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const map = useMap();

  useEffect(() => {
    const run = () => map.invalidateSize();
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() =>
      requestAnimationFrame(run)
    );
    observer.observe(container);

    const timers = [100, 300, 700].map((t) =>
      window.setTimeout(run, t)
    );

    window.addEventListener("resize", run);

    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", run);
    };
  }, [map, containerRef]);

  return null;
}

// ---------- Online check ----------
function isOnline(receivedAt?: string | null) {
  if (!receivedAt) return false;
  const ts = new Date(receivedAt).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < ONLINE_THRESHOLD_MS;
}

// ---------- MAIN ----------
export function MapView() {
  const {
    selectedDeviceUid,
    historyMode,
    playbackActive,
    setLastUpdated,
    setIsConnected,
  } = useFleetStore();

  const containerRef = useRef<HTMLDivElement>(null);

  const [positions, setPositions] = useState<TelemetryNormalized[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔁 Fetch telemetry
  const fetchTelemetry = async () => {
    try {
      const data = await getLatestTelemetry();

      // ✅ Already normalized — just validate
      const safe = data.filter(
        (t) =>
          Number.isFinite(t.lat) &&
          Number.isFinite(t.lon)
      );

      setPositions(safe);
      setLastUpdated(new Date());
      setIsConnected(true);
    } catch (err) {
      console.error("Telemetry error:", err);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, []);

  // ---------- Summary ----------
  const summary = useMemo(() => {
    const online = positions.filter((p) =>
      isOnline(p.receivedAt)
    ).length;

    return {
      total: positions.length,
      online,
      offline: Math.max(0, positions.length - online),
      positions: positions.length,
    };
  }, [positions]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
    >
      <MapContainer
        center={NAIROBI}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <ResizeMapOnContainerChange containerRef={containerRef} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {positions.length > 0 && (
          <MarkerLayer positions={positions} />
        )}

        {positions.length > 0 && (
          <FitBounds
            positions={positions}
            disabled={Boolean(selectedDeviceUid)}
          />
        )}

        <AutoFollowVehicle positions={positions} />
        <GeofenceLayer />
        <GeofenceMonitor positions={positions} />

        {historyMode && positions.length > 0 && (
          <HistoryPolyline points={positions} />
        )}

        {historyMode && playbackActive && positions.length > 0 && (
          <PlaybackMarker points={positions} />
        )}
      </MapContainer>

      {/* ---------- UI ---------- */}
      <div className="pointer-events-none absolute left-4 top-4 z-[500] flex flex-col gap-3">
        <div className="rounded-2xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <MapPinned className="h-4 w-4 text-primary" />
            Live Fleet Summary
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Stat label="Vehicles" value={summary.total} />
            <Stat label="Online" value={summary.online} />
            <Stat label="Offline" value={summary.offline} />
            <Stat label="Positions" value={summary.positions} />
          </div>

          {loading && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <RefreshCcw className="h-3 w-3 animate-spin" />
              Refreshing…
            </div>
          )}
        </div>

        <Legend />
      </div>

      {!loading && positions.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl border bg-card/95 px-6 py-4 text-center shadow">
            <p className="text-sm font-semibold">
              No live positions
            </p>
            <p className="text-xs text-muted-foreground">
              Backend reachable but no telemetry
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Small Components ----------
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function Legend() {
  return (
    <div className="rounded-2xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
        <RadioTower className="h-4 w-4 text-primary" />
        Map Legend
      </div>

      <div className="space-y-1 text-xs">
        <LegendItem color="bg-primary" label="Online" />
        <LegendItem color="bg-destructive" label="Offline" />
        <LegendItem color="bg-amber-500" label="Warning" />
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </div>
  );
}

export default MapView;