// src/pages/LiveMapPage.tsx
import { useState } from "react";
import { TopBar }        from "@/components/layout/TopBar";
import { FleetSidebar }  from "@/components/layout/FleetSidebar";
import { VehicleDrawer } from "@/components/layout/VehicleDrawer";
import { MapView }       from "@/components/map/MapView";
import { useFleetStore } from "@/hooks/useFleetStore";
import { useMergedFleet } from "@/hooks/useMergedFleet";
import { useLatestPositions } from "@/hooks/useLatestPositions";
import { useAlerts }      from "@/hooks/useAlerts";
import {
  Map,
  List,
  Bell,
  Navigation,
  Settings,
} from "lucide-react";

// ─────────────────────────────────────────────
// MOBILE TAB TYPES
// ─────────────────────────────────────────────
type MobileTab = "map" | "fleet" | "alerts" | "track" | "settings";

export default function LiveMapPage() {
  const { selectedDeviceUid, isConnected } = useFleetStore();
  const [mobileTab, setMobileTab] = useState<MobileTab>("map");

  useMergedFleet();

  const { data: positions = [] } = useLatestPositions();
  const { data: alerts = [] }    = useAlerts();

  const onlineCount = positions.filter((p: any) => {
    if (!p.receivedAt) return false;
    return Date.now() - new Date(p.receivedAt).getTime() < 3 * 60_000;
  }).length;

  const alertCount = Array.isArray(alerts) ? alerts.length : 0;

  return (
    <div className="h-screen w-screen overflow-hidden bg-background flex flex-col">

      {/* ── Connection banner ── */}
      {!isConnected && (
        <div className="shrink-0 bg-destructive/90 py-1.5 text-center text-xs font-medium text-white z-50">
          ⚠ Connection lost. Reconnecting…
        </div>
      )}

      {/* ── TopBar ── */}
      <TopBar />

      {/* ── DESKTOP LAYOUT (lg+) ── */}
      <div className="hidden lg:flex min-h-0 flex-1 overflow-hidden">
        <FleetSidebar />
        <main className="relative flex-1 overflow-hidden">
          <MapView />
        </main>
        {selectedDeviceUid && <VehicleDrawer />}
      </div>

      {/* ── MOBILE LAYOUT (below lg) ── */}
      <div className="flex lg:hidden min-h-0 flex-1 overflow-hidden relative">

        {/* Map — always rendered so Leaflet doesn't remount */}
        <main
          className="absolute inset-0"
          style={{ display: mobileTab === "map" || mobileTab === "track" ? "block" : "none" }}
        >
          <MapView />
        </main>

        {/* Fleet list panel */}
        {mobileTab === "fleet" && (
          <div className="absolute inset-0 overflow-hidden bg-background z-10">
            <FleetSidebar />
          </div>
        )}

        {/* Alerts panel */}
        {mobileTab === "alerts" && (
          <div className="absolute inset-0 overflow-y-auto bg-background z-10 p-4">
            <h2 className="text-sm font-semibold mb-3">Alerts</h2>
            {alertCount === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-12">
                No active alerts
              </p>
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

        {/* Settings panel */}
        {mobileTab === "settings" && (
          <div className="absolute inset-0 overflow-y-auto bg-background z-10 p-4">
            <h2 className="text-sm font-semibold mb-3">Settings</h2>
            <p className="text-xs text-muted-foreground">Coming soon.</p>
          </div>
        )}

        {/* Vehicle drawer — slides up on mobile when vehicle selected */}
        {selectedDeviceUid && mobileTab === "map" && (
          <div className="absolute bottom-16 left-0 right-0 z-20 h-[45vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card shadow-2xl">
            <VehicleDrawer />
          </div>
        )}

        {/* ── BOTTOM NAV BAR ── */}
        <nav className="absolute bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur safe-bottom">
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

// ─────────────────────────────────────────────
// MOBILE NAV BUTTON
// ─────────────────────────────────────────────
function MobileNavBtn({
  icon,
  label,
  active,
  badge,
  badgeDanger = false,
  onClick,
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
        ${active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
        }`}
    >
      {/* Active indicator */}
      {active && (
        <span className="absolute top-1 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary" />
      )}

      <div className="relative">
        {icon}
        {badge && (
          <span
            className={`absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold
              flex items-center justify-center text-white leading-none
              ${badgeDanger ? "bg-destructive" : "bg-primary"}`}
          >
            {Number(badge) > 99 ? "99+" : badge}
          </span>
        )}
      </div>

      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
