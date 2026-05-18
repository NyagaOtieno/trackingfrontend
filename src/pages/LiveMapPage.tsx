import { useState, useEffect, useRef } from "react";
import { TopBar }             from "@/components/layout/TopBar";
import { FleetSidebar }       from "@/components/layout/FleetSidebar";
import { VehicleDrawer }      from "@/components/layout/VehicleDrawer";
import { MapView }            from "@/components/map/MapView";
import { useFleetStore }      from "@/hooks/useFleetStore";
import { useMergedFleet }     from "@/hooks/useMergedFleet";
import { useLatestPositions } from "@/hooks/useLatestPositions";
import { useAlerts }          from "@/hooks/useAlerts";
import { Map, List, Bell, Navigation, Settings } from "lucide-react";

const ONLINE_MS = 15 * 60_000;
type MobileTab  = "map" | "fleet" | "alerts" | "track" | "settings";

export default function LiveMapPage() {
  const { selectedDeviceUid, isConnected } = useFleetStore();
  const [mobileTab, setMobileTab] = useState<MobileTab>("map");
  const prevSelectedRef = useRef<string | null>(null);

  useMergedFleet();

  const { data: positions = [] } = useLatestPositions();
  const { data: alerts    = [] } = useAlerts();

  const onlineCount = positions.filter((p: any) => {
    if (!p.receivedAt) return false;
    return Date.now() - new Date(p.receivedAt).getTime() < ONLINE_MS;
  }).length;
  const alertCount = Array.isArray(alerts) ? alerts.length : 0;

  // ── Auto-switch to map when vehicle is selected ────────────────────────────
  // The map must already be mounted (visibility:hidden) so Leaflet has real
  // dimensions and AutoFollowVehicle can call flyTo immediately.
  useEffect(() => {
    if (selectedDeviceUid && selectedDeviceUid !== prevSelectedRef.current) {
      setMobileTab("map");
      prevSelectedRef.current = selectedDeviceUid;
    }
    if (!selectedDeviceUid) prevSelectedRef.current = null;
  }, [selectedDeviceUid]);

  const NAV_H   = "4rem";
  const mapShow = mobileTab === "map" || mobileTab === "track";

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-background flex flex-col">

      {!isConnected && (
        <div className="shrink-0 bg-destructive/90 py-1.5 text-center text-xs font-medium text-white z-50">
          ⚠ Connection lost. Reconnecting…
        </div>
      )}

      <TopBar />

      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex min-h-0 flex-1 overflow-hidden">
        <FleetSidebar />
        <main className="relative flex-1 overflow-hidden">
          <MapView />
        </main>
        {selectedDeviceUid && <VehicleDrawer />}
      </div>

      {/* ── MOBILE ── */}
      <div
        className="flex lg:hidden min-h-0 flex-1 overflow-hidden relative"
        style={{ paddingBottom: NAV_H }}
      >

        {/* ── MAP ────────────────────────────────────────────────────────────
            ALWAYS mounted. Uses visibility instead of display:none so Leaflet
            always knows its container dimensions → flyTo works the instant the
            tab switches, with no invalidateSize race condition.              */}
        <main
          className="absolute inset-0"
          style={{
            bottom:        NAV_H,
            visibility:    mapShow ? "visible"  : "hidden",
            pointerEvents: mapShow ? "auto"     : "none",
            zIndex:        mapShow ? 1           : 0,
          }}
        >
          <MapView />
        </main>

        {/* ── FLEET LIST ─────────────────────────────────────────────────── */}
        {mobileTab === "fleet" && (
          <div className="absolute inset-0 overflow-hidden bg-background z-10">
            <FleetSidebar />
          </div>
        )}

        {/* ── ALERTS ────────────────────────────────────────────────────── */}
        {mobileTab === "alerts" && (
          <div className="absolute inset-0 overflow-y-auto bg-background z-10 p-4">
            <h2 className="text-sm font-semibold mb-3">Alerts</h2>
            {alertCount === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-12">No active alerts</p>
            ) : (
              <div className="space-y-2">
                {(Array.isArray(alerts) ? alerts : []).map((a: any, i: number) => (
                  <div key={i} className="rounded-xl border border-border bg-card px-3 py-2 text-xs">
                    {JSON.stringify(a)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS ──────────────────────────────────────────────────── */}
        {mobileTab === "settings" && (
          <div className="absolute inset-0 overflow-y-auto bg-background z-10 p-4">
            <h2 className="text-sm font-semibold mb-3">Settings</h2>
            <p className="text-xs text-muted-foreground">Coming soon.</p>
          </div>
        )}

        {/* ── VEHICLE DRAWER ─────────────────────────────────────────────
            Slides up from above the nav bar when a vehicle is selected.
            Only on map tab — elsewhere the FleetSidebar shows info.      */}
        {selectedDeviceUid && mapShow && (
          <div
            className="absolute left-0 right-0 z-20 overflow-y-auto rounded-t-2xl
                       border-t border-border bg-card shadow-2xl"
            style={{ bottom: NAV_H, height: "45vh" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between
                            border-b border-border bg-card/95 px-4 py-2 backdrop-blur">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Vehicle detail
              </span>
              <button
                onClick={() => setMobileTab("fleet")}
                className="rounded-lg bg-muted px-3 py-1 text-[10px] font-medium hover:bg-secondary"
              >
                ← Fleet list
              </button>
            </div>
            <VehicleDrawer />
          </div>
        )}

        {/* ── BOTTOM NAV — fixed to viewport, never disappears ─────────── */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-border
                     bg-card/95 backdrop-blur lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="grid grid-cols-5 h-16">
            <MobileNavBtn
              icon={<Map className="h-5 w-5" />}
              label="Map"
              active={mobileTab === "map"}
              onClick={() => setMobileTab("map")}
            />
            <MobileNavBtn
              icon={<List className="h-5 w-5" />}
              label="Fleet"
              active={mobileTab === "fleet"}
              badge={onlineCount > 0 ? String(onlineCount) : undefined}
              onClick={() => setMobileTab("fleet")}
            />
            <MobileNavBtn
              icon={<Bell className="h-5 w-5" />}
              label="Alerts"
              active={mobileTab === "alerts"}
              badge={alertCount > 0 ? String(alertCount) : undefined}
              badgeDanger
              onClick={() => setMobileTab("alerts")}
            />
            <MobileNavBtn
              icon={<Navigation className="h-5 w-5" />}
              label="Track"
              active={mobileTab === "track"}
              onClick={() => setMobileTab("track")}
            />
            <MobileNavBtn
              icon={<Settings className="h-5 w-5" />}
              label="Settings"
              active={mobileTab === "settings"}
              onClick={() => setMobileTab("settings")}
            />
          </div>
        </nav>

      </div>
    </div>
  );
}

// ─── Bottom nav button ────────────────────────────────────────────────────────
function MobileNavBtn({
  icon, label, active, badge, badgeDanger = false, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: string;
  badgeDanger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors
        ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
    >
      {active && (
        <span className="absolute top-1 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary" />
      )}
      <div className="relative">
        {icon}
        {badge && (
          <span className={`absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 rounded-full
            text-[9px] font-bold flex items-center justify-center text-white leading-none
            ${badgeDanger ? "bg-destructive" : "bg-primary"}`}>
            {Number(badge) > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
