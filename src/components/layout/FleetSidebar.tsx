import { useMemo, useState, useEffect } from "react";
import { Search, Truck, Loader2 } from "lucide-react";
import { useFleetStore }        from "@/hooks/useFleetStore";
import { useFleetDevices, useFleetServerTotal } from "@/hooks/useFleetDevices";
import { useLatestPositions }   from "@/hooks/useLatestPositions";
import { useAlerts }            from "@/hooks/useAlerts";
import { FleetCard }            from "@/components/fleet/FleetCard";
import { FleetFilters }         from "@/components/fleet/FleetFilters";
import { AlertsInbox }          from "@/components/fleet/AlertsInbox";
import type { VehicleState, LivePosition, FilterCountMap } from "@/types/fleet";

const ONLINE_MS = 15 * 60_000;
const ALERT_MS  =  5 * 60 * 60_000;

function getStatus(ts?: string | null): "online" | "offline" | "alert" {
  if (!ts) return "offline";
  const age = Date.now() - new Date(ts).getTime();
  if (!Number.isFinite(age)) return "offline";
  if (age <= ONLINE_MS) return "online";
  if (age <= ALERT_MS)  return "alert";
  return "offline";
}

export function FleetSidebar() {
  const searchQuery       = useFleetStore((s) => s.searchQuery);
  const setSearchQuery    = useFleetStore((s) => s.setSearchQuery);
  const filterStatus      = useFleetStore((s) => s.filterStatus);
  const setSelectedDevice = useFleetStore((s) => s.setSelectedDevice);

  // ── Debounce: don't hit the server on every keystroke ────────────────────
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Devices: 100 per page, search is server-side ──────────────────────────
  // data is still Device[] — no other callers break
  const {
    data: devices = [],
    isLoading: devicesLoading,
    isFetching,
    isError,
  } = useFleetDevices({ search: debouncedSearch, limit: 100 });

  // ── True DB total — shares same cache, zero extra requests ────────────────
  // Used only for the bracket count; fetched once alongside devices.
  const { data: serverTotal = 0 } = useFleetServerTotal({ limit: 100 });

  const { data: positions = [], isLoading: positionsLoading } = useLatestPositions();
  const { data: alerts    = [] }                               = useAlerts();

  // ── Position lookup maps ─────────────────────────────────────────────────
  const { posByDeviceUid, posByVehicleId, posByPlate } = useMemo(() => {
    const posByDeviceUid = new Map<string, LivePosition>();
    const posByVehicleId = new Map<number, LivePosition>();
    const posByPlate     = new Map<string, LivePosition>();
    for (const p of positions) {
      const uid = String(p.deviceUid || p.deviceId || p.vehicleId || "").trim();
      if (uid) posByDeviceUid.set(uid, p);
      if (p.vehicleId && p.vehicleId !== 0) posByVehicleId.set(p.vehicleId, p);
      if (p.plateNumber) posByPlate.set(p.plateNumber.toUpperCase(), p);
    }
    return { posByDeviceUid, posByVehicleId, posByPlate };
  }, [positions]);

  // ── Merge devices with positions ─────────────────────────────────────────
  const vehicles: VehicleState[] = useMemo(() => {
    return devices.map((device) => {
      const deviceKey = String(device.deviceUid ?? device.vehicleId ?? device.id ?? "");
      const plate     = device.plate_number?.toUpperCase();
      const pos =
        posByDeviceUid.get(String(device.deviceUid)) ||
        posByDeviceUid.get(String(device.vehicleId)) ||
        posByDeviceUid.get(String(device.id))        ||
        (device.id        ? posByVehicleId.get(device.id)        : undefined) ||
        (device.vehicleId ? posByVehicleId.get(device.vehicleId) : undefined) ||
        (plate            ? posByPlate.get(plate)                : null)      ||
        null;
      const ts     = pos?.receivedAt || pos?.deviceTime || null;
      const status = getStatus(ts);
      return {
        ...device,
        deviceUid:   deviceKey,
        position:    pos,
        isOnline:    status === "online",
        isAlert:     status === "alert",
        lastSeen:    ts,
        displayName:
          device.plate_number || device.unit_name ||
          `Vehicle ${device.vehicleId || device.id}`,
      } as VehicleState;
    });
  }, [devices, posByDeviceUid, posByVehicleId, posByPlate]);

  // ── Status filter (on the loaded 100) ───────────────────────────────────
  const filtered = useMemo(() => {
    switch (filterStatus) {
      case "online":  return vehicles.filter((v) => v.isOnline);
      case "offline": return vehicles.filter((v) => !v.isOnline && !v.isAlert);
      case "alerts":  return vehicles.filter((v) => v.isAlert);
      default:        return vehicles;
    }
  }, [vehicles, filterStatus]);

  // ── Counts ───────────────────────────────────────────────────────────────
  // online/alert derived from ALL positions (up to 1000 latest pings)
  // so the badge is accurate across the whole fleet, not just the 100 loaded
  const counts: FilterCountMap = useMemo(() => {
    let online = 0, alertCount = 0;
    for (const p of positions) {
      const s = getStatus(p.receivedAt);
      if (s === "online")     online++;
      else if (s === "alert") alertCount++;
    }
    return {
      all:     serverTotal,                                       // real DB count
      online,
      offline: Math.max(0, serverTotal - online - alertCount),
      expired: 0,
      alerts:  alertCount,
    };
  }, [positions, serverTotal]);

  const isLoading    = devicesLoading || positionsLoading;
  const isSearching  = isFetching && !!debouncedSearch;

  return (
    <aside className="flex h-full w-full lg:w-80 flex-col border-r border-border bg-card">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="px-3 pt-4 pb-3 space-y-3">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <div>
                <h2 className="text-sm font-semibold">Fleet</h2>
                <p className="text-[11px] text-muted-foreground">
                  {counts.online} online · {serverTotal} total
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

          {/* Search — server-side, searches ALL vehicles in DB */}
          <div className="relative">
            {isSearching
              ? <Loader2 className="absolute left-2 top-2.5 h-3 w-3 animate-spin text-muted-foreground" />
              : <Search  className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
            }
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

      {/* ── Body ── */}
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
            {debouncedSearch
              ? `No vehicles match "${debouncedSearch}"`
              : "No vehicles found"}
          </div>
        ) : (
          <div className="space-y-2">
            {debouncedSearch && (
              <p className="px-1 text-[10px] text-muted-foreground">
                Showing {filtered.length} of {serverTotal} vehicles
              </p>
            )}
            {filtered.map((vehicle) => (
              <FleetCard key={vehicle.deviceUid} vehicle={vehicle} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

export default FleetSidebar;
