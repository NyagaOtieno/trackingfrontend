import {
  X,
  Navigation,
  History,
  MapPin,
  Gauge,
  Compass,
  Clock,
  Play,
  Pause,
  LocateFixed,
  List,
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
    selectedDeviceUid,
    setSelectedDevice,
    historyMode,
    setHistoryMode,
    historyRange,
    setHistoryRange,
    playbackActive,
    setPlaybackActive,
    setPlaybackIndex,
    requestCenter,
    autoFollow,
    setAutoFollow,
    resetPlayback,
  } = useFleetStore();

  const { data: devices = [] } = useFleetDevices();
  const { data: positions = [] } = useLatestPositions();

  const device = devices.find((d) => d.deviceUid === selectedDeviceUid);
  const position = positions.find((p) => p.deviceUid === selectedDeviceUid);

  if (!selectedDeviceUid || !device) return null;

  const isOnline = position
    ? Date.now() - new Date(position.receivedAt).getTime() < 10 * 60 * 1000
    : false;

  const ranges = ["30m", "2h", "24h"];

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
          <h3 className="text-sm font-semibold text-foreground">{device.label}</h3>
          <button
            type="button"
            onClick={() => {
              setSelectedDevice(null);
              setHistoryMode(false);
              setPlaybackActive(false);
              resetPlayback();
            }}
            className="rounded-md p-1 transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                isOnline ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isOnline ? "bg-primary" : "bg-muted-foreground"
                }`}
              />
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Plate
                </span>
              </div>
              <p className="text-sm font-mono font-semibold text-foreground">
                {device.vehicleReg}
              </p>
            </div>

            <div className="rounded-lg bg-muted p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Speed
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {position?.speedKph ?? "—"}{" "}
                <span className="text-xs text-muted-foreground">km/h</span>
              </p>
            </div>

            <div className="rounded-lg bg-muted p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Heading
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {position?.heading ?? "—"}°
              </p>
            </div>

            <div className="rounded-lg bg-muted p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Last Update
                </span>
              </div>
              <p className="text-xs font-medium text-foreground">
                {position?.receivedAt
                  ? formatDistanceToNow(new Date(position.receivedAt), {
                      addSuffix: true,
                    })
                  : "—"}
              </p>
            </div>
          </div>

          <div className="rounded-md bg-muted px-3 py-2 text-[10px] font-mono text-muted-foreground">
            IMEI: {device.deviceUid} &bull; Coords:{" "}
            {lat !== null ? lat.toFixed(4) : "—"},{" "}
            {lon !== null ? lon.toFixed(4) : "—"}
          </div>
        </div>

        <div className="space-y-2 px-4 pb-4">
          <button
            type="button"
            onClick={() => {
              setSelectedDevice(null);
              setHistoryMode(false);
              setPlaybackActive(false);
              resetPlayback();
            }}
            className="flex w-full items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs font-medium text-foreground transition-all hover:bg-secondary"
          >
            <List className="h-4 w-4" />
            Show All
          </button>

          <button
            type="button"
            onClick={() => setAutoFollow(!autoFollow)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
              autoFollow
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-secondary"
            }`}
          >
            <LocateFixed className="h-4 w-4" />
            Auto-follow
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !historyMode;
              setHistoryMode(next);
              if (!next) {
                setPlaybackActive(false);
                resetPlayback();
              }
            }}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
              historyMode
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-secondary"
            }`}
          >
            <History className="h-4 w-4" />
            {historyMode ? "Exit History" : "View History"}
          </button>

          {historyMode && (
            <div className="flex gap-1.5">
              {ranges.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setHistoryRange(r)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-semibold transition-all ${
                    historyRange === r
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => requestCenter()}
            className="flex w-full items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs font-medium text-foreground transition-all hover:bg-secondary"
          >
            <Navigation className="h-4 w-4" />
            Center on Map
          </button>

          <button
            type="button"
            onClick={handlePlayback}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
              playbackActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-secondary"
            }`}
          >
            {playbackActive ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {playbackActive ? "Stop Playback" : "Playback"}
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

export default VehicleDrawer;