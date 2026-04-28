import {
  X, Navigation, History, MapPin, Gauge,
  Compass, Clock, Play, Pause, LocateFixed, List,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useFleetStore } from "@/hooks/useFleetStore";
import { useFleetDevices } from "@/hooks/useFleetDevices";
import { useLatestPositions } from "@/hooks/useLatestPositions";
import { motion, AnimatePresence } from "framer-motion";

function toNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.trim()) : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function VehicleDrawer() {
  const {
    selectedDeviceUid, setSelectedDevice,
    historyMode, setHistoryMode,
    historyRange, setHistoryRange,
    playbackActive, setPlaybackActive,
    setPlaybackIndex, requestCenter,
    autoFollow, setAutoFollow, resetPlayback,
  } = useFleetStore();

  const { data: devices = [] }   = useFleetDevices();
  const { data: positions = [] } = useLatestPositions();

  // ← KEY FIX: match by String(id) and String(vehicleId)
  const device   = devices.find((d) => String(d.id) === selectedDeviceUid);
  const position = positions.find((p) =>
    p.vehicleId ? String(p.vehicleId) === selectedDeviceUid : false
  ) ?? positions.find((p) =>
    device?.plate_number && p.plateNumber?.toUpperCase() === device.plate_number?.toUpperCase()
  );

  if (!selectedDeviceUid || !device) return null;

  const tsRaw   = position?.receivedAt ?? null;
  const isOnline = tsRaw ? Date.now() - new Date(tsRaw).getTime() < 3 * 60_000 : false;
  const ranges  = ["30m", "2h", "24h"];

  const handlePlayback = () => {
    if (playbackActive) {
      setPlaybackActive(false);
    } else {
      if (!historyMode) setHistoryMode(true);
      setPlaybackIndex(0);
      setPlaybackActive(true);
    }
  };

  const lat = toNumber(position?.lat);
  const lon = toNumber(position?.lon);

  return (
    <AnimatePresence>
      <motion.aside
        key="drawer"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-l border-border bg-card"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            {device.vehicleReg || device.label}
          </h3>
          <button
            type="button"
            onClick={() => { setSelectedDevice(null); setHistoryMode(false); setPlaybackActive(false); resetPlayback(); }}
            className="rounded-md p-1 transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isOnline ? "text-primary" : "text-muted-foreground"}`}>
              <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-primary" : "bg-muted-foreground"}`} />
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Plate</span>
              </div>
              <p className="text-sm font-mono font-semibold">{device.vehicleReg ?? "—"}</p>
            </div>

            <div className="rounded-lg bg-muted p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Speed</span>
              </div>
              <p className="text-sm font-semibold">
                {position ? Number(position.speedKph ?? 0).toFixed(0) : "—"}{" "}
                <span className="text-xs text-muted-foreground">km/h</span>
              </p>
            </div>

            <div className="rounded-lg bg-muted p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Heading</span>
              </div>
              <p className="text-sm font-semibold">{position ? Number(position.heading ?? 0).toFixed(0) : "—"}°</p>
            </div>

            <div className="rounded-lg bg-muted p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Last Update</span>
              </div>
              <p className="text-xs font-medium">
                {tsRaw ? formatDistanceToNow(new Date(tsRaw), { addSuffix: true }) : "—"}
              </p>
            </div>
          </div>

          <div className="rounded-md bg-muted px-3 py-2 text-[10px] font-mono text-muted-foreground">
            Serial: {device.serial ?? "—"} &bull; {lat !== null ? lat.toFixed(4) : "—"}, {lon !== null ? lon.toFixed(4) : "—"}
          </div>
        </div>

        <div className="space-y-2 px-4 pb-4">
          <button type="button" onClick={() => { setSelectedDevice(null); setHistoryMode(false); setPlaybackActive(false); resetPlayback(); }}
            className="flex w-full items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs font-medium hover:bg-secondary">
            <List className="h-4 w-4" /> Show All
          </button>
          <button type="button" onClick={() => setAutoFollow(!autoFollow)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${autoFollow ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-secondary"}`}>
            <LocateFixed className="h-4 w-4" /> Auto-follow
          </button>
          <button type="button" onClick={() => { const n = !historyMode; setHistoryMode(n); if (!n) { setPlaybackActive(false); resetPlayback(); } }}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${historyMode ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-secondary"}`}>
            <History className="h-4 w-4" /> {historyMode ? "Exit History" : "View History"}
          </button>
          {historyMode && (
            <div className="flex gap-1.5">
              {ranges.map((r) => (
                <button key={r} type="button" onClick={() => setHistoryRange(r)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-semibold ${historyRange === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
                  {r}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => requestCenter()}
            className="flex w-full items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs font-medium hover:bg-secondary">
            <Navigation className="h-4 w-4" /> Center on Map
          </button>
          <button type="button" onClick={handlePlayback}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${playbackActive ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-secondary"}`}>
            {playbackActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playbackActive ? "Stop Playback" : "Playback"}
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

export default VehicleDrawer;