import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  Wifi,
  WifiOff,
  Clock,
  LogOut,
  Truck,
  AlertTriangle,
  CheckCircle2,
  CircleOff,
  MapPinned,
} from "lucide-react";

import { useFleetStore } from "@/hooks/useFleetStore";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useFleetDevices } from "@/hooks/useFleetDevices";
import { useLatestPositions } from "@/hooks/useLatestPositions";
import { useAlerts } from "@/hooks/useAlerts";

const ONLINE_THRESHOLD_MS = 10 * 60 * 1000;

function isOnline(receivedAt?: string | null) {
  if (!receivedAt) return false;
  const time = new Date(receivedAt).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time < ONLINE_THRESHOLD_MS;
}

function getUserDisplayName(user: any) {
  return user?.fullName || user?.full_name || user?.name || user?.email || "User";
}

export function TopBar() {
  const { lastUpdated, isConnected, selectedDeviceUid } = useFleetStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: devices = [] } = useFleetDevices();
  const { data: positions = [] } = useLatestPositions();
  const { data: alerts = [] } = useAlerts();

  const stats = useMemo(() => {
    const latestMap = new Map(positions.map((p) => [p.deviceUid, p]));
    const online = devices.filter((d) =>
      isOnline(latestMap.get(d.deviceUid)?.receivedAt ?? null)
    ).length;

    return {
      total: devices.length,
      online,
      offline: Math.max(0, devices.length - online),
      alerts: alerts.length,
      selected: selectedDeviceUid ? 1 : 0,
    };
  }, [devices, positions, alerts, selectedDeviceUid]);

  return (
    <header className="shrink-0 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
                Jendie 
              </h1>
            
            </div>
            <p className="text-xs text-muted-foreground">
              Fleet monitor
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <div className="rounded-xl border border-border bg-background px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Vehicles</span>
              <span className="font-semibold text-foreground">{stats.total}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">Online</span>
              <span className="font-semibold text-foreground">{stats.online}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              <CircleOff className="h-3.5 w-3.5 text-destructive" />
              <span className="text-muted-foreground">Offline</span>
              <span className="font-semibold text-foreground">{stats.offline}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-muted-foreground">Alerts</span>
              <span className="font-semibold text-foreground">{stats.alerts}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              <MapPinned className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Selected</span>
              <span className="font-semibold text-foreground">
                {selectedDeviceUid ? "1" : "0"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </span>
            </div>
          )}

          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              isConnected
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {isConnected ? (
              <>
                <Wifi className="h-3.5 w-3.5" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                Reconnecting…
              </>
            )}
          </div>

          {user && (
            <div className="ml-1 flex items-center gap-2 border-l border-border pl-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-medium text-foreground">
                  {getUserDisplayName(user)}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {user.role}
                </p>
              </div>

              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="rounded-lg p-2 transition-colors hover:bg-muted"
                title="Sign out"
                type="button"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}