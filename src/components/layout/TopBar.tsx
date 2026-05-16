// src/components/layout/TopBar.tsx
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
  ChevronDown,
} from "lucide-react";

import { useFleetStore }      from "@/hooks/useFleetStore";
import { useAuthStore }       from "@/hooks/useAuthStore";
import { useFleetDevices }    from "@/hooks/useFleetDevices";
import { useLatestPositions } from "@/hooks/useLatestPositions";
import { useAlerts }          from "@/hooks/useAlerts";

function safeArray<T>(input: any): T[] {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.data)) return input.data;
  return [];
}

const ONLINE_THRESHOLD_MS = 15 * 60 * 1_000; // matches FleetSidebar

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

  const devicesQuery   = useFleetDevices();
  const positionsQuery = useLatestPositions();
  const alertsQuery    = useAlerts();

  const devices     = useMemo(() => safeArray<any>(devicesQuery?.data?.devices ?? devicesQuery?.data),   [devicesQuery.data]);
  const serverTotal = (devicesQuery?.data as any)?.serverTotal ?? devices.length;
  const positions = useMemo(() => safeArray<any>(positionsQuery?.data),  [positionsQuery.data]);
  const alerts    = useMemo(() => safeArray<any>(alertsQuery?.data),     [alertsQuery.data]);

  const stats = useMemo(() => {
    const latestByUid = new Map<string, any>();
    const latestByVehicleId = new Map<number, any>();
    for (const p of positions) {
      if (p?.deviceUid) latestByUid.set(p.deviceUid, p);
      if (p?.vehicleId && p.vehicleId !== 0) latestByVehicleId.set(Number(p.vehicleId), p);
    }
    let online = 0;
    for (const d of devices) {
      const pos =
        latestByUid.get(d.deviceUid) ||
        (d.id        ? latestByVehicleId.get(d.id)        : undefined) ||
        (d.vehicleId ? latestByVehicleId.get(d.vehicleId) : undefined);
      if (isOnline(pos?.receivedAt)) online++;
    }
    const total = serverTotal || devices.length;
    return { total, online, offline: Math.max(0, total - online), alerts: alerts.length, selected: selectedDeviceUid ? 1 : 0 };
  }, [devices, positions, alerts, selectedDeviceUid]);

  const userName = useMemo(() => getUserDisplayName(user), [user]);

  return (
    <header className="shrink-0 border-b border-border bg-card/95 backdrop-blur z-40">
      <div className="flex min-h-14 items-center justify-between gap-2 px-3 sm:px-4">

        {/* LEFT: Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-primary/10">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-semibold leading-tight">Jendie Fleet</h1>
            {/* Mobile: compact stats inline under title */}
            <p className="text-[10px] text-muted-foreground sm:hidden">
              {stats.online} online · {stats.total} total · {stats.alerts} alerts
            </p>
            <p className="hidden sm:block text-xs text-muted-foreground">
              Live tracking system
            </p>
          </div>
        </div>

        {/* CENTER: Desktop stats only */}
        <div className="hidden items-center gap-2 xl:flex text-xs">
          <Stat icon={Truck}         label="Vehicles"  value={stats.total}    />
          <Stat icon={CheckCircle2}  label="Online"    value={stats.online}   />
          <Stat icon={CircleOff}     label="Offline"   value={stats.offline}  />
          <Stat icon={AlertTriangle} label="Alerts"    value={stats.alerts}   />
          <Stat icon={MapPinned}     label="Selected"  value={stats.selected} />
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Connection badge */}
          <div
            className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-medium ${
              isConnected
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {isConnected ? (
              <><Wifi className="h-3 w-3 sm:h-3.5 sm:w-3.5" /><span className="hidden sm:inline">Connected</span></>
            ) : (
              <><WifiOff className="h-3 w-3 sm:h-3.5 sm:w-3.5" /><span className="hidden sm:inline">Reconnecting</span></>
            )}
          </div>

          {/* Last update — desktop only */}
          {lastUpdated && (
            <div className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
            </div>
          )}

          {/* User + logout */}
          {user && (
            <div className="flex items-center gap-2 border-l border-border pl-2 sm:pl-3">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium">{userName}</p>
                <p className="text-[10px] uppercase text-muted-foreground">{user.role}</p>
              </div>
              <button
                onClick={() => { logout(); navigate("/login"); }}
                className="rounded-lg p-1.5 sm:p-2 hover:bg-muted"
                title="Log out"
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

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
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
