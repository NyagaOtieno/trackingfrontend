import { Crosshair, LocateFixed, Play, Pause, RotateCcw } from "lucide-react";
import { useFleetStore } from "@/hooks/useFleetStore";

interface FleetTopBarProps {
  hasHistory?: boolean;
}

export function FleetTopBar({ hasHistory = false }: FleetTopBarProps) {
  const {
    selectedDeviceUid,
    autoFollow,
    setAutoFollow,
    playbackActive,
    setPlaybackActive,
    historyMode,
    setHistoryMode,
    resetPlayback,
    stepPlaybackBackward,
    stepPlaybackForward,
    setSelectedDevice,
    requestCenter,
    playbackIndex,
    playbackSpeedMs,
    setPlaybackSpeedMs,
  } = useFleetStore();

  return (
    <div className="absolute left-4 right-4 top-4 z-[1000] flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedDevice(null)}
          className="rounded-lg bg-muted px-3 py-2 text-xs font-medium hover:bg-secondary"
        >
          Show All
        </button>

        <button
          type="button"
          onClick={() => setAutoFollow(!autoFollow)}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
            autoFollow
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-secondary"
          }`}
        >
          <LocateFixed className="h-4 w-4" />
          Auto-follow
        </button>

        <button
          type="button"
          onClick={() => requestCenter()}
          disabled={!selectedDeviceUid}
          className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs font-medium hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Crosshair className="h-4 w-4" />
          Center
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setHistoryMode(!historyMode);
            if (historyMode) {
              resetPlayback();
            }
          }}
          className={`rounded-lg px-3 py-2 text-xs font-medium ${
            historyMode
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-secondary"
          }`}
        >
          Trip Playback
        </button>

        {historyMode && hasHistory && (
          <>
            <button
              type="button"
              onClick={() => stepPlaybackBackward()}
              className="rounded-lg bg-muted px-3 py-2 text-xs font-medium hover:bg-secondary"
            >
              Back
            </button>

            <button
              type="button"
              onClick={() => setPlaybackActive(!playbackActive)}
              className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs font-medium hover:bg-secondary"
            >
              {playbackActive ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Play
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => stepPlaybackForward(999999)}
              className="rounded-lg bg-muted px-3 py-2 text-xs font-medium hover:bg-secondary"
            >
              Next
            </button>

            <button
              type="button"
              onClick={() => resetPlayback()}
              className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs font-medium hover:bg-secondary"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>

            <select
              value={String(playbackSpeedMs)}
              onChange={(e) => setPlaybackSpeedMs(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-2 py-2 text-xs"
            >
              <option value="2000">0.5x</option>
              <option value="1200">1x</option>
              <option value="700">2x</option>
              <option value="400">3x</option>
            </select>

            <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              Point {playbackIndex + 1}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default FleetTopBar;