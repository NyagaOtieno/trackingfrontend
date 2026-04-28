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

/**
 * =========================
 * SAFE HELPERS
 * =========================
 */
function safeArray<T>(input: any): T[] {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.data)) return input.data;
  return [];
}

function isOnline(receivedAt?: string | null) {
  if (!receivedAt) return false;

  const time = new Date(receivedAt).getTime();
  if (Number.isNaN(time)) return false;

  return Date.now() - time < 10 * 60 * 1000;
}

function getUserDisplayName(user: any) {
  return user?.fullName || user?.full_name || user?.name || user?.email || "User";
}

/**
 * =========================
 * MAIN COMPONENT
 * =========================
 */
export function TopBar() {
  const { lastUpdated, isConnected, selectedDeviceUid } = useFleetStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  /**
   * =========================
   * ALWAYS CALL HOOKS TOP LEVEL
   * (FIXES YOUR CRASH)
   * =========================
   */
  const devicesQuery = useFleetDevices();
  const positionsQuery = useLatestPositions();
  const alertsQuery = useAlerts();

  /**
   * =========================
   * SAFE NORMALIZATION
   * =========================
   */
  const devices = useMemo(
    () => safeArray<any>(devicesQuery?.data),
    [devicesQuery.data]
  );

  const positions = useMemo(
    () => safeArray<any>(positionsQuery?.data),
    [positionsQuery.data]
  );

  const alerts = useMemo(
    () => safeArray<any>(alertsQuery?.data),
    [alertsQuery.data]
  );

  /**
   * =========================
   * STATS (FAST + SAFE)
   * =========================
   */
  const stats = useMemo(() => {
    const latestMap = new Map<string, any>();

    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      if (p?.deviceUid) latestMap.set(p.deviceUid, p);
    }

    let online = 0;

    for (let i = 0; i < devices.length; i++) {
      const d = devices[i];
      const pos = latestMap.get(d.deviceUid);

      if (isOnline(pos?.receivedAt)) {
        online++;
      }
    }

    const total = devices.length;

    return {
      total,
      online,
      offline: Math.max(0, total - online),
      alerts: alerts.length,
      selected: selectedDeviceUid ? 1 : 0,
    };
  }, [devices, positions, alerts, selectedDeviceUid]);

  /**
   * =========================
   * USER DISPLAY
   * =========================
   */
  const userName = useMemo(() => getUserDisplayName(user), [user]);

  return (
    <header className="shrink-0 border-b border-border bg-card/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4">

        {/* LEFT */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h1 className="text-lg font-semibold">Jendie Fleet</h1>
            <p className="text-xs text-muted-foreground">
              Live tracking system
            </p>
          </div>
        </div>

        {/* CENTER STATS */}
        <div className="hidden items-center gap-3 lg:flex text-xs">

          <Stat icon={Truck} label="Vehicles" value={stats.total} />
          <Stat icon={CheckCircle2} label="Online" value={stats.online} />
          <Stat icon={CircleOff} label="Offline" value={stats.offline} />
          <Stat icon={AlertTriangle} label="Alerts" value={stats.alerts} />
          <Stat icon={MapPinned} label="Selected" value={stats.selected} />

        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">

          {/* CONNECTION */}
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
                Reconnecting
              </>
            )}
          </div>

          {/* LAST UPDATE */}
          {lastUpdated && (
            <div className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(lastUpdated), {
                addSuffix: true,
              })}
            </div>
          )}

          {/* USER */}
          {user && (
            <div className="flex items-center gap-2 border-l border-border pl-3">

              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium">{userName}</p>
                <p className="text-[10px] uppercase text-muted-foreground">
                  {user.role}
                </p>
              </div>

              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="rounded-lg p-2 hover:bg-muted"
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

/**
 * =========================
 * STAT BLOCK
 * =========================
 */
function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
    </div>
  );
}