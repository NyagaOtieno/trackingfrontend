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

const OFFLINE_MS = 3 * 60_000;
const ALERT_MS   = 5 * 3600_000;

function getStatus(ts?: string | null): "online" | "offline" | "alert" {
  if (!ts) return "alert";
  const age = Date.now() - new Date(ts).getTime();
  if (isNaN(age)) return "alert";
  if (age < OFFLINE_MS) return "online";
  if (age < ALERT_MS)   return "offline";
  return "alert";
}

export function FleetSidebar() {
  const searchQuery       = useFleetStore((s) => s.searchQuery);
  const setSearchQuery    = useFleetStore((s) => s.setSearchQuery);
  const filterStatus      = useFleetStore((s) => s.filterStatus);
  const setSelectedDevice = useFleetStore((s) => s.setSelectedDevice);

  const { data: devices = [], isLoading: devicesLoading, isError } = useFleetDevices();
  const { data: positions = [], isLoading: positionsLoading } = useLatestPositions();
  const { data: alerts = [] } = useAlerts();

  // Build position maps keyed by String(vehicleId) AND plateNumber
  const { posByVehicleId, posByPlate } = useMemo(() => {
    const posByVehicleId = new Map<string, LivePosition>();
    const posByPlate     = new Map<string, LivePosition>();

    for (const p of positions) {
      // Primary key: String(vehicleId) — matches device.deviceUid = String(vehicle.id)
      if (p.vehicleId) posByVehicleId.set(String(p.vehicleId), p);
      // Fallback: plate
      if (p.plateNumber) posByPlate.set(p.plateNumber.toUpperCase(), p);
    }
    return { posByVehicleId, posByPlate };
  }, [positions]);

  // Merge devices + positions — deviceUid is always String(device.id)
  const vehicles: VehicleState[] = useMemo(() => {
    return devices.map((device) => {
      const key   = String(device.id);          // consistent key
      const plate = device.plate_number?.toUpperCase();

      const pos =
        posByVehicleId.get(key) ||
        (plate ? posByPlate.get(plate) : null) ||
        null;

      const ts     = pos?.receivedAt ?? null;
      const status = getStatus(ts);

      return {
        ...device,
        deviceUid:   key,                        // ← always String(id)
        position:    pos,
        isOnline:    status === "online",
        isAlert:     status === "alert",
        isExpiredResolved: false,
        lastSeen:    ts,
        displayName: device.plate_number || device.unit_name || "Unknown",
      } as VehicleState;
    });
  }, [devices, posByVehicleId, posByPlate]);

  // Search
  const searched = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) =>
      [v.plate_number, v.unit_name, v.serial, v.displayName]
        .some((f) => String(f ?? "").toLowerCase().includes(q))
    );
  }, [vehicles, searchQuery]);

  // Status filter
  const filtered = useMemo(() => {
    switch (filterStatus) {
      case "online":  return searched.filter((v) => v.isOnline);
      case "offline": return searched.filter((v) => !v.isOnline && !v.isAlert);
      case "alerts":  return searched.filter((v) => v.isAlert);
      default:        return searched;
    }
  }, [searched, filterStatus]);

  // Counts
  const counts: FilterCountMap = useMemo(() => {
    let online = 0, offline = 0, alertCount = 0;
    for (const v of vehicles) {
      if (v.isOnline)     online++;
      else if (v.isAlert) alertCount++;
      else                offline++;
    }
    return { all: vehicles.length, online, offline, expired: 0, alerts: alertCount };
  }, [vehicles]);

  // Render all matching (no artificial limit when searching)
  const visible = useMemo(() => {
    return searchQuery ? filtered : filtered.slice(0, 3000);
  }, [filtered, searchQuery]);

  const isLoading = devicesLoading || positionsLoading;

  return (
    <aside className="flex h-full w-80 flex-col border-r border-border bg-card">
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

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filterStatus === "alerts" ? (
          <AlertsInbox alerts={alerts} />
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading vehicles...
          </div>
        ) : isError ? (
          <div className="text-xs text-red-500 p-3">Failed to load vehicles</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-10">
            No vehicles found
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((vehicle) => (
              <FleetCard key={vehicle.deviceUid} vehicle={vehicle} />
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