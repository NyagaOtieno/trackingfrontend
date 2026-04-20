import { memo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Gauge, Radio, AlertTriangle, Clock3 } from "lucide-react";
import type { VehicleState } from "@/types/fleet";
import { useFleetStore } from "@/hooks/useFleetStore";

interface FleetCardProps {
  vehicle: VehicleState;
}

function toSpeed(value: unknown) {
  const num = typeof value === "string" ? Number(value) : Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export const FleetCard = memo(function FleetCard({ vehicle }: FleetCardProps) {
  const selectedDeviceUid = useFleetStore((state) => state.selectedDeviceUid);
  const setSelectedDevice = useFleetStore((state) => state.setSelectedDevice);
  const setHistoryMode = useFleetStore((state) => state.setHistoryMode);
  const setPlaybackActive = useFleetStore((state) => state.setPlaybackActive);
  const resetPlayback = useFleetStore((state) => state.resetPlayback);

  const isSelected = selectedDeviceUid === vehicle.deviceUid;
  const speed = toSpeed(vehicle.position?.speedKph);
  const isMoving = speed > 0;

  const handleClick = () => {
    setSelectedDevice(vehicle.deviceUid);
    setHistoryMode(false);
    setPlaybackActive(false);
    resetPlayback();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative w-full overflow-hidden rounded-xl border px-3 py-3 text-left transition-all ${
        isSelected
          ? "border-primary/40 bg-accent shadow-glow"
          : "border-border bg-card hover:border-primary/20 hover:bg-secondary/30"
      }`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-1 ${
          vehicle.isOnline ? "bg-primary" : "bg-destructive"
        }`}
      />

      <div className="pl-1">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold uppercase tracking-wide text-foreground">
              {vehicle.vehicleReg || vehicle.label || "Unknown Vehicle"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {vehicle.label || "Unnamed device"}
            </p>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              vehicle.isOnline
                ? "bg-primary/15 text-primary"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                vehicle.isOnline ? "bg-primary" : "bg-destructive"
              }`}
            />
            {vehicle.isOnline ? "Online" : "Offline"}
          </span>
        </div>

        <div className="mb-2 flex flex-wrap gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              isMoving
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isMoving ? "Moving" : "Stopped"}
          </span>

          {vehicle.isExpiredResolved && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
              Expired
            </span>
          )}

          {(vehicle.alertCount ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {vehicle.alertCount} alerts
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{speed}</span>
            <span>km/h</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5" />
            <span className="truncate font-mono">
              {String(vehicle.deviceUid ?? "").replace("IMEI_", "")}
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock3 className="h-3 w-3" />
          <span>
            {vehicle.lastSeen
              ? `Last seen ${formatDistanceToNow(new Date(vehicle.lastSeen), {
                  addSuffix: true,
                })}`
              : "No recent position"}
          </span>
        </div>
      </div>
    </button>
  );
});

export default FleetCard;