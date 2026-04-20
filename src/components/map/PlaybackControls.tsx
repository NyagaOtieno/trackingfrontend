import { useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useFleetStore } from "@/hooks/useFleetStore";

interface PlaybackControlsProps {
  totalPoints: number;
}

export function PlaybackControls({ totalPoints }: PlaybackControlsProps) {
  const {
    playbackActive,
    playbackIndex,
    setPlaybackActive,
    setPlaybackIndex,
  } = useFleetStore();

  useEffect(() => {
    if (!playbackActive || totalPoints <= 0) return;

    const timer = window.setInterval(() => {
      setPlaybackIndex(playbackIndex + 1 >= totalPoints ? 0 : playbackIndex + 1);
    }, 1200);

    return () => window.clearInterval(timer);
  }, [playbackActive, playbackIndex, totalPoints, setPlaybackIndex]);

  if (totalPoints === 0) return null;

  return (
    <div className="absolute bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={() => setPlaybackIndex(Math.max(0, playbackIndex - 1))}
        className="rounded p-2 hover:bg-muted"
      >
        <SkipBack className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => setPlaybackActive(!playbackActive)}
        className="rounded p-2 hover:bg-muted"
      >
        {playbackActive ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </button>

      <button
        type="button"
        onClick={() =>
          setPlaybackIndex(
            playbackIndex + 1 >= totalPoints ? totalPoints - 1 : playbackIndex + 1
          )
        }
        className="rounded p-2 hover:bg-muted"
      >
        <SkipForward className="h-4 w-4" />
      </button>

      <div className="ml-2 text-xs text-muted-foreground">
        Point {Math.min(playbackIndex + 1, totalPoints)} / {totalPoints}
      </div>
    </div>
  );
}

export default PlaybackControls;