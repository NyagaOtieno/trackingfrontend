import { useMemo } from "react";
import { Search, Truck, Loader2 } from "lucide-react";
import { useFleetStore }      from "@/hooks/useFleetStore";
import { useFleetDevices }    from "@/hooks/useFleetDevices";
import { useLatestPositions } from "@/hooks/useLatestPositions";
import { useAlerts }          from "@/hooks/useAlerts";
import { FleetCard }          from "@/components/fleet/FleetCard";
import { FleetFilters }       from "@/components/fleet/FleetFilters";
import { AlertsInbox }        from "@/components/fleet/AlertsInbox";
import type { VehicleState, LivePosition, FilterCountMap } from "@/types/fleet";

// ─── Thresholds — must match MapView.tsx and MarkerLayer.tsx ──────────────────
const ONLINE_MS = 15 * 60_000;       // 15 min → online
const ALERT_MS  =  5 * 60 * 60_000;  // 5 h   → alert (no signal)

function getStatus(ts?: string | null): "online" | "offline" | "alert" {
  if (!ts) return "offline";
  const time = new Date(ts).getTime();
  if (!Number.isFinite(time)) return "offline";
  const age = Date.now() - time;
  if (age <= ONLINE_MS) return "online";
  if (age <= ALERT_MS)  return "alert";
  return "offline";
}

export function FleetSidebar() {
  const searchQuery       = useFleetStore((s) => s.searchQuery);
  const setSearchQuery    = useFleetStore((s) => s.setSearchQuery);
  const filterStatus      = useFleetStore((s) => s.filterStatus);
  const setSelectedDevice = useFleetStore((s) => s.setSelectedDevice);

  const { data: devices   = [], isLoading: devicesLoading, isError } = useFleetDevices();
  const { data: positions = [], isLoading: positionsLoading }        = useLatestPositions();
  const { data: alerts    = [] }                                      = useAlerts();

  // ── Build lookup maps from positions ──────────────────────────────────────
  const { posByDeviceUid, posByVehicleId, posByPlate } = useMemo(() => {
    const posByDeviceUid = new Map<string, LivePosition>();
    const posByVehicleId = new Map<number, LivePosition>();
    const posByPlate     = new Map<string, LivePosition>();

    for (const p of positions) {
      // Primary string key — prefer deviceUid (matches GPS device serial)
      const uid = String(p.deviceUid || p.deviceId || p.vehicleId || "").trim();
      if (uid) posByDeviceUid.set(uid, p);

      // Numeric vehicleId key — fallback when device_uid isn't in the vehicles table
      if (p.vehicleId && p.vehicleId !== 0) posByVehicleId.set(p.vehicleId, p);

      // Plate-number key — last-resort fallback
      if (p.plateNumber) posByPlate.set(p.plateNumber.toUpperCase(), p);
    }

    return { posByDeviceUid, posByVehicleId, posByPlate };
  }, [positions]);

  // ── Merge devices with their latest position ───────────────────────────────
  const vehicles: VehicleState[] = useMemo(() => {
    return devices.map((device) => {
      // Resolve a stable string uid that matches what MarkerLayer uses
      const deviceKey = String(
        device.deviceUid ?? device.vehicleId ?? device.id ?? ""
      );
      const plate = device.plate_number?.toUpperCase();

      // Try every possible key in order of reliability
      const pos =
        posByDeviceUid.get(String(device.deviceUid)) ||
        posByDeviceUid.get(String(device.vehicleId)) ||
        posByDeviceUid.get(String(device.id))        ||
        (device.id        ? posByVehicleId.get(device.id)        : undefined) ||
        (device.vehicleId ? posByVehicleId.get(device.vehicleId) : undefined) ||
        (plate            ? posByPlate.get(plate)                : null)      ||
        null;

      // Use receivedAt as the freshness signal (server-side timestamp)
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
          device.plate_number ||
          device.unit_name    ||
          `Vehicle ${device.vehicleId || device.id}`,
      } as VehicleState;
    });
  }, [devices, posByDeviceUid, posByVehicleId, posByPlate]);

  // ── Search ─────────────────────────────────────────────────────────────────
  const searched = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) =>
      [v.plate_number, v.unit_name, v.serial, v.displayName]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q))
    );
  }, [vehicles, searchQuery]);

  // ── Status filter ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    switch (filterStatus) {
      case "online":  return searched.filter((v) => v.isOnline);
      case "offline": return searched.filter((v) => !v.isOnline && !v.isAlert);
      case "alerts":  return searched.filter((v) => v.isAlert);
      default:        return searched;
    }
  }, [searched, filterStatus]);

  // ── Counts ─────────────────────────────────────────────────────────────────
  const counts: FilterCountMap = useMemo(() => {
    let online = 0, offline = 0, alertCount = 0;
    for (const v of vehicles) {
      if (v.isOnline)     online++;
      else if (v.isAlert) alertCount++;
      else                offline++;
    }
    return { all: vehicles.length, online, offline, expired: 0, alerts: alertCount };
  }, [vehicles]);

  const visible = useMemo(
    () => (searchQuery ? filtered : filtered.slice(0, 3000)),
    [filtered, searchQuery]
  );

  const isLoading = devicesLoading || positionsLoading;

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

          {/* Search */}
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
            No vehicles found
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((vehicle) => (
              <FleetCard key={vehicle.deviceUid} vehicle={vehicle} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

export default FleetSidebar;