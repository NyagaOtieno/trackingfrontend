import {
  useMemo,
  useRef,
  useEffect,
  type RefObject,
} from "react";

import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { MarkerLayer } from "./MarkerLayer";
import { FitBounds } from "./FitBounds";
import { AutoFollowVehicle } from "./AutoFollowVehicle";
import { GeofenceLayer } from "./GeofenceLayer";
import { GeofenceMonitor } from "./GeofenceMonitor";

import { useFleetStore } from "@/hooks/useFleetStore";
import { useLatestPositions } from "@/hooks/useLatestPositions";
import { useFleetDevices } from "@/hooks/useFleetDevices";
import { useAuthStore } from "@/hooks/useAuthStore";

const KENYA: [number, number] = [-0.0236, 37.9062];

const PRIVILEGED = [
  "admin",
  "super_admin",
  "staff",
  "office_admin",
  "SUPER_ADMIN",
];

function ResizeMap({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) {
  const map = useMap();

  useEffect(() => {
    const resize = () => requestAnimationFrame(() => map.invalidateSize());

    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(resize);
    observer.observe(el);

    window.addEventListener("resize", resize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [map, containerRef]);

  return null;
}

// 🔥 SAFE ID MATCH (CRITICAL FIX)
const matchId = (p: any, id: string | number | null | undefined) => {
  if (!id) return false;

  return (
    String(p.deviceUid) === String(id) ||
    String(p.vehicleId) === String(id) ||
    String(p.id) === String(id)
  );
};

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { selectedDeviceUid } = useFleetStore();
  const user = useAuthStore((s) => s.user);

  const { data: rawPositions = [] } = useLatestPositions();
  const { data: fleetData } = useFleetDevices();
  const devices = fleetData?.devices ?? [];

  // ───────────────────────────────
  // ROLE FILTER
  // ───────────────────────────────
  const allowedIds = useMemo(() => {
    const role = user?.role ?? "";

    if (PRIVILEGED.includes(role)) return null;

    if (role === "client" && user?.id) {
      return new Set(
        devices
          .filter((d) => d.account_id === user.id)
          .map((d) => d.deviceUid)
      );
    }

    return null;
  }, [user, devices]);

  // ───────────────────────────────
  // FILTER POSITIONS
  // ───────────────────────────────
  const positions = useMemo(() => {
    if (!allowedIds) return rawPositions;

    return rawPositions.filter((p) =>
      allowedIds.has(p.deviceUid)
    );
  }, [rawPositions, allowedIds]);

  // ───────────────────────────────
  // FIND SELECTED VEHICLE
  // ───────────────────────────────
  const selected = useMemo(() => {
    if (!selectedDeviceUid) return null;

    return positions.find((p) =>
      matchId(p, selectedDeviceUid)
    );
  }, [positions, selectedDeviceUid]);

  // ───────────────────────────────
  // FORCE SELECTED VEHICLE INTO MAP
  // ───────────────────────────────
  const safePositions = useMemo(() => {
    if (!selectedDeviceUid) return positions;

    const exists = positions.some((p) =>
      matchId(p, selectedDeviceUid)
    );

    if (exists) return positions;

    return [
      ...positions,
      {
        deviceUid: selectedDeviceUid,
        lat: null,
        lon: null,
        _placeholder: true,
      },
    ];
  }, [positions, selectedDeviceUid]);

  return (
    <div ref={containerRef} className="relative h-[100dvh] w-full">

      <MapContainer
        center={KENYA}
        zoom={6}
        preferCanvas
        className="h-full w-full"
      >
        <ResizeMap containerRef={containerRef} />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 🔥 SAFE MARKERS */}
        <MarkerLayer vehicles={safePositions} />

        <AutoFollowVehicle positions={safePositions as any} />

        <GeofenceLayer />
        <GeofenceMonitor positions={safePositions as any} />

        {/* FIT ONLY WHEN NO SELECTION */}
        {safePositions.length > 0 && !selectedDeviceUid && (
          <FitBounds positions={safePositions} disabled={false} />
        )}
      </MapContainer>
    </div>
  );
}

export default MapView;