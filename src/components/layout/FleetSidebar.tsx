// src/components/fleet/FleetSidebar.tsx
import { useMemo } from "react";
import { Search, Truck, Loader2 } from "lucide-react";
import { useFleetStore } from "@/hooks/useFleetStore";
import { useFleetDevices } from "@/hooks/useFleetDevices";
import { useLatestPositions } from "@/hooks/useLatestPositions";
import { useAlerts } from "@/hooks/useAlerts";
import { FleetCard } from "@/components/fleet/FleetCard";
import { FleetFilters } from "@/components/fleet/FleetFilters";
import { AlertsInbox } from "@/components/fleet/AlertsInbox";
import type { VehicleState } from "@/types/fleet";

const ONLINE_THRESHOLD_MS = 10 * 60 * 1000;

function isVehicleExpired(vehicle: { isExpired?: boolean; expiresAt?: string | null }) {
  if (vehicle.isExpired) return true;
  if (!vehicle.expiresAt) return false;
  return new Date(vehicle.expiresAt).getTime() < Date.now();
}

export function FleetSidebar() {
  const searchQuery = useFleetStore((state) => state.searchQuery);
  const setSearchQuery = useFleetStore((state) => state.setSearchQuery);
  const filterStatus = useFleetStore((state) => state.filterStatus);
  const setSelectedDevice = useFleetStore((state) => state.setSelectedDevice);

  const { data: devices = [], isLoading: devicesLoading, isError: devicesError } = useFleetDevices();
  const { data: positions = [], isLoading: positionsLoading } = useLatestPositions();
  const { data: alerts = [] } = useAlerts();

  // Map positions by deviceUid
  const vehicles: VehicleState[] = useMemo(() => {
    const posMap = new Map(
      positions.map((p) => [String(p.deviceUid ?? p.device_id), p])
    );

    return devices.map((device) => {
      const deviceKey = String(device.deviceUid ?? device.id);
      const position = posMap.get(deviceKey);

      return {
        ...device,
        position,
        isOnline: position
          ? Date.now() - new Date(position.receivedAt ?? position.signal_time).getTime() < ONLINE_THRESHOLD_MS
          : false,
        isExpiredResolved: isVehicleExpired(device),
        lastSeen: position?.receivedAt ?? position?.signal_time ?? null,
        displayName: device.label || device.vehicleReg || "Unknown Vehicle",
      };
    });
  }, [devices, positions]);

  // Search filter
  const searchedVehicles = useMemo(() => {
    if (!searchQuery) return vehicles;
    const q = searchQuery.toLowerCase().trim();
    return vehicles.filter((v) =>
      [v.vehicleReg, v.label, v.deviceUid, v.displayName].some((field) =>
        String(field ?? "").toLowerCase().includes(q)
      )
    );
  }, [vehicles, searchQuery]);

  // Status filter
  const filteredVehicles = useMemo(() => {
    switch (filterStatus) {
      case "online": return searchedVehicles.filter((v) => v.isOnline);
      case "offline": return searchedVehicles.filter((v) => !v.isOnline);
      case "expired": return searchedVehicles.filter((v) => v.isExpiredResolved);
      case "alerts": return searchedVehicles; // alerts handled separately
      case "all":
      default: return searchedVehicles;
    }
  }, [searchedVehicles, filterStatus]);

  // Counts for filters and header
  const counts = useMemo(() => {
    const online = vehicles.filter((v) => v.isOnline).length;
    const offline = vehicles.filter((v) => !v.isOnline).length;
    const expired = vehicles.filter((v) => v.isExpiredResolved).length;
    return { all: vehicles.length, online, offline, expired, alerts: alerts.length };
  }, [vehicles, alerts]);

  const listTitle = useMemo(() => {
    switch (filterStatus) {
      case "online": return `Online (${counts.online})`;
      case "offline": return `Offline (${counts.offline})`;
      case "expired": return `Expired (${counts.expired})`;
      case "alerts": return `Alerts (${counts.alerts})`;
      default: return `All Vehicles (${counts.all})`;
    }
  }, [filterStatus, counts]);

  const isLoading = devicesLoading || positionsLoading;

  return (
    <aside className="flex h-full w-80 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="px-3 pt-4 pb-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Truck className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Fleet</h2>
                <p className="text-[11px] text-muted-foreground">{counts.all} vehicles loaded</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDevice(null)}
              className="rounded-lg bg-muted px-2.5 py-1 text-[10px] font-medium hover:bg-secondary transition-colors"
            >
              Show All
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search plate, label, device UID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Filter Tabs */}
          <FleetFilters counts={counts} />

          {/* List summary */}
          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] font-medium text-muted-foreground">
            <span>{listTitle}</span>
            <span>Showing {filteredVehicles.length} of {searchedVehicles.length}</span>
          </div>
        </div>
      </div>

      {/* Vehicle List */}
      <div className="flex-1 overflow-y-auto px-2 pt-2 pb-3">
        {filterStatus === "alerts" ? (
          <AlertsInbox alerts={alerts} />
        ) : isLoading ? (
          <div className="flex h-40 items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading vehicles…
          </div>
        ) : devicesError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive text-center">
            Failed to load vehicles from <span className="font-mono">100.50.173.65:4000/api/telemetry/latest</span>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm font-medium text-foreground">No vehicles found</p>
            <p className="mt-1 text-xs text-muted-foreground">Try another search term or switch filter.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredVehicles.map((vehicle) => (
              <FleetCard key={vehicle.deviceUid} vehicle={vehicle} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

export default FleetSidebar;