import { useMemo } from "react";
import { Search, Truck, Loader2 } from "lucide-react";
import { useFleetStore } from "@/hooks/useFleetStore";
import { useFleetDevices } from "@/hooks/useFleetDevices";
import { useLatestPositions } from "@/hooks/useLatestPositions";
import { useAlerts } from "@/hooks/useAlerts";
import { FleetCard } from "@/components/fleet/FleetCard";
import { FleetFilters } from "@/components/fleet/FleetFilters";
import { AlertsInbox } from "@/components/fleet/AlertsInbox";
import type { VehicleState, LivePosition, FilterCountMap } from "@/types/fleet";

// ─────────────────────────────────────────────
// TIME RULES (server UTC safe handling)
// ─────────────────────────────────────────────
const ONLINE_MS = 5 * 60_000;   // 5 min
const ALERT_MS  = 30 * 60_000;  // 30 min

function getStatus(ts?: string | null): "online" | "offline" | "alert" {
  if (!ts) return "offline";

  const time = Date.parse(ts);
  if (Number.isNaN(time)) return "offline";

  const diff = Date.now() - time;

  if (diff <= ONLINE_MS) return "online";
  if (diff <= ALERT_MS) return "alert";
  return "offline";
}

export function FleetSidebar() {
  const searchQuery = useFleetStore((s) => s.searchQuery);
  const setSearchQuery = useFleetStore((s) => s.setSearchQuery);
  const filterStatus = useFleetStore((s) => s.filterStatus);
  const setSelectedDevice = useFleetStore((s) => s.setSelectedDevice);

  const { data: devices = [], isLoading: devicesLoading, isError } = useFleetDevices();
  const { data: positions = [], isLoading: positionsLoading } = useLatestPositions();
  const { data: alerts = [] } = useAlerts();

  // ─────────────────────────────────────────────
  // POSITION MAP (SAFE + CONSISTENT KEYS)
  // ─────────────────────────────────────────────
  const posMap = useMemo(() => {
    const map = new Map<string, LivePosition>();

    for (const p of positions) {
      if (p.deviceUid) map.set(String(p.deviceUid), p);
      if (p.deviceId) map.set(String(p.deviceId), p);
      if (p.vehicleId) map.set(String(p.vehicleId), p);
    }

    return map;
  }, [positions]);

  // ─────────────────────────────────────────────
  // MERGE DEVICES + POSITIONS
  // ─────────────────────────────────────────────
  const vehicles: VehicleState[] = useMemo(() => {
    return devices.map((device) => {
      const key =
        String(device.deviceUid ?? device.vehicleId ?? device.id);

      const pos =
        posMap.get(String(device.deviceUid)) ||
        posMap.get(String(device.vehicleId)) ||
        posMap.get(String(device.id)) ||
        null;

      const ts = pos?.receivedAt || pos?.deviceTime || null;
      const status = getStatus(ts);

      return {
        ...device,
        deviceUid: String(device.deviceUid),
        position: pos,
        isOnline: status === "online",
        isAlert: status === "alert",
        lastSeen: ts,
        displayName:
          device.plate_number || device.unit_name || "Unknown Vehicle",
      } as VehicleState;
    });
  }, [devices, posMap]);

  // ─────────────────────────────────────────────
  // SEARCH FILTER
  // ─────────────────────────────────────────────
  const searched = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return vehicles;

    return vehicles.filter((v) =>
      [
        v.plate_number,
        v.unit_name,
        v.serial,
        v.displayName,
      ].some((f) => String(f ?? "").toLowerCase().includes(q))
    );
  }, [vehicles, searchQuery]);

  // ─────────────────────────────────────────────
  // STATUS FILTER
  // ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    switch (filterStatus) {
      case "online":
        return searched.filter((v) => v.isOnline);

      case "offline":
        return searched.filter((v) => !v.isOnline && !v.isAlert);

      case "alerts":
        return searched.filter((v) => v.isAlert);

      default:
        return searched;
    }
  }, [searched, filterStatus]);

  // ─────────────────────────────────────────────
  // COUNTS
  // ─────────────────────────────────────────────
  const counts: FilterCountMap = useMemo(() => {
    let online = 0;
    let offline = 0;
    let alertsCount = 0;

    for (const v of vehicles) {
      if (v.isOnline) online++;
      else if (v.isAlert) alertsCount++;
      else offline++;
    }

    return {
      all: vehicles.length,
      online,
      offline,
      expired: 0,
      alerts: alertsCount,
    };
  }, [vehicles]);

  const visible = useMemo(() => {
    return searchQuery ? filtered : filtered.slice(0, 3000);
  }, [filtered, searchQuery]);

  const isLoading = devicesLoading || positionsLoading;

  // ─────────────────────────────────────────────
  // DEBUG (TEMP - REMOVE IN PROD)
  // ─────────────────────────────────────────────
  console.log("FLEET SAMPLE:", vehicles[0]);

  return (
    <aside className="flex h-full w-80 flex-col border-r border-border bg-card">
      {/* HEADER */}
      <div className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="px-3 pt-4 pb-3 space-y-3">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <div>
                <h2 className="text-sm font-semibold">Fleet</h2>
                <p className="text-[11px] text-muted-foreground">
                  {counts.online} online · {counts.all} total
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedDevice(null)}
              className="rounded-lg bg-muted px-2 py-1 text-[10px] hover:bg-secondary"
            >
              Show All
            </button>
          </div>

          {/* SEARCH */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plate / unit / serial"
              className="w-full rounded-lg border bg-background py-2 pl-7 text-xs"
            />
          </div>

          <FleetFilters counts={counts} />
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filterStatus === "alerts" ? (
          <AlertsInbox alerts={alerts} />
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading vehicles...
          </div>
        ) : isError ? (
          <div className="text-xs text-red-500 p-3">
            Failed to load vehicles
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-10">
            No vehicles found
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((vehicle) => (
              <FleetCard
                key={vehicle.deviceUid}
                vehicle={vehicle}
              />
            ))}

            {!searchQuery && filtered.length > 3000 && (
              <p className="py-2 text-center text-[11px] text-muted-foreground">
                Search to see all {filtered.length} vehicles
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

export default FleetSidebar;