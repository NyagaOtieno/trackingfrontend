import { MapContainer, TileLayer } from "react-leaflet";
import MarkerClusterLayer from "./MarkerClusterLayer";
import { useFleetDevices } from "@/hooks/useFleetDevices";
import { useLatestPositions } from "@/hooks/useLatestPositions";

export default function FleetMap() {
  const { data: devices = [] } = useFleetDevices();
  const { data: positions = [] } = useLatestPositions();

  // 🔥 JOIN telemetry + vehicles
  const deviceMap = new Map(devices.map((d) => [d.deviceUid, d]));

  const mergedPositions = positions.map((p: any) => {
    const device = deviceMap.get(p.deviceUid);

    return {
      ...p,
      vehicleReg: device?.vehicleReg ?? "Unknown",
    };
  });

  return (
    <MapContainer
      center={[-1.286389, 36.817223]}
      zoom={6}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MarkerClusterLayer positions={mergedPositions} />
    </MapContainer>
  );
}