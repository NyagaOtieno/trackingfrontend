import { useEffect } from "react";
import { useMap } from "react-leaflet";

type PositionLike = {
  id?: string | number;
  deviceUid?: string;
  imei?: string;
  vehicleId?: string | number;
  regNo?: string;
  registrationNo?: string;
  plateNumber?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
};

interface CenterOnVehicleProps {
  positions?: PositionLike[];
  selectedDeviceUid?: string | number | null;
  zoom?: number;
}

export function CenterOnVehicle({
  positions = [],
  selectedDeviceUid,
  zoom = 18,
}: CenterOnVehicleProps) {
  const map = useMap();

  useEffect(() => {
    if (!selectedDeviceUid) return;
    if (!positions.length) return;

    const selectedKey = String(selectedDeviceUid).trim();

    const vehicle = positions.find((p) => {
      const keys = [
        p.deviceUid,
        p.imei,
        p.id,
        p.vehicleId,
        p.regNo,
        p.registrationNo,
        p.plateNumber,
      ]
        .filter((v) => v !== undefined && v !== null)
        .map((v) => String(v).trim());

      return keys.includes(selectedKey);
    });

    if (!vehicle) return;

    const lat =
      typeof vehicle.lat === "number" ? vehicle.lat : vehicle.latitude;
    const lng =
      typeof vehicle.lng === "number" ? vehicle.lng : vehicle.longitude;

    if (typeof lat !== "number" || typeof lng !== "number") return;

    map.setView([lat, lng], zoom, { animate: true });
  }, [map, positions, selectedDeviceUid, zoom]);

  return null;
}

export default CenterOnVehicle;