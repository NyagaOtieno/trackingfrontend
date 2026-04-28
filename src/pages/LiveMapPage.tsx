import { TopBar } from "@/components/layout/TopBar";
import { FleetSidebar } from "@/components/layout/FleetSidebar";
import { VehicleDrawer } from "@/components/layout/VehicleDrawer";
import { MapView } from "@/components/map/MapView";
import { useFleetStore } from "@/hooks/useFleetStore";
import { useMergedFleet } from "@/hooks/useMergedFleet";

export default function LiveMapPage() {
  const { selectedDeviceUid, isConnected } = useFleetStore();

  // Just call it — no return value needed, it preloads queries into cache
  useMergedFleet();

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <div className="flex h-full w-full flex-col overflow-hidden">

        {!isConnected && (
          <div className="bg-destructive/90 py-1.5 text-center text-xs font-medium text-white">
            ⚠ Connection lost. Reconnecting…
          </div>
        )}

        <TopBar />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <FleetSidebar />

          <main className="relative flex-1 overflow-hidden">
            <MapView />
          </main>

          {selectedDeviceUid && <VehicleDrawer />}
        </div>
      </div>
    </div>
  );
}