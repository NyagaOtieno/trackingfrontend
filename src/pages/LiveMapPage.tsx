import { TopBar } from "@/components/layout/TopBar";
import { FleetSidebar } from "@/components/layout/FleetSidebar";
import { VehicleDrawer } from "@/components/layout/VehicleDrawer";
import { MapView } from "@/components/map/MapView";
import { useFleetStore } from "@/hooks/useFleetStore";
import { useMergedFleet } from "@/hooks/useMergedFleet";

export default function LiveMapPage() {
  const { selectedDeviceUid, isConnected } = useFleetStore();

  // ✅ SINGLE SOURCE OF TRUTH
  const { data: vehicles = [], isLoading } = useMergedFleet();

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <div className="flex h-full w-full flex-col overflow-hidden">
        {!isConnected && (
          <div className="bg-destructive/90 py-1.5 text-center text-xs font-medium text-destructive-foreground">
            ⚠ Connection lost. Showing last known data. Reconnecting…
          </div>
        )}

        <TopBar />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="relative z-20 h-full shrink-0">
            {/* ✅ PASS VEHICLES */}
            <FleetSidebar vehicles={vehicles} />
          </div>

          <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
            {/* ✅ PASS VEHICLES */}
            <MapView vehicles={vehicles} />
          </main>

          {selectedDeviceUid && (
            <div className="relative z-30 h-full shrink-0">
              <VehicleDrawer />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}